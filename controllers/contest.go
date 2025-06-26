// Create crud for contest using the contest model in models dir
package controllers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/khayrultw/go-judge/database"
	"github.com/khayrultw/go-judge/models"
	"gorm.io/gorm"
)

type ContestController struct {
	Db *gorm.DB
}

func NewContestController() *ContestController {
	db := database.Db
	return &ContestController{Db: db}
}

// CreateContest handles the creation of a new contest
func (cc *ContestController) CreateContest(c *gin.Context) {
	var contest models.Contest

	if err := c.BindJSON(&contest); err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if err := cc.Db.Create(&contest).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, contest)
}

// GetContest retrieves a contest by ID
func (cc *ContestController) GetContest(c *gin.Context) {
	contestId := c.Param("contestId")
	println("Contest ID:", contestId)
	var contest models.Contest
	if err := cc.Db.Preload("Problems").First(&contest, contestId).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "Contest not found"})
		return
	}

	c.JSON(http.StatusOK, contest)
}

// get upcoming contests
func (cc *ContestController) GetUpcomingContests(c *gin.Context) {
	var contests []models.Contest
	if err := cc.Db.Where("start_time > ?", "now()").Find(&contests).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve upcoming contests"})
		return
	}

	c.JSON(http.StatusOK, contests)
}

// UpdateContest updates an existing contest
func (cc *ContestController) UpdateContest(c *gin.Context) {
	contestId := c.Param("contestId")
	var contest models.Contest
	if err := c.BindJSON(&contest); err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if err := cc.Db.Model(&contest).Where("id = ?", contestId).Updates(contest).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, contest)
}

// DeleteContest deletes a contest by ID
func (cc *ContestController) DeleteContest(c *gin.Context) {
	contestId := c.Param("contestId")
	if err := cc.Db.Delete(&models.Contest{}, contestId).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete contest"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Contest deleted successfully"})
}

// ListContests retrieves all contests
func (cc *ContestController) ListContests(c *gin.Context) {
	var contests []models.Contest
	if err := cc.Db.Find(&contests).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve contests"})
		return
	}

	c.JSON(http.StatusOK, contests)
}

// GetContestProblems retrieves all problems for a specific contest
func (cc *ContestController) GetContestProblems(c *gin.Context) {
	contestId, err := strconv.ParseUint(c.Param("contestId"), 10, 64)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid contest ID"})
		return
	}
	var problems []models.Problem
	if err := cc.Db.Where("contest_id = ?", contestId).Find(&problems).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve problems"})
		return
	}

	c.JSON(http.StatusOK, problems)
}

func stringToUint(s string) (uint, error) {
	u64, err := strconv.ParseUint(s, 10, 64)
	return uint(u64), err
}

func (cc *ContestController) AddProblemToContest(c *gin.Context) {
	contestId := c.Param("contestId")
	var problem models.Problem
	if err := c.BindJSON(&problem); err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	contestIdUint, err := stringToUint(contestId)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid contest ID"})
		return
	}
	problem.ContestId = contestIdUint
	if err := cc.Db.Create(&problem).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, problem)
}

// DeleteProblemFromContest removes a problem from a specific contest
func (cc *ContestController) DeleteProblemFromContest(c *gin.Context) {
	contestId := c.Param("contest_id")
	problemId := c.Param("problem_id")

	if err := cc.Db.Where("contest_id = ? AND id = ?", contestId, problemId).Delete(&models.Problem{}).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete problem from contest"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Problem deleted from contest successfully"})
}

// UpdateProblemInContest updates a problem in a specific contest
func (cc *ContestController) UpdateProblemInContest(c *gin.Context) {
	contestId := c.Param("contest_id")
	problemId := c.Param("problem_id")
	var problem models.Problem
	if err := c.BindJSON(&problem); err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if err := cc.Db.Model(&problem).Where("contest_id = ? AND id = ?", contestId, problemId).Updates(problem).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, problem)
}

// GetContestSubmissions retrieves all submissions for a specific contest
func (cc *ContestController) GetContestSubmissions(c *gin.Context) {
	contestId := c.Param("contestId")
	var submissions []models.Submission
	if err := cc.Db.Where("contest_id = ?", contestId).Find(&submissions).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve submissions"})
		return
	}

	c.JSON(http.StatusOK, submissions)
}

// GetContestStandings retrieves the standings for a specific contest
// GetStandings returns the standings for a specific contest
func (cc *ContestController) GetStandings(c *gin.Context) {
	contestId := c.Param("contestId")

	// Check contest exists
	var contest models.Contest
	if err := cc.Db.First(&contest, contestId).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Contest not found"})
		return
	}

	// Calculate contest start and end time
	start := contest.StartTime.Time
	end := start.Add(time.Duration(contest.Duration) * time.Minute)

	// Get problems for contest
	var problems []models.Problem
	if err := cc.Db.Where("contest_id = ?", contestId).Order("id ASC").Find(&problems).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve problems"})
		return
	}
	problemIds := make([]uint, len(problems))
	problemIdToIndex := make(map[uint]int)
	for idx, p := range problems {
		problemIds[idx] = p.Id
		problemIdToIndex[p.Id] = idx
	}

	// Get all users
	var users []models.User
	if err := cc.Db.Find(&users).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	type UserStanding struct {
		UserId   uint   `json:"user_id"`
		UserName string `json:"user_name"`
		Solved   int    `json:"solved"`
		Problems []bool `json:"problems"`
	}

	// Prepare standings
	standings := make([]UserStanding, len(users))
	for i, user := range users {
		standings[i] = UserStanding{
			UserId:   user.Id,
			UserName: user.Name,
			Problems: make([]bool, len(problems)),
		}
	}

	// Get accepted submissions ONLY during contest window
	var submissions []models.Submission
	if err := cc.Db.Where(
		"problem_id IN ? AND status = ? AND created_at >= ? AND created_at <= ?",
		problemIds, "PASS", start, end,
	).Find(&submissions).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Fill standings
	userIdx := make(map[uint]int)
	for i, u := range users {
		userIdx[u.Id] = i
	}
	for _, sub := range submissions {
		ui, ok1 := userIdx[sub.UserId]
		pi, ok2 := problemIdToIndex[sub.ProblemId]
		if ok1 && ok2 && !standings[ui].Problems[pi] {
			standings[ui].Problems[pi] = true
			standings[ui].Solved++
		}
	}

	c.JSON(http.StatusOK, standings)
}

// funtion to get all the contests
func (cc *ContestController) GetContests(c *gin.Context) {
	var contests []models.Contest
	if err := cc.Db.Find(&contests).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve contests"})
		return
	}

	c.JSON(http.StatusOK, contests)
}
