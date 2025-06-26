package main

import (
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"github.com/khayrultw/go-judge/controllers"
	"github.com/khayrultw/go-judge/database"
	"github.com/khayrultw/go-judge/routes"
)

func main() {
	r := gin.Default()
	database.InitDb()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"}, // your frontend URL
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true, // important when sending cookies
		MaxAge:           12 * time.Hour,
	}))

	r.Static("/store", "./store")

	r.GET("/test/python", controllers.TestPython)
	r.GET("/test/kotlin", controllers.TestKotlin)

	routes.RegisterAllRoutes(r)

	r.Run() // listen and serve on 0.0.0.0:8080
}
