package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/khayrultw/go-judge/config"
)

const authCookieName = "auth_token"

func RequireAuth(c *gin.Context) {
	requireClaims(c, tokenFromHeaderOrCookie(c), "Authorization header or auth cookie missing or invalid")
}

func RequireTokenInQuery(c *gin.Context) {
	tokenStr := c.Query("q")
	if tokenStr == "" {
		tokenStr = tokenFromHeaderOrCookie(c)
	}
	requireClaims(c, tokenStr, "Token is required")
}

func requireClaims(c *gin.Context, tokenStr string, missingMessage string) {
	if tokenStr == "" {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": missingMessage})
		return
	}

	claims, err := parseTokenClaims(tokenStr)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
		return
	}

	userIDValue, ok := claims["user_id"]
	if !ok {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
		return
	}
	userIDFloat, ok := userIDValue.(float64)
	if !ok {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
		return
	}
	role, ok := claims["role"].(string)
	if !ok || role == "" {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
		return
	}

	c.Set("userId", uint(userIDFloat))
	c.Set("role", role)
	if isAdmin, ok := claims["is_admin"].(bool); ok {
		c.Set("isAdmin", isAdmin)
	}

	c.Next()
}

func parseTokenClaims(tokenStr string) (jwt.MapClaims, error) {
	claims := jwt.MapClaims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
		_, ok := t.Method.(*jwt.SigningMethodHMAC)
		if !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(config.GetConfig().JWTSecret), nil
	})
	if err != nil || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}
	return claims, nil
}

func tokenFromHeaderOrCookie(c *gin.Context) string {
	authHeader := c.GetHeader("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		return strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
	}
	if tokenStr, err := c.Cookie(authCookieName); err == nil {
		return tokenStr
	}
	return ""
}
