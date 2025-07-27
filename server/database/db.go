package database

import (
	"fmt"
	"log"

	"github.com/khayrultw/go-judge/config"
	"github.com/khayrultw/go-judge/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var Db *gorm.DB

func InitDb() error {
	var err error
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC",
		config.GetConfig().DBHost,
		config.GetConfig().DBUser,
		config.GetConfig().DBPassword,
		config.GetConfig().DBName,
		config.GetConfig().DBPort,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})

	db.AutoMigrate(
		&models.User{},
		&models.Contest{},
		&models.Problem{},
		&models.Submission{},
	)

	fmt.Printf("Database Connected")

	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
		return err
	}
	Db = db
	return nil
}
