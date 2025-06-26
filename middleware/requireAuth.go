package middleware

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/khayrultw/go-judge/controllers"
)

func RequireAuth(c *gin.Context) {
	println("RequireAuth middleware called")
	cookie, err := c.Cookie("Authorization")
	if err != nil {
		println("No authorization cookie found")
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "No authorization cookie"})
		return
	}

	token, err := jwt.ParseWithClaims(cookie, &jwt.MapClaims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(controllers.SECRET), nil
	})

	if err != nil || !token.Valid {
		print("Invalid token:", err)
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
		return
	}

	claims, ok := token.Claims.(*jwt.MapClaims)
	if !ok || claims == nil {
		println("Invalid claims in token")
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid claims"})
		return
	}

	if float64(time.Now().Unix()) > (*claims)["exp"].(float64) {
		println("Token expired")
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Token expired"})
		return
	}
	userIdFloat, ok := (*claims)["user_id"].(float64)
	if !ok {
		println("Invalid user ID format in claims")
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID format"})
		return
	}

	// Convert to uint
	userId := uint(userIdFloat)

	c.Set("userId", userId)

	c.Next()
}
