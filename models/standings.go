package models

type ProblemAttempt struct {
	ProblemNumber uint8  `json:"problem_number"`
	Status        string `json:"status"`
	Count         int    `json:"count"`
}

type UserStanding struct {
	Rank     int              `json:"rank"`
	UserId   uint             `json:"user_id"`
	UserName string           `json:"user_name"`
	Solved   int              `json:"solved"`
	Penalty  int              `json:"penalty"`
	Problems []ProblemAttempt `json:"problems"`
}
