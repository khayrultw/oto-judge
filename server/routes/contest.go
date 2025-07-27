package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/khayrultw/go-judge/controllers"
	"github.com/khayrultw/go-judge/middleware"
)

func RegisterContestRoutes(rg *gin.RouterGroup) {
	contestController := controllers.NewContestController()
	rg.POST("", middleware.RequireAuth, middleware.RequireAdmin, contestController.CreateContest)
	rg.GET("/standings/sse/:contestId", middleware.RequireTokenInQuery, contestController.SSEStandings)
	rg.GET("/:contestId/sse", middleware.RequireTokenInQuery, contestController.GetAllMySubmissionSSE)
	rg.GET("/:contestId/sse/my", middleware.RequireTokenInQuery, contestController.GetMySubmissionsSSE)
	rg.GET("/:contestId/submissions", middleware.RequireAuth, contestController.GetAllSubmissions)
	rg.GET("/:contestId/submissions/my", middleware.RequireAuth, contestController.GetMySubmissions)
	rg.GET("/:contestId", middleware.RequireAuth, contestController.GetContest)
	rg.PUT("/:contestId", middleware.RequireAuth, middleware.RequireAdmin, contestController.UpdateContest)
	rg.GET("", middleware.RequireAuth, contestController.GetContests)
	rg.GET("/upcomming", middleware.RequireAuth, contestController.GetUpcomingContests)
	rg.DELETE("/:contestId", middleware.RequireAuth, middleware.RequireAdmin, contestController.DeleteContest)
	rg.GET("/:contestId/standings", middleware.RequireAuth, contestController.GetStandings)
}
