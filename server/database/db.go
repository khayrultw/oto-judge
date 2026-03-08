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

	createIndexes(db)

	fmt.Printf("Database Connected")

	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
		return err
	}
	Db = db
	return nil
}

func createIndexes(db *gorm.DB) {
	indexes := []string{
		"CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)",
		"CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id)",
		"CREATE INDEX IF NOT EXISTS idx_submissions_problem_id ON submissions(problem_id)",
		"CREATE INDEX IF NOT EXISTS idx_submissions_contest_id_created_at ON submissions(contest_id, created_at)",
		"CREATE INDEX IF NOT EXISTS idx_problems_contest_id ON problems(contest_id)",
		"CREATE INDEX IF NOT EXISTS idx_contests_start_time ON contests(start_time)",
	}
	for _, sql := range indexes {
		if err := db.Exec(sql).Error; err != nil {
			log.Printf("Warning: failed to create index: %s — %v", sql, err)
		}
	}
}
