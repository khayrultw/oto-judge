package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/khayrultw/go-judge/controllers"
	"github.com/khayrultw/go-judge/middleware"
)

func RegisterProblemRoutes(rg *gin.RouterGroup) {
	problemController := controllers.NewProblemController()
	rg.POST("", middleware.RequireAdmin, problemController.CreateProblem)
	rg.GET("/:problemId", middleware.RequireStarted, problemController.GetProblem)
	rg.PUT("/:problemId", middleware.RequireAdmin, problemController.UpdateProblem)
	rg.DELETE("/:problemId", middleware.RequireAdmin, problemController.DeleteProblem)
}
