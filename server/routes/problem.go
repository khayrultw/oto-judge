package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/khayrultw/go-judge/controllers"
	"github.com/khayrultw/go-judge/middleware"
)

func RegisterProblemRoutes(rg *gin.RouterGroup) {
	problemController := controllers.NewProblemController()

	// User-facing problem routes (with time guards)
	rg.GET("/:problemId", middleware.RequireStarted, problemController.GetProblem)
}
