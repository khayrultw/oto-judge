package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/khayrultw/go-judge/controllers"
	"github.com/khayrultw/go-judge/middleware"
)

func RegisterAuthRoutes(r *gin.RouterGroup) {
	authController := controllers.NewAuthController()
	r.POST("/register", authController.Register)
	r.POST("/update-user", middleware.RequireAuth, middleware.RequireAdmin, authController.Update)
	r.GET("/me", middleware.RequireAuth, authController.GetUser)
	r.POST("/login", authController.Login)
	r.GET("/logout", authController.Logout)
}
