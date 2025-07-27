package judge

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
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

		cmd := exec.Command("judge/run.sh", result.FilePath, input, lang)
		var stdout, stderr bytes.Buffer
		cmd.Stdout = &stdout
		cmd.Stderr = &stderr
		err := cmd.Run()
		if err != nil {
			cleanOut := stderr.String()
			if len(cleanOut) > 200 {
				cleanOut = cleanOut[:200] + "..."
			}
			if exitErr, ok := err.(*exec.ExitError); ok {
				if exitErr.ExitCode() == 124 {
					return models.Result{Status: "Time Limit Exceeded", Message: ""}
				}
				if exitErr.ExitCode() == 137 {
					return models.Result{Status: "Memory Limit Exceeded", Message: cleanOut}
				}
				return models.Result{Status: "Runtime Error", Message: cleanOut}
			}
			return models.Result{Status: "Execution Error", Message: err.Error()}
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
