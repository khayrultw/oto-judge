package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/khayrultw/go-judge/controllers"
	"github.com/khayrultw/go-judge/middleware"
)

func RegisterSubmissionRoutes(rg *gin.RouterGroup) {
	submissionController := controllers.NewSubmissionController()
	rg.POST("/:problemId", middleware.RequireAuth, middleware.RequireStarted, submissionController.SubmitCode)
	rg.GET("/:submissionId", middleware.RequireAuth, submissionController.GetSubmission)
	rg.GET("/my", middleware.RequireAuth, submissionController.GetMySubmissions)
	rg.GET("/sse/my", middleware.RequireTokenInQuery, submissionController.SSEMySubmissions)
}
