package main

import (
	"github.com/gin-gonic/gin"

	"github.com/khayrultw/go-judge/config"
	"github.com/khayrultw/go-judge/database"
	"github.com/khayrultw/go-judge/routes"
)

func main() {
	r := gin.Default()
	if err := config.LoadConfig(); err != nil {
		return
	}

	if err := database.InitDb(); err != nil {
		return
	}

	api := r.Group("/api")
	{
		routes.RegisterAllRoutes(api)
	}
	routes.RegisterClientRoutes(r)

	r.Static("/store", "./store")
	r.Static("/static", "../client/build/static")

	r.Run("0.0.0.0:2931")
}
