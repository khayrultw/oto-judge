package models

type Code struct {
	Id            uint   `json:"id"`
	UserId        uint   `json:"user_id" validate:"required" binding:"required"`
	ContestId     uint   `json:"contest_id" validate:"required" binding:"required"`
	SourceCode    string `json:"source_code" validate:"required"`
	Language      string `json:"language" validate:"required"`
	ProblemNumber uint8  `json:"problem_number" validate:"required"`
	Status        string `json:"status"`
}
