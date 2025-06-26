package judge

import (
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
	testCases := strings.Split(string(content), "-------")

	for idx, tc := range testCases {
		tc = strings.TrimSpace(tc)
		if tc == "" {
			continue
		}
		parts := strings.Split(tc, "#######")
		if len(parts) != 2 {
			return models.Result{Status: "FAIL", Message: fmt.Sprintf("Test case %d: Invalid format", idx+1)}
		}
		input := strings.TrimSpace(parts[0])
		expectedOutput := strings.TrimSpace(parts[1])

		// Run the judge/test.sh script with source file and input string
		cmd := exec.Command("judge/test.sh", sourceCodeFilePath, input)
		out, _ := cmd.CombinedOutput()
		actualOutput := strings.TrimSpace(string(out))

		// Remove file paths from output for cleaner comparison
		re := regexp.MustCompile(`\b(?:[a-zA-Z]:\\|/)?(?:[\w\-]+[\\/])+[\w\-.]+\b`)
		cleanActual := strings.TrimSpace(re.ReplaceAllString(actualOutput, ""))
		cleanExpected := strings.TrimSpace(re.ReplaceAllString(expectedOutput, ""))

		if cleanActual != cleanExpected {
			htmlMsg := fmt.Sprintf(
				"Failed on Test Case %d\n\nInput:\n**text\n%s\n**\nOutput:\n**text\n%s\n**\nExpected:\n**text\n%s\n**",
				idx+1,
				input,
				cleanActual,
				cleanExpected,
			)
			return models.Result{Status: "FAIL", Message: htmlMsg}
		}
	}

	return models.Result{Status: "PASS", Message: ""}
}
