package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/khayrultw/go-judge/judge"
)

func TestPython(c *gin.Context) {
	status := judge.JudgeCode(`
value = int(input()) 
print(value*2)
	`,
		"store/test_cases/test0.txt",
		"py")
	c.JSON(http.StatusOK, gin.H{
		"message": status,
	})
}

func TestKotlin(c *gin.Context) {
	status := judge.JudgeCode(`package main

fun main(args: Array<String>) {
    var inp = readln().trim().toInt()
    println(inp*2)
}`, "store/test_cases/test0.txt", "kt")
	c.JSON(http.StatusOK, gin.H{
		"message": status,
	})
}
