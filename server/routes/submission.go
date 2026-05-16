package routes

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/khayrultw/go-judge/controllers"
	"github.com/khayrultw/go-judge/middleware"
)

func RegisterSubmissionRoutes(rg *gin.RouterGroup) {
	submissionController := controllers.NewSubmissionController()
	rg.POST("/:problemId", middleware.RequireAuth, middleware.CooldownLimiter(5*time.Second), middleware.RequireStarted, submissionController.SubmitCode)
	rg.POST("/test-run", middleware.RequireAuth, middleware.CooldownLimiter(5*time.Second), submissionController.TestRun)
	rg.GET("/:submissionId", middleware.RequireAuth, submissionController.GetSubmission)
	rg.GET("/my", middleware.RequireAuth, submissionController.GetMySubmissions)
	rg.GET("/sse/my", middleware.RequireTokenInQuery, submissionController.SSEMySubmissions)
}
