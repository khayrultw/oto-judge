package models

type Problem struct {
	Id            uint         `json:"id"`
	Title         string       `json:"title" validate:"required" binding:"required"`
	ContestId     uint         `json:"contest_id" validate:"required" binding:"required"`
	Statement     string       `json:"statement" validate:"required" binding:"required"`
	TestCasePath  string       `json:"test_case_path" validate:"required" binding:"required"`
	ProblemNumber uint8        `json:"problem_number" validate:"required" binding:"required"`
	Submissions   []Submission `gorm:"foreignKey:ProblemId;references:Id" json:"-"`
	CreatedAt     CustomTime   `json:"created_at" gorm:"autoCreateTime"`
}
