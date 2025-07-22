#!/bin/bash

USER_CODE="$1"    # Path to user's code file
INPUT_STRING="$2" # Multiline input string (required)
COMPILED_CODE="./compiled_solution"  # Path for compiled output if necessary

# Compile code if necessary
if [[ $USER_CODE == *.cpp ]]; then
    g++ "$USER_CODE" -o "$COMPILED_CODE" 2>compile_error
    if [[ $? -ne 0 ]]; then
        cat compile_error >&2
        exit 100
    fi
    RUN_CMD="$COMPILED_CODE"

elif [[ $USER_CODE == *.py ]]; then
    python3 -m py_compile "$USER_CODE" 2>compile_error
    if [[ $? -ne 0 ]]; then
        cat compile_error >&2
        exit 100 
    fi
    RUN_CMD="python3 $USER_CODE"

elif [[ $USER_CODE == *.kt ]]; then 
    kotlinc "$USER_CODE" -include-runtime -d "$COMPILED_CODE.jar" 2>compile_error
    if [[ $? -ne 0 ]]; then
        cat compile_error >&2
        exit 100
    fi
    RUN_CMD="java -jar $COMPILED_CODE.jar"

elif [[ $USER_CODE == *.js ]]; then
    node --check "$USER_CODE" 2>compile_error
    if [[ $? -ne 0 ]]; then
        cat compile_error >&2
        exit 100
    fi
    RUN_CMD="node $USER_CODE"
fi

if [[ -z "$INPUT_STRING" ]]; then
    echo "No input string provided."
    exit 1
fi

actual_output=$(timeout 5s bash -c "echo -e \"$INPUT_STRING\" | $RUN_CMD" 2>error_output)
exit_code=$?

if [[ $exit_code -eq 124 ]]; then
    echo "Time Limit Exceeded" >&2
    exit 124 
fi

if [[ $exit_code -ge 128 ]]; then
    echo "Terminated by signal $signal" >&2
    exit $exit_code
fi

if [[ -s error_output ]]; then
    cat error_output >&2
    exit 1
fi

echo -e "$actual_output"
