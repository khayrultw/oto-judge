package models

type User struct {
	Id       uint   `json:"id"`
	Name     string `json:"name" validate:"required, min=2, max=100"`
	Email    string `json:"email" validate:"email, required"`
	Password []byte `json:"password" validate:"required, min=5, max=20"`
}
