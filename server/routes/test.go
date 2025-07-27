package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/khayrultw/go-judge/controllers"
)

func RegisterTestRoutes(r *gin.RouterGroup) {
	r.GET("/python", controllers.TestPython)
	r.GET("/kotlin", controllers.TestKotlin)
}
