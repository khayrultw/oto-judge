#!/bin/bash

# Normalize language parameter to file extension
case "$2" in
    cpp) SRC_EXT="cpp" ;;
    py) SRC_EXT="py" ;;
    kt) SRC_EXT="kt" ;;
    js) SRC_EXT="js" ;;
    java) SRC_EXT="java" ;;
    go) SRC_EXT="go" ;;
    dart) SRC_EXT="dart" ;;
    *) echo "Unsupported language: $2" >&2; exit 1 ;;
esac

SRC_FILE=$(mktemp /tmp/code-XXXXXX.$SRC_EXT)
COMPILE_ERROR=$(mktemp /tmp/compile_error-XXXXXX)

case "$2" in
    cpp) EXT="" ;;
    py) EXT=".py" ;;
    kt) EXT=".jar" ;;
    js) EXT=".js" ;;
    java) EXT=".jar" ;;
    go) EXT="" ;;
    dart) EXT="" ;;
    *) echo "Unsupported language: $2" >&2; exit 1 ;;
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
    
    # Make the compiled executable have execute permissions
    chmod +x "$COMPILED_CODE"

elif [[ $SRC_FILE == *.py ]]; then
    # Keep source in COMPILED_CODE so runtime can execute and diagnostics can show code.
    echo "$1" > "$COMPILED_CODE"

    # Validate Python syntax at compile stage for consistent error handling.
    python3 -m py_compile "$SRC_FILE" 2>"$COMPILE_ERROR"

    if [[ $? -ne 0 ]]; then
        cat "$COMPILE_ERROR" >&2
        exit 1
    fi

elif [[ $SRC_FILE == *.kt ]]; then 
    # For Kotlin, compile to a JAR file
    # kotlinc -d expects the output JAR path directly when using -include-runtime
    rm -f "$COMPILED_CODE"  # Remove the empty temp file first
    kotlinc "$SRC_FILE" -include-runtime -d "$COMPILED_CODE" 2>"$COMPILE_ERROR"
    
    if [[ $? -ne 0 ]]; then 
        cat "$COMPILE_ERROR" >&2
        exit 1
    fi
    
    # Verify the JAR was created
    if [[ ! -f "$COMPILED_CODE" ]]; then
        echo "Error: Kotlin compilation did not produce output JAR" >&2
        exit 1
    fi

elif [[ $SRC_FILE == *.js ]]; then
    echo "$1" > "$COMPILED_CODE"
    node --check "$SRC_FILE" 2>"$COMPILE_ERROR"

    if [[ $? -ne 0 ]]; then 
        cat "$COMPILE_ERROR" >&2
        exit 1 
    fi

elif [[ $SRC_FILE == *.java ]]; then
    # For Java, compile and create a JAR
    CLASS_NAME=$(basename "$SRC_FILE" .java)
    TEMP_DIR=$(mktemp -d /tmp/java-compile-XXXXXX)
    javac "$SRC_FILE" -d "$TEMP_DIR" 2>"$COMPILE_ERROR"
    
    if [[ $? -ne 0 ]]; then 
        cat "$COMPILE_ERROR" >&2
        rm -rf "$TEMP_DIR"
        exit 1
    fi
    
    # Create JAR file
    (cd "$TEMP_DIR" && jar cfe "$COMPILED_CODE" "$CLASS_NAME" *.class) 2>"$COMPILE_ERROR"
    rm -rf "$TEMP_DIR"
    
    if [[ $? -ne 0 ]]; then 
        cat "$COMPILE_ERROR" >&2
        exit 1
    fi

elif [[ $SRC_FILE == *.go ]]; then
    go build -o "$COMPILED_CODE" "$SRC_FILE" 2>"$COMPILE_ERROR"
    
    if [[ $? -ne 0 ]]; then 
        cat "$COMPILE_ERROR" >&2
        exit 1
    fi
    
    chmod +x "$COMPILED_CODE"

elif [[ $SRC_FILE == *.dart ]]; then
    dart compile exe "$SRC_FILE" -o "$COMPILED_CODE" >/dev/null 2>"$COMPILE_ERROR"
    
    if [[ $? -ne 0 ]]; then 
        cat "$COMPILE_ERROR" >&2
        exit 1
    fi
    
    chmod +x "$COMPILED_CODE"
fi

echo -n "$COMPILED_CODE"
