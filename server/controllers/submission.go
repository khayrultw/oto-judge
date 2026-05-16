package controllers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/khayrultw/go-judge/database"
	"github.com/khayrultw/go-judge/judge"
	"github.com/khayrultw/go-judge/models"
	"github.com/khayrultw/go-judge/utils"
	"gorm.io/gorm"
)

type SubmissionController struct {
	Db *gorm.DB
}

func NewSubmissionController() *SubmissionController {
	db := database.Db
	return &SubmissionController{Db: db}
}

func (sc *SubmissionController) SSEMySubmissions(c *gin.Context) {
	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		http.Error(c.Writer, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	c.Writer.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
	c.Writer.Header().Set("Cache-Control", "no-cache, no-transform")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("X-Accel-Buffering", "no")

	client := utils.GetBroadcaster().Subscribe("mysubmissions")
	defer utils.GetBroadcaster().Unsubscribe("mysubmissions", client)

	initialSubmissions, err := sc.GetSubsByUser(c.GetUint("userId"))
	if err == nil {
		if jsonBytes, marshalErr := json.Marshal(initialSubmissions); marshalErr == nil {
			fmt.Fprintf(c.Writer, "data: %s\n\n", jsonBytes)
			flusher.Flush()
		}
	}

	heartbeatTicker := time.NewTicker(25 * time.Second)
	defer heartbeatTicker.Stop()

	for {
		select {
		case <-client:
			sumissions, err := sc.GetSubsByUser(c.GetUint("userId"))
			if err != nil {
				continue
			}
			jsonBytes, err := json.Marshal(sumissions)
			if err != nil {
				continue
			}

			fmt.Fprintf(c.Writer, "data: %s\n\n", jsonBytes)
			flusher.Flush()

		case <-heartbeatTicker.C:
			fmt.Fprint(c.Writer, ": ping\n\n")
			flusher.Flush()

		case <-c.Done():
			return
		}
	}
}

func (sc *SubmissionController) SubmitCode(c *gin.Context) {
	problemIdStr := c.Param("problemId")
	problemId, err := strconv.ParseUint(problemIdStr, 10, 64)

	if err != nil || problemId == 0 {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Missing or invalid problem_id"})
		return
	}

	var req models.SubmitCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "validation_failed",
			Fields: map[string]string{
				"details": err.Error(),
			},
		})
		return
	}

	userId := c.GetUint("userId")

	var problem models.Problem
	if err := sc.Db.First(&problem, problemId).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Problem not found"})
		return
	}

	submission := models.Submission{
		UserId:     userId,
		ProblemId:  uint(problemId),
		ContestId:  problem.ContestId, // populate contest id from problem for standings and contest-scoped queries
		SourceCode: req.SourceCode,
		Language:   req.Language,
		Status:     "pending",
	}

	if err := sc.Db.Create(&submission).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err})
		return
	}

	go func() {
		judge.RunTest(database.Db, submission, problem)
	}()

	c.JSON(http.StatusOK, submission)
}

// TestRun runs the code against a custom test case without saving the submission
func (sc *SubmissionController) TestRun(c *gin.Context) {
	var req models.TestRunRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "validation_failed",
			Fields: map[string]string{
				"details": err.Error(),
			},
		})
		return
	}

	// Run the code against the custom test case
	result := judge.RunCustomTest(req.SourceCode, req.Language, req.Input, req.ExpectedOutput)

	c.JSON(http.StatusOK, result)
}

func (sc *SubmissionController) GetSubmission(c *gin.Context) {
	var submission models.Submission
	id, _ := strconv.Atoi(c.Param("submissionId"))
	err := sc.Db.Where("id = ?", id).First(&submission).Error
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err})
		return
	}
	// allow only owner or admin
	requesterId := c.GetUint("userId")
	if requesterId != submission.UserId {
		// check admin via DB-backed middleware flag: use role from context but trust RequireAdmin on admin routes
		// For safety, fetch user and verify IsAdmin when not owner
		var user models.User
		if err := sc.Db.First(&user, requesterId).Error; err != nil || !user.IsAdmin {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
			return
		}
	}

	c.JSON(http.StatusOK, submission)
}

