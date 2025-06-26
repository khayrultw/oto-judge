package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/khayrultw/go-judge/controllers"
	"github.com/khayrultw/go-judge/middleware"
)

func RegisterSubmissionRoutes(rg *gin.RouterGroup) {
	submissionController := controllers.NewSubmissionController()
	rg.POST("/:problemId", middleware.RequireStarted, submissionController.SubmitCode)
	rg.GET("/:submissionId", submissionController.GetSubmission)
	rg.GET("/my", submissionController.GetMySubmissions)
	rg.GET("", submissionController.GetAllSubmissions)
}
