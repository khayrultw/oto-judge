package models

type Contest struct {
	Id        uint       `json:"id"`
	Title     string     `json:"title" validate:"required" binding:"required"`
	StartTime CustomTime `json:"start_time" validate:"required" binding:"required"` 
	Duration  int        `json:"duration" validate:"required" binding:"required"`   
	Problems  []Problem  `gorm:"foreignKey:ContestId;references:Id" json:"problems"`
	CreatedAt  CustomTime `json:"created_at" gorm:"autoCreateTime"`
}
