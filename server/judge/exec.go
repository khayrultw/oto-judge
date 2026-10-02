package judge

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"
	"unicode/utf8"

	"github.com/khayrultw/go-judge/models"
)

const (
	defaultTimeLimitSeconds = 2.0
	maxTimeLimitSeconds     = 10.0
	maxMemoryLimitMB        = 256

	// Hard caps on user-controlled sizes.
	maxSourceCodeBytes = 64 * 1024
	maxInputBytes      = 1 << 20

	// Backstops for the scripts. The scripts enforce their own (tighter)
	// limits; these only fire if something hangs.
	compileTimeout = 2 * time.Minute // > slowest per-language limit in compile.sh
	runSlack       = 20 * time.Second // > run.sh host timeout (limit + 10s + 3s)

// How much untrusted text we echo back to the client.
maxDiagChars         = 2000
maxErrChars          = 200
maxInputPreviewChars = 200
maxOutputPreview     = 1000
maxCustomOutputChars = 10000
)

// Exit codes shared with run.sh.
const (
	exitTimeLimit    = 124
	exitSandboxError = 125
	exitMemoryLimit  = 137
	exitOutputLimit  = 153
)

var (
	// ErrSandbox marks infrastructure failures (docker down, image missing...)
	// as opposed to a problem with the submission.
	ErrSandbox   = errors.New("judge sandbox error")
	errInputFile = errors.New("failed to create input file")
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
	// WorkDir is the per-compilation temp directory holding the source file
	// and, on success, the compiled artifact. Callers must os.RemoveAll it.
	WorkDir string
	Stderr  string
}

// sourceFileName maps a language to the fixed filename compile.sh expects to
// find inside the work dir.
func sourceFileName(lang string) (string, error) {
	switch lang {
		case "cpp":
			return "source.cpp", nil
		case "py":
			return "source.py", nil
		case "kt":
			return "source.kt", nil
		case "js":
			return "source.js", nil
		case "dart":
			return "source.dart", nil
		default:
			return "", fmt.Errorf("unsupported language: %s", lang)
	}
}

// runScript runs a helper script with a backstop timeout. On timeout it sends
// SIGTERM (not SIGKILL) so the script's EXIT trap can remove the container.
func runScript(timeout time.Duration, name string, args ...string) (string, string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Cancel = func() error { return cmd.Process.Signal(syscall.SIGTERM) }
	cmd.WaitDelay = 5 * time.Second

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	return stdout.String(), stderr.String(), err
}

func CompileCode(sourceCode, lang string) (*CompileResult, error) {
	if len(sourceCode) > maxSourceCodeBytes {
		err := fmt.Errorf("source code exceeds maximum allowed size")
		return &CompileResult{Stderr: err.Error()}, err
	}

	srcName, err := sourceFileName(lang)
	if err != nil {
		return &CompileResult{Stderr: err.Error()}, err
	}

	workDir, err := os.MkdirTemp("", "otojudge-compile-*")
	if err != nil {
		fmt.Println("compile: failed to create work directory:", err)
		return &CompileResult{Stderr: "Judge system error"}, ErrSandbox
	}

	// Write the source to a file rather than passing it as a CLI argument:
	// argv is visible to any local user via `ps`/`/proc`, and very large
	// sources can exceed ARG_MAX. compile.sh runs the compiler as this same
	// uid (or chowns the dir when we run as root), so 0600 is enough.
	if err := os.WriteFile(filepath.Join(workDir, srcName), []byte(sourceCode), 0o600); err != nil {
		os.RemoveAll(workDir)
		fmt.Println("compile: failed to write source:", err)
		return &CompileResult{Stderr: "Judge system error"}, ErrSandbox
	}

	stdout, stderr, err := runScript(compileTimeout, "judge/compile.sh", workDir, lang)
	if err != nil {
		// Nothing worth keeping: callers won't get a WorkDir to clean up.
		os.RemoveAll(workDir)

		// compile.sh exits 1 for "your code does not compile"; anything else
		// (exit 2, killed, timeout backstop) is our problem, not theirs.
		var exitErr *exec.ExitError
		if !errors.As(err, &exitErr) || exitErr.ExitCode() != 1 {
			fmt.Printf("compile: sandbox failure: %v: %s\n", err, stderr)
			return &CompileResult{Stderr: "Judge system error"}, ErrSandbox
		}
		return &CompileResult{Stderr: truncate(stderr, maxDiagChars)}, err
	}

	return &CompileResult{
		FilePath: strings.TrimSpace(stdout),
		WorkDir:  workDir,
		Stderr:   stderr,
	}, nil
}