func (sc *SubmissionController) GetMySubmissions(c *gin.Context) {
	userId := c.GetUint("userId")

	var req models.PaginationRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid query parameters"})
		return
	}

	result, err := sc.GetSubsByUserPaginated(userId, &req)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (sc *SubmissionController) GetSubsByUser(userId uint) ([]models.SubmissionWithProblem, error) {
	type Result struct {
		models.Submission
		ProblemTitle string
	}

	query := sc.Db.Table("submissions").
		Select("submissions.id, submissions.user_id, submissions.problem_id, submissions.contest_id, submissions.source_code, submissions.language, submissions.status, submissions.message, submissions.created_at, problems.title as problem_title").
		Joins("LEFT JOIN problems ON problems.id = submissions.problem_id").
		Where("submissions.user_id = ?", userId).
		Where("submissions.deleted_at IS NULL")

	var results []Result
	err := query.Order("submissions.id desc").Scan(&results).Error
	if err != nil {
		return nil, err
	}

	var response []models.SubmissionWithProblem
	for _, r := range results {
		response = append(response, models.SubmissionWithProblem{
			ID:           r.Id,
			UserId:       r.UserId,
			UserName:     "",
			ProblemId:    r.ProblemId,
			ProblemTitle: r.ProblemTitle,
			Language:     r.Language,
			SourceCode:   r.SourceCode,
			Status:       r.Status,
			Message:      r.Message,
			CreatedAt:    r.CreatedAt,
		})
	}

	return response, nil
}

func (sc *SubmissionController) GetSubsByUserPaginated(userId uint, req *models.PaginationRequest) (models.PaginatedResponse, error) {
	type Result struct {
		models.Submission
		ProblemTitle string
	}

	query := sc.Db.Table("submissions").
		Select("submissions.id, submissions.user_id, submissions.problem_id, submissions.contest_id, submissions.source_code, submissions.language, submissions.status, submissions.message, submissions.created_at, problems.title as problem_title").
		Joins("LEFT JOIN problems ON problems.id = submissions.problem_id").
		Where("submissions.user_id = ?", userId).
		Where("submissions.deleted_at IS NULL")

	// Count total
	var total int64
	query.Count(&total)

	// Apply pagination
	offset := req.GetOffset()
	limit := req.GetLimit()

	var results []Result
	err := query.Order("submissions.id desc").Offset(offset).Limit(limit).Scan(&results).Error
	if err != nil {
		return models.PaginatedResponse{}, err
	}

	var response []models.SubmissionWithProblem
	for _, r := range results {
		response = append(response, models.SubmissionWithProblem{
			ID:           r.Id,
			UserId:       r.UserId,
			UserName:     "",
			ProblemId:    r.ProblemId,
			ProblemTitle: r.ProblemTitle,
			Language:     r.Language,
			SourceCode:   r.SourceCode,
			Status:       r.Status,
			Message:      r.Message,
			CreatedAt:    r.CreatedAt,
		})
	}

	return models.NewPaginatedResponse(response, total, req.Page, limit), nil
}

// ListAllSubmissions retrieves all submissions with optional filters (admin only)
func (sc *SubmissionController) ListAllSubmissions(c *gin.Context) {
	var req models.SubmissionListRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "validation_failed",
			Fields: map[string]string{
				"details": err.Error(),
			},
		})
		return
	}

	// Set defaults
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 50
	}
	if req.PageSize > 200 {
		req.PageSize = 200
	}

	query := sc.Db.Table("submissions").
		Select("submissions.*, users.name as user_name, problems.title as problem_title").
		Joins("LEFT JOIN users ON users.id = submissions.user_id").
		Joins("LEFT JOIN problems ON problems.id = submissions.problem_id")

	// Apply filters
	if req.ContestID > 0 {
		query = query.Where("submissions.contest_id = ?", req.ContestID)
	}
	if req.UserID > 0 {
		query = query.Where("submissions.user_id = ?", req.UserID)
	}
	if req.Status != "" {
		query = query.Where("submissions.status = ?", req.Status)
	}
	if req.Language != "" {
		query = query.Where("submissions.language = ?", req.Language)
	}
	if req.StartDate != "" {
		if startTime, err := time.Parse(time.RFC3339, req.StartDate); err == nil {
			query = query.Where("submissions.created_at >= ?", startTime)
		}
	}
	if req.EndDate != "" {
		if endTime, err := time.Parse(time.RFC3339, req.EndDate); err == nil {
			query = query.Where("submissions.created_at <= ?", endTime)
		}
	}

	// Count total
	var total int64
	query.Count(&total)

	// Pagination
	offset := (req.Page - 1) * req.PageSize
	query = query.Offset(offset).Limit(req.PageSize)

	type Result struct {
		models.Submission
		UserName     string
		ProblemTitle string
	}

	var results []Result
	if err := query.Order("submissions.id desc").Scan(&results).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "failed_to_retrieve_submissions",
		})
		return
	}

	response := make([]models.SubmissionWithProblem, len(results))
	for i, r := range results {
		response[i] = models.SubmissionWithProblem{
			ID:           r.Id,
			UserId:       r.UserId,
			UserName:     r.UserName,
			ProblemId:    r.ProblemId,
			ProblemTitle: r.ProblemTitle,
			Language:     r.Language,
			SourceCode:   r.SourceCode, // Include source code for admin
			Status:       r.Status,
			Message:      r.Message,
			CreatedAt:    r.CreatedAt,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"submissions": response,
		"total":       total,
		"page":        req.Page,
		"page_size":   req.PageSize,
	})
}

