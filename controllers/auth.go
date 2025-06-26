package controllers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/khayrultw/go-judge/database"
	"github.com/khayrultw/go-judge/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var SECRET = []byte("secret_token_should_change")

type AuthController struct {
	Db *gorm.DB
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

func (authController *AuthController) Login(c *gin.Context) {

	fmt.Println("Hello Login")
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

	token, jwtCreationError := createJWT(user.Email, user.Id)

	if jwtCreationError != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err})
		return
	}

	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("Authorization", token, 86400, "", "", false, true)

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

func NewAuthController() *AuthController {
	db := database.Db
	return &AuthController{Db: db}
}

func createJWT(email string, userId uint) (string, error) {
	token := jwt.New(jwt.SigningMethodHS256)
	claims := token.Claims.(jwt.MapClaims)
	claims["exp"] = time.Now().Add(time.Hour).Unix()
	claims["user_id"] = userId
	claims["email"] = email
	tokenStr, err := token.SignedString(SECRET)

	if err != nil {
		fmt.Print(err.Error())
		return "", err
	}

	return tokenStr, nil
}

func (authController *AuthController) Logout(c *gin.Context) {
	c.SetCookie(
		"Authorization",
		"",
		-1,
		"",
		"",
		false,
		true,
	)

	c.JSON(http.StatusOK, gin.H{"msg": "Logout"})
}

func ValidateJWT(next func(w http.ResponseWriter, r *http.Request)) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header["Token"] != nil {
			token, err := jwt.Parse(r.Header["Token"][0], func(t *jwt.Token) (interface{}, error) {
				_, ok := t.Method.(*jwt.SigningMethodHMAC)
				if !ok {
					w.WriteHeader(http.StatusUnauthorized)
					w.Write([]byte("not authorized"))
				}
				return SECRET, nil
			})

			if err != nil {
				w.WriteHeader(http.StatusUnauthorized)
				w.Write([]byte("not authorized:" + err.Error()))
			}

			if token.Valid {
				next(w, r)
			}
		} else {
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte("not authorized"))
		}
	})
}

// create an /me route that returns the current user information
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
