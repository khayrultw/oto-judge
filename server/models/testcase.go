package models

type TestCase struct {
	Input  string `json:"input"`
	Output string `json:"output"`
}

type TestCaseFile struct {
	TimeLimit   float64    `json:"time_limit"`
	MemoryLimit int        `json:"memory_limit"`
	TestCases   []TestCase `json:"test_cases"`
}
