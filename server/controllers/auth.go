package controllers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/khayrultw/go-judge/config"
	"github.com/khayrultw/go-judge/database"
	"github.com/khayrultw/go-judge/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthController struct {
	Db *gorm.DB
}

func (authController *AuthController) Update(c *gin.Context) {
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

	// This endpoint needs userId from context or email in request
	// For simplicity, assuming email is required in the request
	if req.Email == "" {
		c.AbortWithStatusJSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "email_required",
		})
		return
	}

	var user models.User
	if err := authController.Db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusNotFound, models.ErrorResponse{
			Error: "user_not_found",
		})
		return
	}

	// Update fields if provided
	if req.Name != "" {
		user.Name = req.Name
	}
	if req.Password != "" {
		password, _ := bcrypt.GenerateFromPassword([]byte(req.Password), 14)
		user.Password = password
	}

	if err := authController.Db.Save(&user).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "failed_to_update_user",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "User updated successfully",
	})
}

func (authController *AuthController) Register(c *gin.Context) {
	var req models.RegisterRequest

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
	if err := authController.Db.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		c.AbortWithStatusJSON(http.StatusConflict, models.ErrorResponse{
			Error: "email_already_exists",
		})
		return
	}

	password, _ := bcrypt.GenerateFromPassword([]byte(req.Password), 14)
	user := models.User{
		Name:     req.Name,
		Email:    req.Email,
		Password: password,
		IsAdmin:  false, // Regular registration always creates non-admin users
	}

	if err := authController.Db.Create(&user).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "failed_to_create_user",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "User created successfully",
		"user_id": user.Id,
	})
}

// --- Replace Login to return token in JSON, not set cookie ---
func (authController *AuthController) Login(c *gin.Context) {
	var req models.LoginRequest

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

	if err := authController.Db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error: "user_not_found",
		})
		return
	}

	err := bcrypt.CompareHashAndPassword(user.Password, []byte(req.Password))

	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "incorrect_password",
		})
		return
	}

	role := "user"
	if user.IsAdmin {
		role = "admin"
	}

	token, jwtCreationError := createJWT(user.Id, role)

	if jwtCreationError != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "failed_to_create_token",
		})
		return
	}

	setAuthCookie(c, token)

	c.JSON(http.StatusOK, models.LoginResponse{
		ID:    user.Id,
		Name:  user.Name,
		Email: user.Email,
		Role:  role,
		Token: token,
	})
}

func NewAuthController() *AuthController {
	db := database.Db
	return &AuthController{Db: db}
}

func createJWT(userId uint, role string) (string, error) {
	token := jwt.New(jwt.SigningMethodHS256)
	claims := token.Claims.(jwt.MapClaims)
	claims["exp"] = time.Now().UTC().Add(24 * time.Hour).Unix()
	claims["user_id"] = userId
	claims["role"] = role
	claims["is_admin"] = role == "admin"
	tokenStr, err := token.SignedString([]byte(config.GetConfig().JWTSecret))

	if err != nil {
		fmt.Print(err.Error())
		return "", err
	}

	return tokenStr, nil
}

func (authController *AuthController) Logout(c *gin.Context) {
	clearAuthCookie(c)
	c.JSON(http.StatusOK, gin.H{"msg": "Logout (client should discard token)"})
}

func (authController *AuthController) GetUser(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists {
		c.AbortWithStatusJSON(http.StatusUnauthorized, models.ErrorResponse{
			Error: "unauthorized",
		})
		return
	}

	var user models.User
	if err := authController.Db.First(&user, userId).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "failed_to_retrieve_user",
		})
		return
	}

	role := "user"
	if user.IsAdmin {
		role = "admin"
	}

	c.JSON(http.StatusOK, models.UserResponse{
		ID:    user.Id,
		Name:  user.Name,
		Email: user.Email,
		Role:  role,
	})
}

func setAuthCookie(c *gin.Context, token string) {
	isSecure := c.Request.TLS != nil || c.GetHeader("X-Forwarded-Proto") == "https"
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("auth_token", token, int((24 * time.Hour).Seconds()), "/", "", isSecure, true)
}

func clearAuthCookie(c *gin.Context) {
	isSecure := c.Request.TLS != nil || c.GetHeader("X-Forwarded-Proto") == "https"
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("auth_token", "", -1, "/", "", isSecure, true)
}
