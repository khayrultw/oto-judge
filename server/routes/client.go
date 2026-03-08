package routes

import "github.com/gin-gonic/gin"

func RegisterClientRoutes(r *gin.Engine) {
	r.GET("/manifest.json", func(c *gin.Context) {
		c.File("../client/dist/manifest.json")
	})
	r.GET("/favicon.ico", func(c *gin.Context) {
		c.File("../client/dist/favicon.ico")
	})
	r.GET("/robots.txt", func(c *gin.Context) {
		c.File("../client/dist/robots.txt")
	})
	r.GET("/logo192.png", func(c *gin.Context) {
		c.File("../client/dist/logo192.png")
	})
	r.GET("/logo512.png", func(c *gin.Context) {
		c.File("../client/dist/logo512.png")
	})

	r.NoRoute(func(c *gin.Context) {
		c.File("../client/dist/index.html")
	})
}
