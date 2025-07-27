package config

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	JWTSecret  string
}

var envConfig Config

func LoadConfig() error {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Make sure you have a .env file in the root directory")
	}

	envConfig = Config{
		DBHost:     os.Getenv("DB_HOST"),
		DBPort:     os.Getenv("DB_PORT"),
		DBUser:     os.Getenv("DB_USERNAME"),
		DBPassword: os.Getenv("DB_PASS"),
		DBName:     os.Getenv("DB_NAME"),
		JWTSecret:  os.Getenv("JWT_SECRET"),
	}

	fmt.Printf("Config Loaded: %+v\n", envConfig)

	if envConfig.DBHost == "" || envConfig.DBPort == "" || envConfig.DBUser == "" || envConfig.DBPassword == "" || envConfig.DBName == "" {
		log.Fatal("Missing required environment variables. Please check your .env file.")
		return err
	}
	return nil
}

func GetConfig() Config {
	return envConfig
}