// DeleteSubmission soft deletes a submission (admin only)
func (sc *SubmissionController) DeleteSubmission(c *gin.Context) {
	submissionId := c.Param("submissionId")

	var submission models.Submission
	if err := sc.Db.First(&submission, submissionId).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// Check if it exists but is already soft-deleted
			var deletedSubmission models.Submission
			if err := sc.Db.Unscoped().First(&deletedSubmission, submissionId).Error; err == nil {
				c.AbortWithStatusJSON(http.StatusConflict, models.ErrorResponse{
					Error: "submission_already_deleted",
				})
				return
			}
			c.AbortWithStatusJSON(http.StatusNotFound, models.ErrorResponse{
				Error: "submission_not_found",
			})
			return
		}
		c.AbortWithStatusJSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "failed_to_retrieve_submission",
		})
		return
	}

	// Soft delete
	if err := sc.Db.Delete(&submission).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "failed_to_delete_submission",
		})
		return
	}

	// Log admin action
	adminId, _ := c.Get("userId")
	log.Printf("Admin %v deleted submission %d", adminId, submission.Id)

	c.JSON(http.StatusOK, gin.H{
		"message": "Submission deleted successfully",
	})
}

// RejudgeSubmission reruns the judge on a submission (admin only)
func (sc *SubmissionController) RejudgeSubmission(c *gin.Context) {
	submissionId := c.Param("submissionId")

	var submission models.Submission
	if err := sc.Db.First(&submission, submissionId).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.AbortWithStatusJSON(http.StatusNotFound, models.ErrorResponse{
				Error: "submission_not_found",
			})
			return
		}
		c.AbortWithStatusJSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "failed_to_retrieve_submission",
		})
		return
	}

	// Get the problem for judging
	var problem models.Problem
	if err := sc.Db.First(&problem, submission.ProblemId).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "problem_not_found",
		})
		return
	}

	// Reset submission status
	submission.Status = "pending"
	submission.Message = ""
	if err := sc.Db.Save(&submission).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "failed_to_update_submission",
		})
		return
	}

	// Run judge in background
	go func() {
		judge.RunTest(database.Db, submission, problem)
	}()

	// Log admin action
	adminId, _ := c.Get("userId")
	log.Printf("Admin %v rejudged submission %d", adminId, submission.Id)

	c.JSON(http.StatusOK, gin.H{
		"message":    "Submission rejudge initiated",
		"submission": submission,
	})
}

// ManualJudgeSubmission allows admin to set the final status for a submission
func (sc *SubmissionController) ManualJudgeSubmission(c *gin.Context) {
	submissionId := c.Param("submissionId")

	var submission models.Submission
	if err := sc.Db.First(&submission, submissionId).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.AbortWithStatusJSON(http.StatusNotFound, models.ErrorResponse{
				Error: "submission_not_found",
			})
			return
		}
		c.AbortWithStatusJSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "failed_to_retrieve_submission",
		})
		return
	}

	var req models.ManualJudgeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "validation_failed",
			Fields: map[string]string{
				"details": err.Error(),
			},
		})
		return
	}

	status := strings.ToUpper(strings.TrimSpace(req.Status))
	if status == "" {
		c.AbortWithStatusJSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "status_required",
		})
		return
	}
	if status == "AC" || status == "ACCEPTED" {
		status = "PASS"
	}

	allowed := map[string]bool{
		"PASS": true,
		"FAIL": true,
		"WA":   true,
		"TLE":  true,
		"MLE":  true,
		"CE":   true,
		"RE":   true,
		"RTE":  true,
	}
	if !allowed[status] {
		c.AbortWithStatusJSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "invalid_status",
			Fields: map[string]string{
				"status": "Allowed: PASS, FAIL, WA, TLE, MLE, CE, RE, RTE",
			},
		})
		return
	}

	submission.Status = status
	submission.Message = strings.TrimSpace(req.Message)
	if err := sc.Db.Save(&submission).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "failed_to_update_submission",
		})
		return
	}

	utils.GetBroadcaster().Publish("all_submissions", "manual judge")
	utils.GetBroadcaster().Publish("mysubmissions", "manual judge")
	utils.GetBroadcaster().Publish("standings", "manual judge")
	utils.GetBroadcaster().Publish("contest_submissions", "manual judge")
	utils.GetBroadcaster().Publish("my_contest_submissions", "manual judge")

	adminId, _ := c.Get("userId")
	log.Printf("Admin %v manually judged submission %d", adminId, submission.Id)

	c.JSON(http.StatusOK, gin.H{
		"message":    "Submission manually judged",
		"submission": submission,
	})
}
