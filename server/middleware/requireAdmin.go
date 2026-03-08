package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/khayrultw/go-judge/utils"
)

func RequireAdmin(c *gin.Context) {
	if !utils.IsAdmin(c) {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return
	}

	c.Next()
}
