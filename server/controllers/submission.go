package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

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

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")

	client := utils.GetBroadcaster().Subscribe("mysubmissions")
	defer close(client)

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

	var submission models.Submission
	if err := c.BindJSON(&submission); err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	userId := c.GetUint("userId")
	submission.UserId = userId
	submission.ProblemId = uint(problemId)

	var problem models.Problem
	if err := sc.Db.First(&problem, submission.ProblemId).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Problem not found"})
		return
	}

	if err := sc.Db.Create(&submission).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err})
		return
	}

	go func() {
		defer judge.RunTest(database.Db, submission, problem)
	}()

	c.JSON(http.StatusOK, submission)
}

func (sc *SubmissionController) GetSubmission(c *gin.Context) {
	var submission models.Submission
	id, _ := strconv.Atoi(c.Param("submissionId"))
	err := sc.Db.Where("id = ?", id).First(&submission).Error
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err})
		return
	}

	c.JSON(http.StatusOK, submission)
}

func (sc *SubmissionController) GetMySubmissions(c *gin.Context) {
	userId := c.GetUint("userId")
	submissions, err := sc.GetSubsByUser(userId)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, submissions)
}

func (sc *SubmissionController) GetSubsByUser(userId uint) ([]models.SubmissionWithProblem, error) {
	type Result struct {
		models.Submission
		ProblemTitle string
	}

	query := sc.Db.Table("submissions").
		Select("submissions.*, problems.title as problem_title").
		Joins("LEFT JOIN problems ON problems.id = submissions.problem_id").
		Where("submissions.user_id = ?", userId)

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

