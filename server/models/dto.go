package models

// Auth DTOs
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=5"`
}

type RegisterRequest struct {
	Name     string `json:"name" binding:"required,min=2,max=100"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=5,max=100"`
}

type LoginResponse struct {
	ID    uint   `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"`
	Token string `json:"token"`
}

type UserResponse struct {
	ID    uint   `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

// Admin User DTOs
type CreateUserRequest struct {
	Name     string `json:"name" binding:"required,min=2,max=100"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=5,max=100"`
	IsAdmin  bool   `json:"is_admin"`
}

type UpdateUserRequest struct {
	Name     string `json:"name" binding:"omitempty,min=2,max=100"`
	Email    string `json:"email" binding:"omitempty,email"`
	Password string `json:"password" binding:"omitempty,min=5,max=100"`
	IsAdmin  *bool  `json:"is_admin"`
}

type UpdateUserPasswordRequest struct {
	Password string `json:"password" binding:"required,min=5,max=100"`
}

type RequestResetRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type ResetPasswordRequest struct {
	Token       string `json:"token" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=5,max=100"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=5,max=100"`
}

type UserListResponse struct {
	ID            uint       `json:"id"`
	Name          string     `json:"name"`
	Email         string     `json:"email"`
	IsAdmin       bool       `json:"is_admin"`
	CreatedAt     CustomTime `json:"created_at"`
	DeletedAt     *string    `json:"deleted_at,omitempty"`
	SolvedCount   int        `json:"solved_count"`
	TotalProblems int        `json:"total_problems"`
}

// Contest DTOs
type ContestResponse struct {
	ID        uint       `json:"id"`
	Title     string     `json:"title"`
	StartTime CustomTime `json:"start_time"`
	Duration  int        `json:"duration"`
	Problems  []Problem  `json:"problems,omitempty"`
	CreatedAt CustomTime `json:"created_at"`
}

type ContestMetadataResponse struct {
	ID        uint       `json:"id"`
	Title     string     `json:"title"`
	StartTime CustomTime `json:"start_time"`
	Duration  int        `json:"duration"`
	CreatedAt CustomTime `json:"created_at"`
}

// Problem DTOs
type ProblemResponse struct {
	ID            uint       `json:"id"`
	Title         string     `json:"title"`
	ContestID     uint       `json:"contest_id"`
	Statement     string     `json:"statement"`
	ProblemNumber uint8      `json:"problem_number"`
	IsSpecial     bool       `json:"is_special"`
	CreatedAt     CustomTime `json:"created_at"`
}

type ProblemAdminResponse struct {
	ID            uint       `json:"id"`
	Title         string     `json:"title"`
	ContestID     uint       `json:"contest_id"`
	Statement     string     `json:"statement"`
	TestCasePath  string     `json:"test_case_path"`
	ProblemNumber uint8      `json:"problem_number"`
	IsSpecial     bool       `json:"is_special"`
	CreatedAt     CustomTime `json:"created_at"`
}

type UpdateProblemRequest struct {
	Title        string `json:"title" binding:"omitempty"`
	Statement    string `json:"statement" binding:"omitempty"`
	TestcaseText string `json:"testcase_text" binding:"omitempty"`
	IsSpecial    *bool  `json:"is_special"`
}

type ManualJudgeRequest struct {
	Status  string `json:"status" binding:"required"`
	Message string `json:"message"`
}

// Submission DTOs
type SubmitCodeRequest struct {
	SourceCode string `json:"source_code" binding:"required"`
	Language   string `json:"language" binding:"required,oneof=cpp py kt js java go dart"`
}

type TestRunRequest struct {
	SourceCode     string `json:"source_code" binding:"required"`
	Language       string `json:"language" binding:"required,oneof=cpp py kt js java go dart"`
	Input          string `json:"input"`
	ExpectedOutput string `json:"expected_output"`
}

type TestRunResponse struct {
	Status         string `json:"status"`
	Output         string `json:"output"`
	ExpectedOutput string `json:"expected_output,omitempty"`
	Message        string `json:"message,omitempty"`
	Passed         bool   `json:"passed"`
}

type SubmissionListRequest struct {
	ContestID   uint   `form:"contest_id"`
	UserID      uint   `form:"user_id"`
	Status      string `form:"status"`
	Language    string `form:"language"`
	StartDate   string `form:"start_date"`
	EndDate     string `form:"end_date"`
	DeletedOnly bool   `form:"deleted_only"`
	Page      int    `form:"page"`
	PageSize  int    `form:"page_size"`
}

type SubmissionResponse struct {
	ID         uint       `json:"id"`
	UserID     uint       `json:"user_id"`
	ProblemID  uint       `json:"problem_id"`
	ContestID  uint       `json:"contest_id"`
	Language   string     `json:"language"`
	Status     string     `json:"status"`
	Message    string     `json:"message"`
	CreatedAt  CustomTime `json:"created_at"`
	SourceCode string     `json:"source_code,omitempty"`
}

// Error response
type ErrorResponse struct {
	Error  string            `json:"error"`
	Fields map[string]string `json:"fields,omitempty"`
}

type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// Pagination DTOs
type PaginationRequest struct {
	Page     int `form:"page"`
	PageSize int `form:"page_size"`
}

// GetOffset returns the offset for database query
func (p *PaginationRequest) GetOffset() int {
	if p.Page <= 0 {
		p.Page = 1
	}
	return (p.Page - 1) * p.GetLimit()
}

// GetLimit returns the limit for database query with bounds
func (p *PaginationRequest) GetLimit() int {
	if p.PageSize <= 0 {
		p.PageSize = 20
	}
	if p.PageSize > 100 {
		p.PageSize = 100
	}
	return p.PageSize
}

type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Total      int64       `json:"total"`
	Page       int         `json:"page"`
	PageSize   int         `json:"page_size"`
	TotalPages int         `json:"total_pages"`
}

// NewPaginatedResponse creates a paginated response
func NewPaginatedResponse(data interface{}, total int64, page, pageSize int) PaginatedResponse {
	totalPages := int(total) / pageSize
	if int(total)%pageSize > 0 {
		totalPages++
	}
	return PaginatedResponse{
		Data:       data,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}
}

// Contest list request with pagination
type ContestListRequest struct {
	PaginationRequest
	Status string `form:"status"` // "upcoming", "ongoing", "past", or empty for all
}

// User search request with pagination
type UserSearchRequest struct {
	PaginationRequest
	Query          string `form:"q"`
	IncludeDeleted bool   `form:"include_deleted"`
	DeletedOnly    bool   `form:"deleted_only"`
	IsAdmin        string `form:"is_admin"`
}

// Contest submissions request with pagination
type ContestSubmissionsRequest struct {
	PaginationRequest
	Status   string `form:"status"`
	Language string `form:"language"`
}
