package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/khayrultw/go-judge/controllers"
	"github.com/khayrultw/go-judge/middleware"
)

func RegisterContestRoutes(rg *gin.RouterGroup) {
	contestController := controllers.NewContestController()

	// SSE endpoints share the same auth middleware and can use the auth cookie.
	rg.GET("/standings/sse/:contestId", middleware.RequireTokenInQuery, contestController.SSEStandings)
	rg.GET("/:contestId/sse", middleware.RequireTokenInQuery, contestController.GetAllMySubmissionSSE)
	rg.GET("/:contestId/sse/my", middleware.RequireTokenInQuery, contestController.GetMySubmissionsSSE)

	// Regular endpoints (require auth header)
	rg.GET("/upcoming", middleware.RequireAuth, contestController.GetUpcomingContests)
	rg.GET("/past", middleware.RequireAuth, contestController.GetPastContests)
	rg.GET("/:contestId/submissions", middleware.RequireAuth, contestController.GetAllSubmissions)
	rg.GET("/:contestId/submissions/my", middleware.RequireAuth, contestController.GetMySubmissions)
	rg.GET("/:contestId/standings", middleware.RequireAuth, contestController.GetStandings)
	rg.GET("/:contestId", middleware.RequireAuth, contestController.GetContest)
	rg.GET("", middleware.RequireAuth, contestController.GetContests)
}
