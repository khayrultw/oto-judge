#!/bin/bash

USER_CODE="$1"    # Path to user's code file
INPUT_STRING="$2" # Multiline input string (required)
COMPILED_CODE="./compiled_solution"  # Path for compiled output if necessary

# Compile code if necessary
if [[ $USER_CODE == *.cpp ]]; then
    g++ "$USER_CODE" -o "$COMPILED_CODE"
    if [[ $? -ne 0 ]]; then
        exit 0
    fi
    RUN_CMD="$COMPILED_CODE"
elif [[ $USER_CODE == *.py ]]; then
    RUN_CMD="python3 $USER_CODE"
elif [[ $USER_CODE == *.kt ]]; then 
    kotlinc "$USER_CODE" -include-runtime -d "$COMPILED_CODE.jar"
    if [[ $? -ne 0 ]]; then
        exit 0
    fi
    RUN_CMD="java -jar $COMPILED_CODE.jar"
fi

if [[ -z "$INPUT_STRING" ]]; then
    echo "No input string provided."
    exit 1
fi

# Run the user code with the provided multiline input string
actual_output=$(echo -e "$INPUT_STRING" | $RUN_CMD)
echo "$actual_output"