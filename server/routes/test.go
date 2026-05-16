package routes

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/khayrultw/go-judge/controllers"
	"github.com/khayrultw/go-judge/middleware"
)

func RegisterTestRoutes(r *gin.RouterGroup) {
	r.GET("/python", middleware.CooldownLimiter(5*time.Second), controllers.TestPython)
	r.GET("/kotlin", middleware.CooldownLimiter(5*time.Second), controllers.TestKotlin)
}
