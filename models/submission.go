package models

type Submission struct {
	Id         uint       `json:"id"`
	UserId     uint       `json:"user_id" validate:"required"`
	ProblemId  uint       `json:"problem_id" validate:"required"`
	SourceCode string     `json:"source_code" validate:"required" binding:"required"`
	Language   string     `json:"language" validate:"required" binding:"required"`
	Status     string     `json:"status" gorm:"default:pending"` // pending, accepted, wrong answer, runtime error, compilation error
	Message    string     `json:"message"`
	CreatedAt  CustomTime `json:"created_at" gorm:"autoCreateTime"`
}
