package routes

import (
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
)

func RegisterClientRoutes(r *gin.Engine, publicDir string) {
	r.GET("/manifest.json", serveClientFile(publicDir, "manifest.json"))
	r.GET("/favicon.ico", serveClientFile(publicDir, "favicon.ico"))
	r.GET("/robots.txt", serveClientFile(publicDir, "robots.txt"))
	r.GET("/logo192.png", serveClientFile(publicDir, "logo192.png"))
	r.GET("/logo512.png", serveClientFile(publicDir, "logo512.png"))

	r.NoRoute(func(c *gin.Context) {
		indexPath := filepath.Join(publicDir, "index.html")
		if _, err := os.Stat(indexPath); err != nil {
			c.Status(http.StatusNotFound)
			return
		}
		c.File(indexPath)
	})
}

func serveClientFile(publicDir, name string) gin.HandlerFunc {
	return func(c *gin.Context) {
		assetPath := filepath.Join(publicDir, name)
		if _, err := os.Stat(assetPath); err != nil {
			c.Status(http.StatusNotFound)
			return
		}
		c.File(assetPath)
	}
}
