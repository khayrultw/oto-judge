package judge

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/khayrultw/go-judge/models"
)

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
		FilePath: stdout.String(),
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
		return models.Result{Status: "ERROR", Message: "Test Case File Error"}
	}

	testCases := strings.Split(string(content), "#TEST_CASE_SEP#")

	for idx, tc := range testCases {
		tc = strings.TrimSpace(tc)
		if tc == "" {
			continue
		}
		parts := strings.Split(tc, "#IN_OUT_SEP#")
		if len(parts) != 2 {
			return models.Result{Status: "FAIL", Message: fmt.Sprintf("Test case %d: Invalid format", idx+1)}
		}
		input := strings.TrimSpace(parts[0])
		expectedOutput := strings.TrimSpace(parts[1])

		inputFile, err := GetTestCaseFile(input)
		defer os.Remove(inputFile.Name())
		if err != nil {
			return models.Result{Status: "ERROR", Message: "Failed to create input file"}
		}

		inputFilePath, err := filepath.Abs(inputFile.Name())
		if err != nil {
			return models.Result{Status: "ERROR", Message: "Failed to get input file path"}
		}

		cmd := exec.Command("judge/run.sh", result.FilePath, inputFilePath, lang)
		var stdout, stderr bytes.Buffer
		cmd.Stdout = &stdout
		cmd.Stderr = &stderr
		err = cmd.Run()
		if err != nil {
			return prepareErrorMessage(err, stderr.String(), idx)
		}

		actualOutput := strings.TrimSpace(stdout.String())

		if actualOutput != expectedOutput {
			htmlMsg := fmt.Sprintf(
				"Failed on Test Case %d\n\nInput:\n```text\n%s\n```\n\nOutput:\n```text\n%s\n```\n\nExpected:\n```text\n%s\n```",
				idx+1,
				input,
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
		msg := fmt.Sprintf("Exit Code: %v", exitErr.ExitCode())
		return models.Result{Status: msg, Message: errorOut}
	}
	msg := fmt.Sprintf("Execution Error on test %v", testNumber+1)
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
