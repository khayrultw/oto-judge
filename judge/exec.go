package judge

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

func JudgeCode(sourceCodeFilePath string, testCaseFilePath string) string {
	println(testCaseFilePath)
	text, err := os.ReadFile(testCaseFilePath)
	if err != nil {
		return err.Error()
	}

	cases := strings.Split(string(text), "######\n")

	for i := 0; i < len(cases); i++ {
		test := strings.Split(cases[0], "###\n")
		out, err := runCode(test[0], sourceCodeFilePath)
		if err != nil {
			return err.Error()
		}
		fmt.Println(test[1])
		fmt.Println(out)
		if out != test[1] {
			return returnWrong(test[0], test[1], out)
		}
	}

	return "Accepted"

}

func returnWrong(input string, expOut string, output string) string {
	return "Wrong Answer" +
		"\n\nInput:\n" + input +
		"\n\nOutput:\n" + output +
		"\n\nExpected Outout: " + expOut

}

func runCode(input string, sourceCodeFilePath string) (string, error) {
	cmd := exec.Command("judge/test.sh", sourceCodeFilePath, input)
	out, err := cmd.CombinedOutput()
	if err != nil {
		//r := regexp.MustCompile("line*")
		fmt.Printf("Runtime Error: %s\n", string(out))
		fmt.Printf("Runtime Error: %s\n", string(err.Error()))
		return "", err
	}
	fmt.Printf("Input:\n%s\n", input)
	fmt.Printf("Outout:\n%s\n", string(out))
	return string(out), nil
}
