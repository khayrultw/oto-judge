package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/khayrultw/go-judge/judge"
)

func TestPython(c *gin.Context) {
	status := judge.JudgeCode("judge/test/test.py", "judge/test/test.txt")
	c.JSON(http.StatusOK, gin.H{
		"message": status,
	})
}

func TestKotlin(c *gin.Context) {
	status := judge.JudgeCode("judge/test/test.kt", "judge/test/test.txt")
	c.JSON(http.StatusOK, gin.H{
		"message": status,
	})
}
