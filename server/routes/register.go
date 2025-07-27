package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/khayrultw/go-judge/middleware"
)

func RegisterAllRoutes(r *gin.RouterGroup) {
	RegisterAuthRoutes(r)

	testGroup := r.Group("/test")
	RegisterTestRoutes(testGroup)

	contestGroup := r.Group("/contests")
	RegisterContestRoutes(contestGroup)

	problemGroup := r.Group("/problem", middleware.RequireAuth)
	RegisterProblemRoutes(problemGroup)

	submissionGroup := r.Group("/submissions")
	RegisterSubmissionRoutes(submissionGroup)
}
