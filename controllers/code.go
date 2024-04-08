package controllers

import (
	"fmt"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/khayrultw/go-judge/database"
	"github.com/khayrultw/go-judge/judge"
	"github.com/khayrultw/go-judge/models"
	"gorm.io/gorm"
)

type CodeController struct {
	Db *gorm.DB
}

func NewCodeController() *CodeController {
	db := database.Db
	return &CodeController{Db: db}
}

func (codeController *CodeController) PostCode(c *gin.Context) {
	var code models.Code
	c.BindJSON(&code)
	path := "u" + strconv.FormatUint(uint64(code.UserId), 10) + "_"
	path += strconv.FormatInt(time.Now().UnixNano(), 32) + "." + code.Language
	sourceCode := code.SourceCode
	code.SourceCode = path

	err := codeController.Db.Create(&code).Error
	fmt.Println(path)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err})
		return
	}

	go func() {
		pwd, derr := os.Getwd()
		if derr != nil {
			fmt.Println(derr.Error())
			return
		}

		file, err := os.Create(pwd + "/store/" + path)
		if err != nil {
			fmt.Println(err.Error())
			return
		}
		defer file.Close()

		file.WriteString(sourceCode)
		defer judge.RunTest(database.Db, code)
	}()

	c.JSON(http.StatusOK, code)
}

func (codeController *CodeController) GetCode(c *gin.Context) {
	var code models.Code
	id, _ := strconv.Atoi(c.Param("id"))
	err := codeController.Db.Where("id = ?", id).First(&code).Error
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err})
		return
	}

	go func() {
		pwd, _ := os.Getwd()
		body, err := os.ReadFile(pwd + code.SourceCode)
		if err != nil {
			return
		}
		fmt.Println(string(body))
	}()
	c.JSON(http.StatusOK, code)
}
