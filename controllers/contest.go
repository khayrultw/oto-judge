package controllers

import (
	"net/http"
	"sort"
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

// Helper: Get problems for contest
func (cc *ContestController) getProblemsForContest(contestId string) ([]models.Problem, map[uint]int, []uint, error) {
	var problems []models.Problem
	if err := cc.Db.Where("contest_id = ?", contestId).Order("id ASC").Find(&problems).Error; err != nil {
		return nil, nil, nil, err
	}
	problemIds := make([]uint, len(problems))
	problemIdToIndex := make(map[uint]int)
	for idx, p := range problems {
		problemIds[idx] = p.Id
		problemIdToIndex[p.Id] = idx
	}
	return problems, problemIdToIndex, problemIds, nil
}

// Helper: Get all users
func (cc *ContestController) getAllUsers() ([]models.User, map[uint]int, error) {
	var users []models.User
	if err := cc.Db.Find(&users).Error; err != nil {
		return nil, nil, err
	}
	userIdx := make(map[uint]int)
	for i, u := range users {
		userIdx[u.Id] = i
	}
	return users, userIdx, nil
}

// Helper: Get submissions for contest window
func (cc *ContestController) getSubmissionsForContest(problemIds []uint, contestId string, start, end time.Time) ([]models.Submission, error) {
	var submissions []models.Submission
	if err := cc.Db.Where(
		"problem_id IN ? AND contest_id = ? AND created_at >= ? AND created_at <= ?",
		problemIds, contestId, start, end,
	).Order("created_at asc").Find(&submissions).Error; err != nil {
		return nil, err
	}
	return submissions, nil
}

// Helper: Fill standings
func fillStandings(standings []models.UserStanding, submissions []models.Submission, userIdx map[uint]int, problemIdToIndex map[uint]int, start time.Time) {
	solvedMap := make(map[[2]uint]bool)
	for _, sub := range submissions {
		ui, ok1 := userIdx[sub.UserId]
		pi, ok2 := problemIdToIndex[sub.ProblemId]
		if !ok1 || !ok2 {
			continue
		}
		key := [2]uint{sub.UserId, sub.ProblemId}
		pa := &standings[ui].Problems[pi]
		if solvedMap[key] {
			continue
		}
		pa.Count++
		if sub.Status == "PASS" {
			pa.Status = "+"
			standings[ui].Solved++
			penalty := int(sub.CreatedAt.Time.Sub(start).Seconds())
			standings[ui].Penalty += penalty
			solvedMap[key] = true
		} else {
			pa.Status = "-"
		}
	}
	for i := range standings {
		for j := range standings[i].Problems {
			if standings[i].Problems[j].Count == 0 {
				standings[i].Problems[j].Status = ""
			}
		}
	}
}

// Helper: Sort and rank standings
func sortAndRankStandings(standings []models.UserStanding) {
	sort.SliceStable(standings, func(i, j int) bool {
		if standings[i].Solved != standings[j].Solved {
			return standings[i].Solved > standings[j].Solved
		}
		return standings[i].Penalty < standings[j].Penalty
	})
	currentRank := 1
	for i := range standings {
		if i > 0 && standings[i].Solved == standings[i-1].Solved && standings[i].Penalty == standings[i-1].Penalty {
			standings[i].Rank = standings[i-1].Rank
		} else {
			standings[i].Rank = currentRank
		}
		currentRank++
	}
}

// Main: GetStandings
func (cc *ContestController) GetStandings(c *gin.Context) {
	contestId := c.Param("contestId")

	// Check contest exists
	var contest models.Contest
	if err := cc.Db.First(&contest, contestId).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Contest not found"})
		return
	}

	// Always use UTC for start and end
	start := contest.StartTime.Time.UTC()
	end := start.Add(time.Duration(contest.Duration) * time.Minute).UTC()

	// Get problems
	problems, problemIdToIndex, problemIds, err := cc.getProblemsForContest(contestId)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve problems"})
		return
	}

	// Get users
	users, userIdx, err := cc.getAllUsers()
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Prepare standings
	standings := make([]models.UserStanding, len(users))
	for i, user := range users {
		standings[i] = models.UserStanding{
			UserId:   user.Id,
			UserName: user.Name,
			Problems: make([]models.ProblemAttempt, len(problems)),
		}
		for j, p := range problems {
			standings[i].Problems[j].ProblemNumber = p.ProblemNumber
		}
	}

	// Get submissions (pass UTC times)
	submissions, err := cc.getSubmissionsForContest(problemIds, contestId, start, end)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Fill standings
	fillStandings(standings, submissions, userIdx, problemIdToIndex, start)

	// Sort and rank
	sortAndRankStandings(standings)

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