func removeWorkDir(dir string) {
	if err := os.RemoveAll(dir); err != nil {
		fmt.Println("Failed to remove:", err)
	}
}

// runProgram executes the compiled artifact once, in a fresh container, and
// returns its stdout/stderr. A non-nil error is an *exec.ExitError whose exit
// code encodes the verdict (see run.sh), or errInputFile for setup failures.
func runProgram(artifactPath, lang, input string, timeLimit float64, memoryMB int) (string, string, error) {
	inputFile, err := GetTestCaseFile(input)
	if err != nil {
		return "", "", fmt.Errorf("%w: %v", errInputFile, err)
	}
	defer os.Remove(inputFile.Name())

	inputPath, err := filepath.Abs(inputFile.Name())
	if err != nil {
		return "", "", fmt.Errorf("%w: %v", errInputFile, err)
	}

	timeout := time.Duration(timeLimit*float64(time.Second)) + runSlack
	return runScript(timeout, "judge/run.sh",
			 artifactPath,
		  inputPath,
		  lang,
		  strconv.FormatFloat(timeLimit, 'f', -1, 64),
			 strconv.Itoa(memoryMB),
	)
}

func JudgeCode(sourceCode string, testCaseFilePath string, lang string) models.Result {
	result, err := CompileCode(sourceCode, lang)
	if err != nil {
		if errors.Is(err, ErrSandbox) {
			return models.Result{Status: "ERROR", Message: "Judge system error"}
		}
		return models.Result{Status: "Syntax Error", Message: result.Stderr}
	}
	defer removeWorkDir(result.WorkDir)

	content, err := os.ReadFile(testCaseFilePath)
	if err != nil {
		fmt.Printf("err: %v\n", err)
		return models.Result{Status: "ERROR", Message: "Test Case File Error"}
	}

	tcFile, err := ParseTestCases(content)
	if err != nil {
		return models.Result{Status: "ERROR", Message: "Invalid test case format"}
	}

	// Limits from the testcase file are clamped so metadata can't raise them
	// past the hard caps.
	timeLimit := normalizeTimeLimit(tcFile.TimeLimit)
	memoryLimit := normalizeMemoryLimit(tcFile.MemoryLimit)

	for idx, tc := range tcFile.TestCases {
		input := strings.TrimSpace(tc.Input)
		expectedOutput := strings.TrimSpace(tc.Output)

		stdout, stderr, err := runProgram(result.FilePath, lang, input, timeLimit, memoryLimit)
		if err != nil {
			if errors.Is(err, errInputFile) {
				return models.Result{Status: "ERROR", Message: "Failed to create input file"}
			}
			return prepareErrorMessage(err, stderr, idx)
		}

		actualOutput := strings.TrimSpace(stdout)

		if normalize(actualOutput) != normalize(expectedOutput) {
			msg := fmt.Sprintf(
				"Failed on Test Case %d\n\nInput:\n```text\n%s\n```\n\nOutput:\n```text\n%s\n```\n\nExpected:\n```text\n%s\n```",
		      idx+1,
		      fence(truncate(input, maxInputPreviewChars)),
					   fence(truncate(actualOutput, maxOutputPreview)),
					   fence(truncate(expectedOutput, maxOutputPreview)),
			)
			return models.Result{Status: "FAIL", Message: msg}
		}
	}

	return models.Result{Status: "PASS", Message: ""}
}

func prepareErrorMessage(err error, errorOut string, testNumber int) models.Result {
	errorOut = truncate(errorOut, maxErrChars)
	n := testNumber + 1

	var exitErr *exec.ExitError
	if errors.As(err, &exitErr) {
		switch exitErr.ExitCode() {
			case exitTimeLimit:
				return models.Result{Status: fmt.Sprintf("Time Limit Exceeded on Test Case %d", n)}
			case exitMemoryLimit:
				return models.Result{Status: fmt.Sprintf("Memory Limit Exceeded on Test Case %d", n), Message: errorOut}
			case exitOutputLimit:
				return models.Result{Status: fmt.Sprintf("Output Limit Exceeded on Test Case %d", n)}
			case exitSandboxError, -1: // -1: run.sh itself was killed (backstop timeout)
				fmt.Printf("run: sandbox failure on test %d: %v: %s\n", n, err, errorOut)
				return models.Result{Status: "ERROR", Message: "Judge system error"}
		}
		return models.Result{Status: fmt.Sprintf("Runtime Error on Test Case %d", n), Message: errorOut}
	}

	fmt.Printf("run: execution error on test %d: %v\n", n, err)
	return models.Result{Status: fmt.Sprintf("Execution Error on test %d", n), Message: "Judge system error"}
}

