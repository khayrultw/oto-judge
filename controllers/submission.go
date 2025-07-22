package controllers

import (
	"fmt"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/khayrultw/go-judge/database"
	"github.com/khayrultw/go-judge/judge"
	"github.com/khayrultw/go-judge/models"
	"gorm.io/gorm"
)

type SubmissionController struct {
	Db *gorm.DB
}

func NewSubmissionController() *SubmissionController {
	db := database.Db
	return &SubmissionController{Db: db}
}

// SubmitCode handles code submission and runs tests
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

	// Validate problem exists
	var problem models.Problem
	if err := sc.Db.First(&problem, submission.ProblemId).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Problem not found"})
		return
	}

	fmt.Println("Submission received:", submission)

	path := "u" + strconv.FormatUint(uint64(submission.UserId), 10) + "_"
	path += strconv.FormatInt(time.Now().UnixNano(), 32) + "." + submission.Language
	sourceCode := submission.SourceCode
	submission.SourceCode = path

	if err := sc.Db.Create(&submission).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err})
		return
	}

	go func() {
		pwd, derr := os.Getwd()
		if derr != nil {
			fmt.Println(derr.Error())
			return
		}

		file, err := os.Create(pwd + "/store/solutions/" + path)
		if err != nil {
			fmt.Println(err.Error())
			return
		}
		defer file.Close()

		file.WriteString(sourceCode)
		defer judge.RunTest(database.Db, submission, problem)
	}()

	c.JSON(http.StatusOK, submission)
}

// GetSubmission returns a specific submission by ID
func (sc *SubmissionController) GetSubmission(c *gin.Context) {
	var submission models.Submission
	id, _ := strconv.Atoi(c.Param("submissionId"))
	err := sc.Db.Where("id = ?", id).First(&submission).Error
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err})
		return
	}

	// Read the actual source code from the file path stored in SourceCode
	pwd, _ := os.Getwd()
	sourcePath := pwd + "/store/solutions/" + submission.SourceCode
	body, err := os.ReadFile(sourcePath)
	if err == nil {
		submission.SourceCode = string(body)
	}

	c.JSON(http.StatusOK, submission)
}

// GetMySubmissions returns all submissions for the authenticated user
func (sc *SubmissionController) GetMySubmissions(c *gin.Context) {
	// Get user ID from JWT token
	userId := c.GetUint("userId")

	// Get contest ID from query parameter
	contestId := c.Query("contest_id")

	type Result struct {
		models.Submission
		ProblemTitle string
	}

	query := sc.Db.Table("submissions").
		Select("submissions.*, problems.title as problem_title").
		Joins("LEFT JOIN problems ON problems.id = submissions.problem_id").
		Where("submissions.user_id = ?", userId)

	if contestId != "" {
		query = query.Where("submissions.contest_id = ?", contestId)
	}

	var results []Result
	err := query.Order("submissions.id desc").Scan(&results).Error
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	pwd, _ := os.Getwd()
	var response []models.SubmissionWithProblem
	for _, r := range results {
		sourcePath := pwd + "/store/solutions/" + r.SourceCode
		body, err := os.ReadFile(sourcePath)
		sourceCode := ""
		if err == nil {
			sourceCode = string(body)
		}
		response = append(response, models.SubmissionWithProblem{
			ID:           r.Id,
			UserId:       r.UserId,
			UserName:     "", // Not needed for my submissions, or fetch if you want
			ProblemId:    r.ProblemId,
			ProblemTitle: r.ProblemTitle,
			Language:     r.Language,
			SourceCode:   sourceCode,
			Status:       r.Status,
			Message:      r.Message,
			CreatedAt:    r.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, response)
}

// another endpoint to get all submissions for a specific problem
func (sc *SubmissionController) GetAllSubmissions(c *gin.Context) {
	type Result struct {
		models.Submission
		UserName     string
		ProblemTitle string
	}

	var results []Result
	err := sc.Db.Table("submissions").
		Select("submissions.*, users.name as user_name, problems.title as problem_title").
		Joins("LEFT JOIN users ON users.id = submissions.user_id").
		Joins("LEFT JOIN problems ON problems.id = submissions.problem_id").
		Order("submissions.id desc").
		Limit(50).
		Scan(&results).Error
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	pwd, _ := os.Getwd()
	var response []models.SubmissionWithProblem
	for _, r := range results {
		sourcePath := pwd + "/store/solutions/" + r.SourceCode
		body, err := os.ReadFile(sourcePath)
		sourceCode := ""
		if err == nil {
			sourceCode = string(body)
		}
		response = append(response, models.SubmissionWithProblem{
			ID:           r.Id,
			UserId:       r.UserId,
			UserName:     r.UserName,
			ProblemId:    r.ProblemId,
			ProblemTitle: r.ProblemTitle,
			Language:     r.Language,
			SourceCode:   sourceCode,
			Status:       r.Status,
			CreatedAt:    r.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, response)
}
