package controllers

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/khayrultw/go-judge/database"
	"github.com/khayrultw/go-judge/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type UserController struct {
	Db *gorm.DB
}

func NewUserController() *UserController {
	db := database.Db
	return &UserController{Db: db}
}

// CreateUser creates a new user (admin only)
func (uc *UserController) CreateUser(c *gin.Context) {
	var req models.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "validation_failed",
			Fields: map[string]string{
				"details": err.Error(),
			},
		})
		return
	}

	// Check if email already exists
	var existingUser models.User
	if err := uc.Db.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		c.AbortWithStatusJSON(http.StatusConflict, models.ErrorResponse{
			Error: "email_already_exists",
		})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), 14)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "failed_to_hash_password",
		})
		return
	}

	user := models.User{
		Name:     req.Name,
		Email:    req.Email,
		Password: hashedPassword,
		IsAdmin:  req.IsAdmin,
	}

	if err := uc.Db.Create(&user).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "failed_to_create_user",
		})
		return
	}

	// Log admin action
	adminId, _ := c.Get("userId")
	log.Printf("Admin %v created user %d (%s)", adminId, user.Id, user.Email)

	c.JSON(http.StatusCreated, models.UserListResponse{
		ID:        user.Id,
		Name:      user.Name,
		Email:     user.Email,
		IsAdmin:   user.IsAdmin,
		CreatedAt: user.CreatedAt,
	})
}

// ListUsers lists all users with optional pagination (admin only)
func (uc *UserController) ListUsers(c *gin.Context) {
	page := c.DefaultQuery("page", "1")
	pageSize := c.DefaultQuery("page_size", "50")
	includeDeleted := c.Query("include_deleted") == "true"

	var users []models.User
	query := uc.Db

	if includeDeleted {
		query = query.Unscoped()
	}

	var total int64
	query.Model(&models.User{}).Count(&total)

	// Simple pagination
	var offset int
	var limit int
	if page != "" && pageSize != "" {
		var p, ps int
		if _, err := fmt.Sscanf(page, "%d", &p); err == nil {
			if _, err := fmt.Sscanf(pageSize, "%d", &ps); err == nil {
				offset = (p - 1) * ps
				limit = ps
			}
		}
	}

	if limit > 0 {
		query = query.Offset(offset).Limit(limit)
	}

	if err := query.Find(&users).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "failed_to_retrieve_users",
		})
		return
	}

	response := make([]models.UserListResponse, len(users))
	for i, user := range users {
		response[i] = models.UserListResponse{
			ID:        user.Id,
			Name:      user.Name,
			Email:     user.Email,
			IsAdmin:   user.IsAdmin,
			CreatedAt: user.CreatedAt,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"users": response,
		"total": total,
		"page":  page,
	})
}

// GetUser retrieves a specific user by ID (admin only)
func (uc *UserController) GetUser(c *gin.Context) {
	userId := c.Param("userId")

	var user models.User
	if err := uc.Db.First(&user, userId).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.AbortWithStatusJSON(http.StatusNotFound, models.ErrorResponse{
				Error: "user_not_found",
			})
			return
		}
		c.AbortWithStatusJSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "failed_to_retrieve_user",
		})
		return
	}

	c.JSON(http.StatusOK, models.UserListResponse{
		ID:        user.Id,
		Name:      user.Name,
		Email:     user.Email,
		IsAdmin:   user.IsAdmin,
		CreatedAt: user.CreatedAt,
	})
}

// UpdateUser updates user information (admin only)
func (uc *UserController) UpdateUser(c *gin.Context) {
	userId := c.Param("userId")

	var req models.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "validation_failed",
			Fields: map[string]string{
				"details": err.Error(),
			},
		})
		return
	}

	var user models.User
	if err := uc.Db.First(&user, userId).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.AbortWithStatusJSON(http.StatusNotFound, models.ErrorResponse{
				Error: "user_not_found",
			})
			return
		}
		c.AbortWithStatusJSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "failed_to_retrieve_user",
		})
		return
	}

	// Update fields if provided
	if req.Name != "" {
		user.Name = req.Name
	}
	if req.Email != "" {
		// Check if email is already taken by another user
		var existingUser models.User
		if err := uc.Db.Where("email = ? AND id != ?", req.Email, userId).First(&existingUser).Error; err == nil {
			c.AbortWithStatusJSON(http.StatusConflict, models.ErrorResponse{
				Error: "email_already_exists",
			})
			return
		}
		user.Email = req.Email
	}
	if req.Password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), 14)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, models.ErrorResponse{
				Error: "failed_to_hash_password",
			})
			return
		}
		user.Password = hashedPassword
	}
	if req.IsAdmin != nil {
		user.IsAdmin = *req.IsAdmin
	}

	if err := uc.Db.Save(&user).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "failed_to_update_user",
		})
		return
	}

	// Log admin action
	adminId, _ := c.Get("userId")
	log.Printf("Admin %v updated user %d (%s)", adminId, user.Id, user.Email)

	c.JSON(http.StatusOK, models.UserListResponse{
		ID:        user.Id,
		Name:      user.Name,
		Email:     user.Email,
		IsAdmin:   user.IsAdmin,
		CreatedAt: user.CreatedAt,
	})
}

