#!/bin/bash

COMPILED_CODE="$1"
INPUT_STRING="$2"  
LANG="$3"
TIME_LIMIT="${4:-2.0}"       # Time limit in seconds (default 2.0)
MEM_LIMIT="${5:-512}M"       # Memory limit in MB (default 512)

# If $5 was provided, append M; otherwise MEM_LIMIT is already "512M"
if [[ -n "$5" ]]; then
    MEM_LIMIT="${5}M"
fi

ERROR_OUTPUT=$(mktemp /tmp/error_output-XXXXXX)

case "$LANG" in
    cpp) RUN_CMD="$COMPILED_CODE" ;;
    py) RUN_CMD="python3 $COMPILED_CODE" ;;
    kt) RUN_CMD="java -jar $COMPILED_CODE" ;;
    js) RUN_CMD="v8 $COMPILED_CODE" ;;
    java) RUN_CMD="java -jar $COMPILED_CODE" ;;
    go) RUN_CMD="$COMPILED_CODE" ;;
    dart) RUN_CMD="$COMPILED_CODE" ;;
    *) echo "Unsupported language: $LANG" >&2; exit 1 ;;
esac

cleanup() {
    [[ -f "$ERROR_OUTPUT" ]] && rm -f "$ERROR_OUTPUT"
}

trap cleanup EXIT

actual_output=$(
    systemd-run --quiet --user --scope -p MemoryMax=$MEM_LIMIT \
    timeout $TIME_LIMIT $RUN_CMD < "$INPUT_STRING" 2>"$ERROR_OUTPUT"
)
exit_code=$?

if [[ $exit_code -eq 124 ]]; then
    echo "Time Limit Exceeded" >&2
    exit 124
fi

if [[ $exit_code -ge 128 ]]; then
    signal=$((exit_code - 128))
    if [[ $signal -eq 9 ]]; then
        echo "Memory Limit Exceeded" >&2
        exit 137
    else
        echo "Terminated by signal $signal" >&2
        exit $exit_code
    fi
fi

if [[ -s "$ERROR_OUTPUT" ]]; then
    cat "$ERROR_OUTPUT" >&2
    exit 1
fi

echo -e "$actual_output"