func GetTestCaseFile(input string) (*os.File, error) {
	inputFile, err := os.CreateTemp("", "input*.txt")
	if err != nil {
		return nil, fmt.Errorf("failed to create input file")
	}
	if _, err = inputFile.WriteString(input); err != nil {
		inputFile.Close()
		os.Remove(inputFile.Name())
		return nil, fmt.Errorf("failed to write input to file")
	}
	if err = inputFile.Close(); err != nil {
		os.Remove(inputFile.Name())
		return nil, fmt.Errorf("failed to close input file")
	}
	return inputFile, nil
}

// normalize makes output comparison whitespace-tolerant without being blind:
// CRLF -> LF, trailing spaces/tabs stripped per line, trailing blank lines
// dropped. Line breaks and non-ASCII characters are preserved, so "1\n2" no
// longer equals "12".
func normalize(s string) string {
	s = strings.ReplaceAll(s, "\r\n", "\n")
	lines := strings.Split(s, "\n")
	for i, l := range lines {
		lines[i] = strings.TrimRight(l, " \t\r")
	}
	return strings.TrimRight(strings.Join(lines, "\n"), "\n")
}

// RunCustomTest runs code against a custom test case input and expected output
func RunCustomTest(sourceCode, lang, input, expectedOutput string) models.TestRunResponse {
	if len(input) > maxInputBytes {
		return models.TestRunResponse{Status: "ERROR", Message: "Input is too large", Passed: false}
	}

	result, err := CompileCode(sourceCode, lang)
	if err != nil {
		status := "Syntax Error"
		if errors.Is(err, ErrSandbox) {
			status = "ERROR"
		}
		return models.TestRunResponse{
			Status:  status,
			Output:  "",
			Message: result.Stderr,
			Passed:  false,
		}
	}
	defer removeWorkDir(result.WorkDir)

	stdout, stderr, err := runProgram(result.FilePath, lang, input, defaultTimeLimitSeconds, maxMemoryLimitMB)
	if err != nil {
		if errors.Is(err, errInputFile) {
			return models.TestRunResponse{Status: "ERROR", Message: "Failed to create input file", Passed: false}
		}
		errResult := prepareErrorMessage(err, stderr, 0)
		return models.TestRunResponse{
			Status:  errResult.Status,
			Output:  truncate(strings.TrimSpace(stdout), maxCustomOutputChars),
			Message: errResult.Message,
			Passed:  false,
		}
	}

	actualOutput := strings.TrimSpace(stdout)
	shownOutput := truncate(actualOutput, maxCustomOutputChars)

	// If expected output is provided, compare
	if expectedOutput != "" {
		expectedOutput = strings.TrimSpace(expectedOutput)
		if normalize(actualOutput) == normalize(expectedOutput) {
			return models.TestRunResponse{
				Status:         "PASS",
				Output:         shownOutput,
				ExpectedOutput: expectedOutput,
				Message:        "Test passed!",
				Passed:         true,
			}
		}
		return models.TestRunResponse{
			Status:         "FAIL",
			Output:         shownOutput,
			ExpectedOutput: expectedOutput,
			Message:        "Output doesn't match expected output",
			Passed:         false,
		}
	}

	// No expected output provided, just return the actual output
	return models.TestRunResponse{
		Status:  "EXECUTED",
		Output:  shownOutput,
		Message: "Code executed successfully",
		Passed:  true,
	}
}

func normalizeMemoryLimit(memoryLimit int) int {
	if memoryLimit <= 0 || memoryLimit > maxMemoryLimitMB {
		return maxMemoryLimitMB
	}
	return memoryLimit
}

func normalizeTimeLimit(timeLimit float64) float64 {
	if timeLimit <= 0 {
		return defaultTimeLimitSeconds
	}
	if timeLimit > maxTimeLimitSeconds {
		return maxTimeLimitSeconds
	}
	return timeLimit
}

// truncate shortens s to at most max runes without splitting a UTF-8 sequence.
func truncate(s string, max int) string {
	if utf8.RuneCountInString(s) <= max {
		return s
	}
	return string([]rune(s)[:max]) + "..."
}

// fence stops untrusted text from closing the markdown code fence it is
// embedded in.
func fence(s string) string {
	return strings.ReplaceAll(s, "```", "'''")
}
