package controllers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/khayrultw/go-judge/database"
	"github.com/khayrultw/go-judge/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type ResetController struct {
	Db *gorm.DB
}

func NewResetController() *ResetController {
	return &ResetController{Db: database.Db}
}

func (rc *ResetController) RequestReset(c *gin.Context) {
	var req models.RequestResetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "validation_failed"})
		return
	}

	// Always return the same message to prevent user enumeration
	genericMsg := gin.H{"message": "If that email exists, a reset token has been created. Contact an admin to retrieve it."}

	var user models.User
	if err := rc.Db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusOK, genericMsg)
		return
	}

	// Delete any existing tokens for this user (lazy cleanup)
	rc.Db.Where("user_id = ?", user.Id).Delete(&models.PasswordResetToken{})

	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed_to_generate_token"})
		return
	}

	resetToken := models.PasswordResetToken{
		UserId:    user.Id,
		Token:     hex.EncodeToString(b),
		ExpiresAt: time.Now().UTC().Add(24 * time.Hour),
	}

	if err := rc.Db.Create(&resetToken).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed_to_create_token"})
		return
	}

	c.JSON(http.StatusOK, genericMsg)
}

func (rc *ResetController) ResetPassword(c *gin.Context) {
	var req models.ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "validation_failed"})
		return
	}

	var resetToken models.PasswordResetToken
	err := rc.Db.Preload("User").
		Where("token = ? AND expires_at > ?", req.Token, time.Now().UTC()).
		First(&resetToken).Error
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid_or_expired_token"})
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), 14)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed_to_hash_password"})
		return
	}

	resetToken.User.Password = hashed
	if err := rc.Db.Save(&resetToken.User).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed_to_update_password"})
		return
	}

	// Delete token after use so it cannot be reused
	rc.Db.Delete(&resetToken)

	c.JSON(http.StatusOK, gin.H{"message": "Password reset successfully. You can now log in."})
}

func (rc *ResetController) ChangePassword(c *gin.Context) {
	var req models.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "validation_failed"})
		return
	}

	userId, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized"})
		return
	}

	var user models.User
	if err := rc.Db.First(&user, userId).Error; err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "user_not_found"})
		return
	}

	if err := bcrypt.CompareHashAndPassword(user.Password, []byte(req.CurrentPassword)); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "incorrect_current_password"})
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), 14)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed_to_hash_password"})
		return
	}

	user.Password = hashed
	if err := rc.Db.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed_to_update_password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password changed successfully."})
}

func (rc *ResetController) ListResetTokens(c *gin.Context) {
	type TokenResponse struct {
		Id        uint      `json:"id"`
		UserId    uint      `json:"user_id"`
		UserName  string    `json:"user_name"`
		UserEmail string    `json:"user_email"`
		Token     string    `json:"token"`
		ExpiresAt time.Time `json:"expires_at"`
	}

	var tokens []models.PasswordResetToken
	rc.Db.Preload("User").Where("expires_at > ?", time.Now().UTC()).Find(&tokens)

	result := make([]TokenResponse, 0, len(tokens))
	for _, t := range tokens {
		result = append(result, TokenResponse{
			Id:        t.Id,
			UserId:    t.UserId,
			UserName:  t.User.Name,
			UserEmail: t.User.Email,
			Token:     t.Token,
			ExpiresAt: t.ExpiresAt,
		})
	}

	c.JSON(http.StatusOK, result)
}

func (rc *ResetController) RevokeResetToken(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid_id"})
		return
	}

	if err := rc.Db.Delete(&models.PasswordResetToken{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed_to_revoke_token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Token revoked."})
}
