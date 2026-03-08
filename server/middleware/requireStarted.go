package middleware

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/khayrultw/go-judge/database"
	"github.com/khayrultw/go-judge/models"
	"github.com/khayrultw/go-judge/utils"
)

func RequireStarted(c *gin.Context) {
	// Check if user is admin - admins can bypass time restrictions
	if utils.IsAdmin(c) {
		c.Next()
		return
	}

	problemIdStr := c.Param("problemId")
	problemId, err := strconv.ParseUint(problemIdStr, 10, 64)
	if err != nil || problemId == 0 {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Missing or invalid problem_id"})
		return
	}

	var problem models.Problem
	if err := database.Db.First(&problem, uint(problemId)).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "Problem not found"})
		return
	}

	var contest models.Contest
	if err := database.Db.First(&contest, problem.ContestId).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "Contest not found"})
		return
	}

	if !utils.IsContestStarted(&contest) {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Contest has not started yet"})
		return
	}

	c.Next()
}
