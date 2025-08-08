#!/bin/bash

SRC_FILE=$(mktemp /tmp/code-XXXXXX.$2)
COMPILE_ERROR=$(mktemp /tmp/compile_error-XXXXXX)

case "$2" in
    cpp) EXT="" ;;
    py) EXT=".py" ;;
    kt) EXT=".kexe" ;;
    js) EXT=".js" ;;
    *) EXT=".txt" ;;
esac

COMPILED_CODE=$(mktemp /tmp/code-XXXXXX$EXT)

cleanup() {
    [[ -f "$SRC_FILE" ]] && rm -f "$SRC_FILE"
    [[ -f "$COMPILE_ERROR" ]] && rm -f "$COMPILE_ERROR"
}

trap cleanup EXIT

echo "$1" > "$SRC_FILE"

if [[ $SRC_FILE == *.cpp ]]; then
    g++ "$SRC_FILE" -o "$COMPILED_CODE" 2>"$COMPILE_ERROR"

    if [[ $? -ne 0 ]]; then 
        cat "$COMPILE_ERROR" >&2; 
        exit 1
    fi

elif [[ $SRC_FILE == *.py ]]; then
    echo "$1" > "$COMPILED_CODE"
    python3 -m py_compile "$COMPILED_CODE" 2>"$COMPILE_ERROR"

    if [[ $? -ne 0 ]]; then 
        cat "$COMPILE_ERROR" >&2 
        exit 1
    fi

elif [[ $SRC_FILE == *.kt ]]; then 
    kotlinc-native "$SRC_FILE" -o "$COMPILED_CODE" 2>"$COMPILE_ERROR"
    
    if [[ $? -ne 0 ]]; then 
        cat "$COMPILE_ERROR" >&2
        exit 1
    fi

elif [[ $SRC_FILE == *.js ]]; then
    echo "$1" > "$COMPILED_CODE"
    node --check "$SRC_FILE" 2>"$COMPILE_ERROR"

    if [[ $? -ne 0 ]]; then 
        cat "$COMPILE_ERROR" >&2
        exit 1 
    fi
fi

echo -n "$COMPILED_CODE"
