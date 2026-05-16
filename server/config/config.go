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
	AppPort    string
	PublicDir  string
}

var envConfig Config

func LoadConfig() error {
	if err := godotenv.Load(); err != nil {
		log.Print(".env file not found, using process environment")
	}

	envConfig = Config{
		DBHost:     os.Getenv("DB_HOST"),
		DBPort:     os.Getenv("DB_PORT"),
		DBUser:     os.Getenv("DB_USERNAME"),
		DBPassword: os.Getenv("DB_PASS"),
		DBName:     os.Getenv("DB_NAME"),
		JWTSecret:  os.Getenv("JWT_SECRET"),
		AppPort:    getEnvOrDefault("APP_PORT", "8080"),
		PublicDir:  getEnvOrDefault("PUBLIC_DIR", "./public"),
	}

	if envConfig.DBHost == "" || envConfig.DBPort == "" || envConfig.DBUser == "" || envConfig.DBPassword == "" || envConfig.DBName == "" || envConfig.JWTSecret == "" {
		log.Fatal("Missing required environment variables. Please check your .env file.")
		return fmt.Errorf("missing required environment variables")
	}
	return nil
}

func GetConfig() Config {
	return envConfig
}

func getEnvOrDefault(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}