// DeleteUser soft deletes a user (admin only)
func (uc *UserController) DeleteUser(c *gin.Context) {
	userId := c.Param("userId")

	var user models.User
	if err := uc.Db.First(&user, userId).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.AbortWithStatusJSON(http.StatusNotFound, models.ErrorResponse{
				Error: "user_not_found",
			})
			return
		}
		c.AbortWithStatusJSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "failed_to_retrieve_user",
		})
		return
	}

	// Soft delete
	if err := uc.Db.Delete(&user).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "failed_to_delete_user",
		})
		return
	}

	// Log admin action
	adminId, _ := c.Get("userId")
	log.Printf("Admin %v deleted user %d (%s)", adminId, user.Id, user.Email)

	c.JSON(http.StatusOK, gin.H{
		"message": "User deleted successfully",
	})
}

// UpdateUserPassword updates a user's password (admin only)
func (uc *UserController) UpdateUserPassword(c *gin.Context) {
	userId := c.Param("userId")

	var req models.UpdateUserPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "validation_failed",
			Fields: map[string]string{
				"details": err.Error(),
			},
		})
		return
	}

	var user models.User
	if err := uc.Db.First(&user, userId).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.AbortWithStatusJSON(http.StatusNotFound, models.ErrorResponse{
				Error: "user_not_found",
			})
			return
		}
		c.AbortWithStatusJSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "failed_to_retrieve_user",
		})
		return
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), 14)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "failed_to_hash_password",
		})
		return
	}
	user.Password = hashedPassword

	if err := uc.Db.Save(&user).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "failed_to_update_password",
		})
		return
	}

	// Log admin action
	adminId, _ := c.Get("userId")
	log.Printf("Admin %v updated password for user %d (%s)", adminId, user.Id, user.Email)

	c.JSON(http.StatusOK, gin.H{
		"message": "Password updated successfully",
	})
}

// RestoreUser restores a soft-deleted user (admin only)
func (uc *UserController) RestoreUser(c *gin.Context) {
	userId := c.Param("userId")

	var user models.User
	// Use Unscoped to find soft-deleted users
	if err := uc.Db.Unscoped().First(&user, userId).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.AbortWithStatusJSON(http.StatusNotFound, models.ErrorResponse{
				Error: "user_not_found",
			})
			return
		}
		c.AbortWithStatusJSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "failed_to_retrieve_user",
		})
		return
	}

	// Check if user is actually deleted
	if !user.DeletedAt.Valid {
		c.AbortWithStatusJSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "user_not_deleted",
		})
		return
	}

	// Restore user by setting DeletedAt to null
	if err := uc.Db.Unscoped().Model(&user).Update("deleted_at", nil).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "failed_to_restore_user",
		})
		return
	}

	// Log admin action
	adminId, _ := c.Get("userId")
	log.Printf("Admin %v restored user %d (%s)", adminId, user.Id, user.Email)

	c.JSON(http.StatusOK, gin.H{
		"message": "User restored successfully",
		"user": models.UserListResponse{
			ID:        user.Id,
			Name:      user.Name,
			Email:     user.Email,
			IsAdmin:   user.IsAdmin,
			CreatedAt: user.CreatedAt,
		},
	})
}

// SearchUsers searches users by name or email (admin only)
func (uc *UserController) SearchUsers(c *gin.Context) {
	var req models.UserSearchRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "validation_failed",
			Fields: map[string]string{
				"details": err.Error(),
			},
		})
		return
	}

	if req.Query == "" {
		c.AbortWithStatusJSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "search_query_required",
		})
		return
	}

	var users []models.User
	var total int64
	dbQuery := uc.Db.Model(&models.User{})

	if req.IncludeDeleted {
		dbQuery = dbQuery.Unscoped()
	}

	// Search by name or email (case-insensitive)
	searchPattern := "%" + req.Query + "%"
	dbQuery = dbQuery.Where("LOWER(name) LIKE LOWER(?) OR LOWER(email) LIKE LOWER(?)", searchPattern, searchPattern)

	// Filter by admin status if specified
	if req.IsAdmin == "true" {
		dbQuery = dbQuery.Where("is_admin = ?", true)
	} else if req.IsAdmin == "false" {
		dbQuery = dbQuery.Where("is_admin = ?", false)
	}

	// Count total matching
	dbQuery.Count(&total)

	// Apply pagination
	offset := req.GetOffset()
	limit := req.GetLimit()

	if err := dbQuery.Offset(offset).Limit(limit).Find(&users).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "failed_to_search_users",
		})
		return
	}

	response := make([]models.UserListResponse, len(users))
	for i, user := range users {
		response[i] = models.UserListResponse{
			ID:        user.Id,
			Name:      user.Name,
			Email:     user.Email,
			IsAdmin:   user.IsAdmin,
			CreatedAt: user.CreatedAt,
		}
	}

	c.JSON(http.StatusOK, models.NewPaginatedResponse(response, total, req.Page, limit))
}

// GetUserStats returns user statistics (admin only)
func (uc *UserController) GetUserStats(c *gin.Context) {
	var totalUsers int64
	var totalAdmins int64
	var deletedUsers int64

	uc.Db.Model(&models.User{}).Count(&totalUsers)
	uc.Db.Model(&models.User{}).Where("is_admin = ?", true).Count(&totalAdmins)
	uc.Db.Unscoped().Model(&models.User{}).Where("deleted_at IS NOT NULL").Count(&deletedUsers)

	c.JSON(http.StatusOK, gin.H{
		"total_users":   totalUsers,
		"total_admins":  totalAdmins,
		"deleted_users": deletedUsers,
		"active_users":  totalUsers,
	})
}
