package models

type User struct {
	Id          uint         `json:"id"`
	Name        string       `json:"name" validate:"required, min=2, max=100" binding:"required"`
	Email       string       `json:"email" validate:"email, required" binding:"required"`
	Password    []byte       `json:"password" validate:"required, min=5, max=20" binding:"required"`
	Submissions []Submission `gorm:"foreignKey:UserId;references:Id" json:"-"`
	IsAdmin     bool         `json:"is_admin" gorm:"default:false"`
	CreatedAt   CustomTime   `json:"created_at" gorm:"autoCreateTime"`
}
