package judge

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/khayrultw/go-judge/models"
)

// ParseTestCases parses a testcase file supporting both:
// 1. Wrapper object: {"test_cases": [...], "time_limit": 5, "memory_limit": 256}
// 2. Flat array: [{"input": "...", "output": "..."}]
func ParseTestCases(content []byte) (*models.TestCaseFile, error) {
	// Try wrapper object first
	var wrapper models.TestCaseFile
	if err := json.Unmarshal(content, &wrapper); err == nil && len(wrapper.TestCases) > 0 {
		return &wrapper, nil
	}

	// Fall back to flat array
	var flat []models.TestCase
	if err := json.Unmarshal(content, &flat); err != nil {
		return nil, fmt.Errorf("invalid test case format")
	}

	return &models.TestCaseFile{TestCases: flat}, nil
}

type CompileResult struct {
	FilePath string
	Stderr   string
}

func CompileCode(sourceCode, lang string) (*CompileResult, error) {
	cmd := exec.Command("judge/compile.sh", sourceCode, lang)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()

	return &CompileResult{
		FilePath: strings.TrimSpace(stdout.String()),
		Stderr:   stderr.String(),
	}, err
}

func JudgeCode(sourceCode string, testCaseFilePath string, lang string) models.Result {

	result, err := CompileCode(sourceCode, lang)
	if err != nil {
		return models.Result{
			Status:  "Syntax Error",
			Message: result.Stderr,
		}
	}

	defer func() {
		err := os.Remove(result.FilePath)
		if err != nil {
			fmt.Println("Failed to remove:", err)
		}
	}()

	content, err := os.ReadFile(testCaseFilePath)
	if err != nil {
		fmt.Printf("err: %v\n", err)
		return models.Result{Status: "ERROR", Message: "Test Case File Error"}
	}

	tcFile, err := ParseTestCases(content)
	if err != nil {
		return models.Result{Status: "ERROR", Message: "Invalid test case format"}
	}

	// Build run.sh args with optional time/memory limits from metadata
	runArgs := []string{result.FilePath, "" /* placeholder for inputFilePath */, lang}
	if tcFile.TimeLimit > 0 {
		runArgs = append(runArgs, strconv.FormatFloat(tcFile.TimeLimit, 'f', -1, 64))
		if tcFile.MemoryLimit > 0 {
			runArgs = append(runArgs, strconv.Itoa(tcFile.MemoryLimit))
		}
	}

	for idx, tc := range tcFile.TestCases {
		input := strings.TrimSpace(tc.Input)
		expectedOutput := strings.TrimSpace(tc.Output)

		inputFile, err := GetTestCaseFile(input)
		defer os.Remove(inputFile.Name())
		if err != nil {
			return models.Result{Status: "ERROR", Message: "Failed to create input file"}
		}

		inputFilePath, err := filepath.Abs(inputFile.Name())
		if err != nil {
			return models.Result{Status: "ERROR", Message: "Failed to get input file path"}
		}

		// Fill in the inputFilePath placeholder
		args := make([]string, len(runArgs))
		copy(args, runArgs)
		args[1] = inputFilePath

		cmd := exec.Command("judge/run.sh", args...)
		var stdout, stderr bytes.Buffer
		cmd.Stdout = &stdout
		cmd.Stderr = &stderr
		err = cmd.Run()
		if err != nil {
			return prepareErrorMessage(err, stderr.String(), idx)
		}

		actualOutput := strings.TrimSpace(stdout.String())

		if normalize(actualOutput) != normalize(expectedOutput) {
			inputPreview := input
			if len(input) > 200 {
				inputPreview = input[:200] + "..."
			}

			htmlMsg := fmt.Sprintf(
				"Failed on Test Case %d\n\nInput:\n```text\n%s\n```\n\nOutput:\n```text\n%s\n```\n\nExpected:\n```text\n%s\n```",
				idx+1,
				inputPreview,
				actualOutput,
				expectedOutput,
			)
			return models.Result{Status: "FAIL", Message: htmlMsg}
		}
	}

	return models.Result{Status: "PASS", Message: ""}
}

