package models

type Submission struct {
	Id         uint       `json:"id"`
	UserId     uint       `json:"user_id" validate:"required"`
	ProblemId  uint       `json:"problem_id" validate:"required"`
	ContestId  uint       `json:"contest_id" validate:"required" binrding:"required"`
	SourceCode string     `json:"source_code" validate:"required" binding:"required"`
	Language   string     `json:"language" validate:"required" binding:"required"`
	Status     string     `json:"status" gorm:"default:pending"` // pending, accepted, wrong answer, runtime error, compilation error
	Message    string     `json:"message"`
	CreatedAt  CustomTime `json:"created_at" gorm:"autoCreateTime"`
}

type SubmissionWithProblem struct {
	ID           uint       `json:"id"`
	UserId       uint       `json:"user_id"`
	UserName     string     `json:"user_name"`
	ProblemId    uint       `json:"problem_id"`
	ProblemTitle string     `json:"problem_title"`
	Language     string     `json:"language"`
	SourceCode   string     `json:"source_code"`
	Status       string     `json:"status"`
	Message    string     `json:"message"`
	CreatedAt    CustomTime `json:"created_at"`
}
