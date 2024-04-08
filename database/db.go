package database

import (
	"fmt"

	"github.com/khayrultw/go-judge/models"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

const DB_USERNAME = "root"
const DB_PASSWORD = "R0r0n0a_z0r0"
const DB_NAME = "qaz_gkh"
const DB_HOST = "127.0.0.1"
const DB_PORT = "3306"

var Db *gorm.DB

func InitDb() {
	Db = connectDB()
}

func connectDB() *gorm.DB {
	var err error
	dsn := DB_USERNAME + ":" + DB_PASSWORD + "@tcp(" + DB_HOST + ":" + DB_PORT + ")/" + DB_NAME + "?parseTime=true&loc=Local"
	fmt.Println("dsn: ", dsn)

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	db.AutoMigrate(&models.Code{})
	db.AutoMigrate(&models.User{})

	fmt.Printf("Connected")

	if err != nil {
		panic(err)
	}

	return db
}
