#!/bin/bash

COMPILED_CODE="$1"
INPUT_STRING="$2"  
LANG="$3"
MEM_LIMIT=512M          # Memory limit
TIME_LIMIT=2.5            # Time limit in seconds
ERROR_OUTPUT=$(mktemp /tmp/error_output-XXXXXX)

case "$LANG" in
    cpp) RUN_CMD="$COMPILED_CODE" ;;
    py) RUN_CMD="python3 $COMPILED_CODE" ;;
    kt) RUN_CMD="$COMPILED_CODE" ;;
    js) RUN_CMD="v8 $COMPILED_CODE" ;;
    *) RUN_CMD="$COMPILED_CODE" ;;
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
