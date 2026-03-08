package utils

import (
	"github.com/gin-gonic/gin"
	"github.com/khayrultw/go-judge/database"
	"github.com/khayrultw/go-judge/models"
)

// IsAdmin checks if the current user (from context) is an admin.
// Reads from context first (set by RequireAuth from JWT claims).
// Falls back to DB query for old tokens that lack the is_admin claim.
func IsAdmin(c *gin.Context) bool {
	if isAdmin, exists := c.Get("isAdmin"); exists {
		if admin, ok := isAdmin.(bool); ok {
			return admin
		}
	}

	// Fallback: query DB for old tokens without is_admin claim
	userIdVal, exists := c.Get("userId")
	if !exists {
		return false
	}
	userId, ok := userIdVal.(uint)
	if !ok {
		return false
	}
	var user models.User
	if err := database.Db.First(&user, userId).Error; err != nil {
		return false
	}
	c.Set("isAdmin", user.IsAdmin)
	return user.IsAdmin
}

// GetUserID extracts the user ID from context
func GetUserID(c *gin.Context) (uint, bool) {
	userIdVal, exists := c.Get("userId")
	if !exists {
		return 0, false
	}

	userId, ok := userIdVal.(uint)
	if !ok {
		return 0, false
	}

	return userId, true
}
