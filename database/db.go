package database

import (
	"fmt"

	"github.com/khayrultw/go-judge/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

const DB_USERNAME = "postgres"
const DB_PASSWORD = "#R0r0n0a"
const DB_NAME = "contests"
const DB_HOST = "127.0.0.1"
const DB_PORT = "5432"

var Db *gorm.DB

func InitDb() {
	Db = connectDB()
}

func connectDB() *gorm.DB {
	var err error
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC", DB_HOST, DB_USERNAME, DB_PASSWORD, DB_NAME, DB_PORT)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})

	db.AutoMigrate(
		&models.User{},
		&models.Contest{},
		&models.Problem{},
		&models.Submission{},
	)

	fmt.Printf("Connected")

	if err != nil {
		panic(err)
	}

	return db
}
