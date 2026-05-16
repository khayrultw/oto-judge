package main

import (
	"path/filepath"

	"github.com/gin-gonic/gin"

	"github.com/khayrultw/go-judge/config"
	"github.com/khayrultw/go-judge/database"
	"github.com/khayrultw/go-judge/middleware"
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

	publicDir := config.GetConfig().PublicDir

	api := r.Group("/api", middleware.RateLimiter(10, 10))
	{
		routes.RegisterAllRoutes(api)
	}
	routes.RegisterClientRoutes(r, publicDir)

	r.Static("/assets", filepath.Join(publicDir, "assets"))

	r.Run("0.0.0.0:" + config.GetConfig().AppPort)
}
