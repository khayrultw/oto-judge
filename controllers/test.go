package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/khayrultw/go-judge/judge"
)

func TestPython(c *gin.Context) {
	status := judge.JudgeCode("store/solutions/test.py", "store/test_cases/test0.txt")
	c.JSON(http.StatusOK, gin.H{
		"message": status,
	})
}

func TestKotlin(c *gin.Context) {
	status := judge.JudgeCode("store/solutions/test.kt", "store/test_cases/test0.txt")
	c.JSON(http.StatusOK, gin.H{
		"message": status,
	})
}
