package judge

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"regexp"
	"strings"

	"github.com/khayrultw/go-judge/models"
)

func JudgeCode(sourceCodeFilePath string, testCaseFilePath string) models.Result {
	// Read the test case file
	content, err := os.ReadFile(testCaseFilePath)
	if err != nil {
		return models.Result{Status: "ERROR", Message: "Test Case File Error"}
	}

	// Split test cases by "-------" delimiter
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

		// Run the judge/test.sh script with source file and input string
		cmd := exec.Command("judge/test.sh", sourceCodeFilePath, input)
		var stdout, stderr bytes.Buffer
		cmd.Stdout = &stdout
		cmd.Stderr = &stderr
		err := cmd.Run()
		if err != nil {
			re := regexp.MustCompile(`File\s+.*?[\w\-.]+\.\w+`)
			cleanOut := re.ReplaceAllString(stderr.String(), "")
			if exitErr, ok := err.(*exec.ExitError); ok {
				if exitErr.ExitCode() == 124 {
					return models.Result{Status: "ERROR", Message: "Time Limit Exceeded"}
				}
				if exitErr.ExitCode() == 100 {
					return models.Result{Status: "ERROR", Message: "Syntax Error:\n" + cleanOut}
				}
				return models.Result{Status: "ERROR", Message: "Runtime Error:\n" + cleanOut}
			}
			return models.Result{Status: "ERROR", Message: "Execution Error:\n" + err.Error()}
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