func prepareErrorMessage(err error, errorOut string, testNumber int) models.Result {
	if len(errorOut) > 200 {
		errorOut = errorOut[:200] + "..."
	}
	if exitErr, ok := err.(*exec.ExitError); ok {
		if exitErr.ExitCode() == 124 {
			msg := fmt.Sprintf("Time Limit Exceeded on Test Case %d", testNumber+1)
			return models.Result{Status: msg, Message: ""}
		}
		if exitErr.ExitCode() == 137 {
			msg := fmt.Sprintf("Memory Limit Exceeded on Test Case %d", testNumber+1)
			return models.Result{Status: msg, Message: errorOut}
		}
		msg := fmt.Sprintf("Runtime Error on Test Case %d", testNumber+1)
		return models.Result{Status: msg, Message: errorOut}
	}
	msg := fmt.Sprintf("Execution Error on test %d", testNumber+1)
	return models.Result{Status: msg, Message: err.Error()}
}

func GetTestCaseFile(input string) (*os.File, error) {
	inputFile, err := os.CreateTemp("", "input*.txt")
	//get the absolute path of the input file
	if err != nil {
		return nil, fmt.Errorf("failed to create input file")
	}
	_, err = inputFile.WriteString(input)
	if err != nil {
		return nil, fmt.Errorf("failed to write input to file")
	}
	err = inputFile.Close()
	if err != nil {
		return nil, fmt.Errorf("failed to close input file")
	}
	return inputFile, nil
}

func normalize(s string) string {
	var b strings.Builder
	for _, r := range s {
		if r >= 32 && r <= 126 {
			b.WriteRune(r)
		}
	}
	return strings.TrimSpace(b.String())
}

// RunCustomTest runs code against a custom test case input and expected output
func RunCustomTest(sourceCode, lang, input, expectedOutput string) models.TestRunResponse {
	result, err := CompileCode(sourceCode, lang)
	if err != nil {
		return models.TestRunResponse{
			Status:  "Syntax Error",
			Output:  "",
			Message: result.Stderr,
			Passed:  false,
		}
	}

	defer func() {
		err := os.Remove(result.FilePath)
		if err != nil {
			fmt.Println("Failed to remove:", err)
		}
	}()

	inputFile, err := GetTestCaseFile(input)
	if err != nil {
		return models.TestRunResponse{
			Status:  "ERROR",
			Output:  "",
			Message: "Failed to create input file",
			Passed:  false,
		}
	}
	defer os.Remove(inputFile.Name())

	inputFilePath, err := filepath.Abs(inputFile.Name())
	if err != nil {
		return models.TestRunResponse{
			Status:  "ERROR",
			Output:  "",
			Message: "Failed to get input file path",
			Passed:  false,
		}
	}

	cmd := exec.Command("judge/run.sh", result.FilePath, inputFilePath, lang)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	err = cmd.Run()
	if err != nil {
		errResult := prepareErrorMessage(err, stderr.String(), 0)
		return models.TestRunResponse{
			Status:  errResult.Status,
			Output:  strings.TrimSpace(stdout.String()),
			Message: errResult.Message,
			Passed:  false,
		}
	}

	actualOutput := strings.TrimSpace(stdout.String())

	// If expected output is provided, compare
	if expectedOutput != "" {
		expectedOutput = strings.TrimSpace(expectedOutput)
		if normalize(actualOutput) == normalize(expectedOutput) {
			return models.TestRunResponse{
				Status:         "PASS",
				Output:         actualOutput,
				ExpectedOutput: expectedOutput,
				Message:        "Test passed!",
				Passed:         true,
			}
		}
		return models.TestRunResponse{
			Status:         "FAIL",
			Output:         actualOutput,
			ExpectedOutput: expectedOutput,
			Message:        "Output doesn't match expected output",
			Passed:         false,
		}
	}

	// No expected output provided, just return the actual output
	return models.TestRunResponse{
		Status:  "EXECUTED",
		Output:  actualOutput,
		Message: "Code executed successfully",
		Passed:  true,
	}
}
