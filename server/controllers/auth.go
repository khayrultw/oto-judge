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
	var data map[string]string

	if err := c.BindJSON(&data); err != nil {
		c.Copy().AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err})
		return
	}

	password, _ := bcrypt.GenerateFromPassword([]byte(data["password"]), 14)
	user := models.User{
		Name:     data["name"],
		Email:    data["email"],
		Password: password,
	}

	var dbuser models.User

	authController.Db.Where("email = ?", user.Email).First(&dbuser)

	// update user if exists
	if dbuser.Email != "" {
		dbuser.Name = user.Name
		dbuser.Password = user.Password
		if err := authController.Db.Save(&dbuser).Error; err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err})
			return
		}
		c.JSON(http.StatusOK, "User Updated Successfully")
		return
	}
}

func (authController *AuthController) Register(c *gin.Context) {
	var data map[string]string

	if err := c.BindJSON(&data); err != nil {
		c.Copy().AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err})
		return
	}

	password, _ := bcrypt.GenerateFromPassword([]byte(data["password"]), 14)
	user := models.User{
		Name:     data["name"],
		Email:    data["email"],
		Password: password,
	}

	var dbuser models.User

	authController.Db.Where("email = ?", user.Email).First(&dbuser)

	if dbuser.Email != "" {
		c.AbortWithStatusJSON(http.StatusConflict, gin.H{"error": "User Already Exist"})
		return
	}

	if err := authController.Db.Create(&user).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err})
		return
	}

	c.JSON(http.StatusCreated, "User Created Successfully")
}

// --- Replace Login to return token in JSON, not set cookie ---
func (authController *AuthController) Login(c *gin.Context) {
	var data map[string]string

	if err := c.BindJSON(&data); err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err})
		return
	}

	fmt.Printf(data["email"])

	var user models.User

	authController.Db.Where("email = ?", data["email"]).First(&user)

	if user.Id == 0 {
		c.JSON(http.StatusNotFound, gin.H{"message": "User not found"})
		return
	}

	err := bcrypt.CompareHashAndPassword(user.Password, []byte(data["password"]))

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Incorrect password"})
		return
	}

	role := "user"
	if user.IsAdmin {
		role = "admin"
	}

	token, jwtCreationError := createJWT(user.Id, role)

	if jwtCreationError != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":    user.Id,
		"name":  user.Name,
		"email": user.Email,
		"role":  role,
		"token": token,
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
	tokenStr, err := token.SignedString([]byte(config.GetConfig().JWTSecret))

	if err != nil {
		fmt.Print(err.Error())
		return "", err
	}

	return tokenStr, nil
}

func (authController *AuthController) Logout(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"msg": "Logout (client should discard token)"})
}

func (authController *AuthController) GetUser(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var user models.User
	if err := authController.Db.First(&user, userId).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user"})
		return
	}

	role := "user"
	if user.IsAdmin {
		role = "admin"
	}

	c.JSON(http.StatusOK, gin.H{
		"id":    user.Id,
		"name":  user.Name,
		"email": user.Email,
		"role":  role,
	})
}
