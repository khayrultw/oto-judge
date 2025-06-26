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
	userId := c.GetUint("userId") // This will be set by the RequireAuth middleware

	// Get contest ID from query parameter
	contestId := c.Query("contest_id")
	query := sc.Db.Where("user_id = ?", userId)

	if contestId != "" {
		query = query.Where("contest_id = ?", contestId)
	}

	var submissions []models.Submission
	err := query.Order("id desc").Find(&submissions).Error
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// for each submission, read the source code from the file
	pwd, _ := os.Getwd()
	for i := range submissions {
		sourcePath := pwd + "/store/solutions/" + submissions[i].SourceCode
		body, err := os.ReadFile(sourcePath)
		if err == nil {
			submissions[i].SourceCode = string(body)
		} else {
			submissions[i].SourceCode = ""
		}
	}

	c.JSON(http.StatusOK, submissions)
}

type SubmissionWithProblem struct {
	ID           uint      `json:"id"`
	UserId       uint      `json:"user_id"`
	ProblemId    uint      `json:"problem_id"`
	ProblemTitle string    `json:"problem_title"`
	Language     string    `json:"language"`
	SourceCode   string    `json:"source_code"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"created_at"`
}

// another endpoint to get all submissions for a specific problem
func (sc *SubmissionController) GetAllSubmissions(c *gin.Context) {
	var submissions []models.Submission
	err := sc.Db.Order("id desc").Limit(50).Find(&submissions).Error
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	pwd, _ := os.Getwd()
	var result []SubmissionWithProblem
	for _, sub := range submissions {
		sourcePath := pwd + "/store/solutions/" + sub.SourceCode
		body, err := os.ReadFile(sourcePath)
		sourceCode := ""
		if err == nil {
			sourceCode = string(body)
		}

		var problem models.Problem
		problemTitle := ""
		if err := sc.Db.Select("title").First(&problem, sub.ProblemId).Error; err == nil {
			problemTitle = problem.Title
		}

		result = append(result, SubmissionWithProblem{
			ID:           sub.Id,
			UserId:       sub.UserId,
			ProblemId:    sub.ProblemId,
			ProblemTitle: problemTitle,
			Language:     sub.Language,
			SourceCode:   sourceCode,
			Status:       sub.Status,
			CreatedAt:    sub.CreatedAt.Time,
		})
	}

	c.JSON(http.StatusOK, result)
}
