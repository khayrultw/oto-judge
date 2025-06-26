package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/khayrultw/go-judge/controllers"
	"github.com/khayrultw/go-judge/middleware"
)

func RegisterContestRoutes(rg *gin.RouterGroup) {
	contestController := controllers.NewContestController()
	rg.POST("", middleware.RequireAdmin, contestController.CreateContest)
	rg.GET("/:contestId", contestController.GetContest)
	rg.PUT("/:contestId", middleware.RequireAdmin, contestController.UpdateContest)
	rg.GET("", contestController.GetContests)
	rg.GET("/upcomming", contestController.GetUpcomingContests)
	rg.DELETE("/:contestId", middleware.RequireAdmin, contestController.DeleteContest)
	rg.GET("/:contestId/standings", contestController.GetStandings)
}
