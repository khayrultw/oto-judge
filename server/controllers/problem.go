package controllers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/khayrultw/go-judge/database"
	"github.com/khayrultw/go-judge/models"
	"gorm.io/gorm"
)

type ProblemController struct {
	Db *gorm.DB
}

func NewProblemController() *ProblemController {
	db := database.Db
	return &ProblemController{Db: db}
}

// CreateProblem handles file uploads and creates a new problem
func (pc *ProblemController) CreateProblem(c *gin.Context) {
	contestIdStr := c.PostForm("contest_id")
	problemNumberStr := c.PostForm("problem_number")

	contestId, err := strconv.ParseUint(contestIdStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid contest_id"})
		return
	}
	problemNumber, err := strconv.ParseUint(problemNumberStr, 10, 8)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid problem_number"})
		return
	}

	testcaseText := c.PostForm("testcase")
	if testcaseText == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Testcase text is required"})
		return
	}

	uploadDir := filepath.Join("store/test_cases", "contest_"+contestIdStr)
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create directory"})
		return
	}

	testcasePath := filepath.Join(uploadDir, fmt.Sprintf("c_%d_p_%d_testcase.txt", contestId, problemNumber))
	if err := os.WriteFile(testcasePath, []byte(testcaseText), 0644); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write testcase file"})
		return
	}


	problem := models.Problem{
		ContestId:     uint(contestId),
		Title:         c.PostForm("title"),
		Statement:     c.PostForm("statement"),
		TestCasePath:  testcasePath,
		ProblemNumber: uint8(problemNumber),
	}

	if err := pc.Db.Create(&problem).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create problem"})
		return
	}

	c.JSON(http.StatusOK, problem)
}

func (pc *ProblemController) GetProblem(c *gin.Context) {
	id := c.Param("problemId")
	var problem models.Problem
	if err := pc.Db.First(&problem, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Problem not found"})
		return
	}
	c.JSON(http.StatusOK, problem)
}

func (pc *ProblemController) UpdateProblem(c *gin.Context) {
	id := c.Param("problemId")
	var problem models.Problem
	if err := pc.Db.First(&problem, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Problem not found"})
		return
	}

	title := c.PostForm("title")
	statement := c.PostForm("statement")
	if title != "" {
		problem.Title = title
	}
	if statement != "" {
		problem.Statement = statement
	}

	if err := pc.Db.Save(&problem).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update problem"})
		return
	}
	c.JSON(http.StatusOK, problem)
}

func (pc *ProblemController) DeleteProblem(c *gin.Context) {
	id := c.Param("problemId")
	if err := pc.Db.Delete(&models.Problem{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete problem"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Problem deleted"})
}
