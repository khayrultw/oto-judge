package main

import (
	"github.com/gin-gonic/gin"

	"github.com/khayrultw/go-judge/controllers"
	"github.com/khayrultw/go-judge/database"
	"github.com/khayrultw/go-judge/middleware"
)

func main() {
	r := gin.Default()
	database.InitDb()

	r.Static("/store", "./store")

	r.GET("/test/python", controllers.TestPython)
	r.GET("/test/kotlin", controllers.TestKotlin)

	codeRepo := controllers.NewCodeController()
	r.POST("/code", middleware.RequireAuth, codeRepo.PostCode)
	r.GET("/code/:id", middleware.RequireAuth, codeRepo.GetCode)

	authController := controllers.NewAuthController()
	r.POST("/register", authController.Register)
	r.POST("/login", authController.Login)
	r.GET("/logout", authController.Logout)

	r.Run() // listen and serve on 0.0.0.0:8080
}
