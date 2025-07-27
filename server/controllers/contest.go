package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/khayrultw/go-judge/database"
	"github.com/khayrultw/go-judge/models"
	"github.com/khayrultw/go-judge/utils"
	"gorm.io/gorm"
)

type ContestController struct {
	Db *gorm.DB
}

func NewContestController() *ContestController {
	db := database.Db
	return &ContestController{Db: db}
}

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

func (cc *ContestController) GetContest(c *gin.Context) {
	contestId := c.Param("contestId")
	var contest models.Contest
	if err := cc.Db.Preload("Problems").First(&contest, contestId).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "Contest not found"})
		return
	}

	c.JSON(http.StatusOK, contest)
}

func (cc *ContestController) GetUpcomingContests(c *gin.Context) {
	var contests []models.Contest
	if err := cc.Db.Where("start_time > ?", "now()").Find(&contests).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve upcoming contests"})
		return
	}

	c.JSON(http.StatusOK, contests)
}

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

func (cc *ContestController) DeleteContest(c *gin.Context) {
	contestId := c.Param("contestId")
	if err := cc.Db.Delete(&models.Contest{}, contestId).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete contest"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Contest deleted successfully"})
}

func (cc *ContestController) ListContests(c *gin.Context) {
	var contests []models.Contest
	if err := cc.Db.Find(&contests).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve contests"})
		return
	}

	c.JSON(http.StatusOK, contests)
}

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

func (cc *ContestController) DeleteProblemFromContest(c *gin.Context) {
	contestId := c.Param("contest_id")
	problemId := c.Param("problem_id")

	if err := cc.Db.Where("contest_id = ? AND id = ?", contestId, problemId).Delete(&models.Problem{}).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete problem from contest"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Problem deleted from contest successfully"})
}

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

func (cc *ContestController) GetAllSubmissions(c *gin.Context) {
	role := c.GetString("role")
	contestId := c.Param("contestId")
	submissions, err := cc.getAllSubmissions(contestId, role)

	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve submissions"})
		return
	}
	c.JSON(http.StatusOK, submissions)
}

func (cc *ContestController) GetMySubmissions(c *gin.Context) {
	userId := c.GetUint("userId")
	contestId := c.Param("contestId")

	submissions, err := cc.getMySubmissions(userId, contestId)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve submissions"})
		return
	}

	c.JSON(http.StatusOK, submissions)
}

// getAllMySubmissions retrieves all submissions made by the user in a specific contest
// only if user is admin or contest is over
func (cc *ContestController) GetAllMySubmissionSSE(c *gin.Context) {
	role := c.GetString("role")
	contestId := c.Param("contestId")

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		http.Error(c.Writer, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")

	client := utils.GetBroadcaster().Subscribe("contest_submissions")
	defer close(client)

	for {
		select {
		case <-client:
			submissions, err := cc.getAllSubmissions(contestId, role)
			if err != nil {
				continue
			}
			jsonBytes, err := json.Marshal(submissions)
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

func (cc *ContestController) GetMySubmissionsSSE(c *gin.Context) {
	userId := c.GetUint("userId")
	contestId := c.Param("contestId")

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		http.Error(c.Writer, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")

	client := utils.GetBroadcaster().Subscribe("my_contest_submissions")
	defer close(client)

	for {
		select {
		case <-client:
			submissions, err := cc.getMySubmissions(userId, contestId)
			if err != nil {
				continue
			}
			jsonBytes, err := json.Marshal(submissions)
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

func (sc *ContestController) getMySubmissions(userId uint, contestId string) ([]models.SubmissionWithProblem, error) {
	type Result struct {
		models.Submission
		ProblemTitle string
	}

	query := sc.Db.Table("submissions").
		Select("submissions.*, problems.title as problem_title").
		Joins("LEFT JOIN problems ON problems.id = submissions.problem_id").
		Where("submissions.user_id = ?", userId).
		Where("problems.contest_id = ?", contestId)

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

func (sc *ContestController) getAllSubmissions(contestId, role string) ([]models.SubmissionWithProblem, error) {
	fmt.Printf("Role: %s\n", role)
	type Result struct {
		models.Submission
		UserName     string
		ProblemTitle string
	}

	var results []Result
	query := sc.Db.Table("submissions").
		Select("submissions.*, users.name as user_name, problems.title as problem_title").
		Joins("LEFT JOIN users ON users.id = submissions.user_id").
		Joins("LEFT JOIN problems ON problems.id = submissions.problem_id").
		Where("problems.contest_id = ?", contestId)

	err := query.Order("submissions.id desc").Limit(200).Scan(&results).Error
	if err != nil {
		return nil, err
	}

	var response []models.SubmissionWithProblem
	for _, r := range results {
		sourceCode := "Not Available"
		if role == "admin" {
			sourceCode = r.SourceCode
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
			Message:      r.Message,
			CreatedAt:    r.CreatedAt,
		})
	}

	return response, nil
}

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

func (cc *ContestController) getSubmissionsForContest(problemIds []uint, contestId string, start time.Time) ([]models.Submission, error) {
	var submissions []models.Submission
	if err := cc.Db.Where(
		"problem_id IN ? AND contest_id = ? AND created_at >= ?",
		problemIds, contestId, start,
	).Order("created_at asc").Find(&submissions).Error; err != nil {
		return nil, err
	}
	return submissions, nil
}

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

func (cc *ContestController) SSEStandings(c *gin.Context) {
	contestId := c.Param("contestId")

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		http.Error(c.Writer, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")

	client := utils.GetBroadcaster().Subscribe("standings")
	defer close(client)

	for {
		select {
		case <-client:
			sumissions, err := cc.getStandings(contestId)
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

func (cc *ContestController) GetStandings(c *gin.Context) {
	contestId := c.Param("contestId")

	standings, err := cc.getStandings(contestId)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve standings"})
		return
	}

	sortAndRankStandings(standings)

	c.JSON(http.StatusOK, standings)
}

func (cc *ContestController) getStandings(contestId string) ([]models.UserStanding, error) {

	var contest models.Contest
	if err := cc.Db.First(&contest, contestId).Error; err != nil {
		return nil, err
	}

	start := contest.StartTime.Time.UTC()

	problems, problemIdToIndex, problemIds, err := cc.getProblemsForContest(contestId)
	if err != nil {
		return nil, err
	}

	users, userIdx, err := cc.getAllUsers()
	if err != nil {
		return nil, err
	}

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

	submissions, err := cc.getSubmissionsForContest(problemIds, contestId, start)
	if err != nil {
		return nil, err
	}

	fillStandings(standings, submissions, userIdx, problemIdToIndex, start)

	sortAndRankStandings(standings)

	return standings, nil
}

func (cc *ContestController) GetContests(c *gin.Context) {
	var contests []models.Contest
	if err := cc.Db.Find(&contests).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve contests"})
		return
	}

	c.JSON(http.StatusOK, contests)
}
