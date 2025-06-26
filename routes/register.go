package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/khayrultw/go-judge/middleware"
)

func RegisterAllRoutes(r *gin.Engine) {
	RegisterAuthRoutes(r)

	// Group for contest routes, all require authentication
	contestGroup := r.Group("/contests", middleware.RequireAuth)
	RegisterContestRoutes(contestGroup)

	// Group for problem routes, all require authentication
	problemGroup := r.Group("/problem", middleware.RequireAuth)
	RegisterProblemRoutes(problemGroup)

	// Group for submission routes, all require authentication
	submissionGroup := r.Group("/submissions", middleware.RequireAuth)
	RegisterSubmissionRoutes(submissionGroup)
}
