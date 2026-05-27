package models

import "time"

type PasswordResetToken struct {
	Id        uint       `json:"id"`
	UserId    uint       `json:"user_id"`
	User      User       `json:"user" gorm:"foreignKey:UserId"`
	Token     string     `json:"token" gorm:"uniqueIndex"`
	ExpiresAt time.Time  `json:"expires_at"`
	CreatedAt CustomTime `json:"created_at" gorm:"autoCreateTime"`
}
