#!/usr/bin/env bash

set -Eeuo pipefail

# ============================================================
# OtoJudge - Docker Sandbox Runner
#
# Usage:
#   ./run.sh <compiled_code> <input_file> <language> [time_s] [memory_mb]
#
# Example:
#   ./run.sh /tmp/code-abc123/program /tmp/input.txt cpp 5 256
#
# Contract with the Go caller:
#   stdout : exactly what the program wrote (capped at 1 MiB)
#   stderr : what the program wrote to stderr (capped), or a sandbox message
#   exit   : 0    success
#            124  Time Limit Exceeded
#            137  Memory Limit Exceeded
#            153  Output Limit Exceeded
#            125  sandbox / infrastructure failure (NOT the submitter's fault)
#            else the program's own exit code (Runtime Error)
# ============================================================

MAX_OUTPUT_BYTES=$((1024 * 1024))
MAX_STDERR_BYTES=4096
MAX_TIME_LIMIT=15
MIN_MEM_LIMIT_MB=16
MAX_MEM_LIMIT_MB=512
PATH_RE='^/[A-Za-z0-9._/-]+$'
TIME_RE='^[0-9]+([.][0-9]+)?$'

COMPILED_CODE="${1:-}"
INPUT_FILE="${2:-}"
LANG_ID="${3:-}"   # not LANG: that is a locale variable
TIME_LIMIT="${4:-5}"
MEM_LIMIT="${5:-256}"

sandbox_error() {
    echo "Sandbox Error: $*" >&2
    exit 125
}

# ------------------------------------------------------------
# Validate arguments
# ------------------------------------------------------------

[[ -n "$COMPILED_CODE" ]] || sandbox_error "compiled code path is missing"
[[ -n "$INPUT_FILE" ]] || sandbox_error "input file path is missing"
[[ -n "$LANG_ID" ]] || sandbox_error "language is missing"

# Refuse symlinks: docker resolves them on the host when bind-mounting.
[[ ! -L "$COMPILED_CODE" && -f "$COMPILED_CODE" ]] || sandbox_error "compiled code is missing or not a regular file"
[[ -f "$INPUT_FILE" ]] || sandbox_error "input file does not exist"

COMPILED_CODE="$(realpath "$COMPILED_CODE")"
[[ $COMPILED_CODE =~ $PATH_RE ]] || sandbox_error "compiled code path contains unsupported characters"

[[ $TIME_LIMIT =~ $TIME_RE ]] || sandbox_error "invalid time limit"
[[ $MEM_LIMIT =~ ^[0-9]+$ ]] || sandbox_error "invalid memory limit"

awk -v t="$TIME_LIMIT" 'BEGIN { exit !(t > 0) }' || sandbox_error "time limit must be positive"
TIME_LIMIT="$(awk -v t="$TIME_LIMIT" -v m="$MAX_TIME_LIMIT" 'BEGIN { if (t > m) t = m; print t + 0 }')"

MEM_LIMIT=$((10#$MEM_LIMIT))
(( MEM_LIMIT >= MIN_MEM_LIMIT_MB )) || sandbox_error "memory limit too small"
(( MEM_LIMIT <= MAX_MEM_LIMIT_MB )) || MEM_LIMIT=$MAX_MEM_LIMIT_MB

LANG_ID="${LANG_ID,,}"

# ------------------------------------------------------------
# Docker configuration
# ------------------------------------------------------------

DOCKER_MEMORY="${MEM_LIMIT}m"
CONTAINER_NAME="otojudge-$$-$(date +%s%N)"

RUN_UID=65532
RUN_GID=65532

# Backstop in case the in-container `timeout` doesn't fire (hung daemon, etc.)
HOST_TIMEOUT="$(awk -v t="$TIME_LIMIT" 'BEGIN { printf "%.1f", t + 10 }')"
TIME_LIMIT_MS="$(awk -v t="$TIME_LIMIT" 'BEGIN { printf "%d", t * 1000 }')"

PROGRAM=""
IMAGE=""
RUN_CMD=()

case "$LANG_ID" in

    cpp)
        IMAGE="otojudge/cpp-runtime"
        PROGRAM="/app/program"
        RUN_CMD=(/usr/bin/timeout --kill-after=1s "${TIME_LIMIT}s" "$PROGRAM")
        ;;

    py)
        IMAGE="otojudge/python-runtime"
        PROGRAM="/app/program.py"
        RUN_CMD=(/usr/bin/timeout --kill-after=1s "${TIME_LIMIT}s" python3 "$PROGRAM")
        ;;

    kt)
        IMAGE="otojudge/kotlin-runtime"
        PROGRAM="/app/program.jar"
        # The JVM's default heap (1/4 of the container limit) is too small,
        # while -Xmx == container limit would get the whole container OOM
        # killed (metaspace, thread stacks, code cache live outside the heap).
        JVM_HEAP_MB=$(( MEM_LIMIT * 3 / 4 ))
        RUN_CMD=(
            /usr/bin/timeout --kill-after=1s "${TIME_LIMIT}s"
            java
            "-Xmx${JVM_HEAP_MB}m"
            -Xss64m
            -XX:+UseSerialGC
            -XX:-UsePerfData
            -Xshare:auto
            -jar "$PROGRAM"
        )
        ;;

    js)
        IMAGE="otojudge/js-runtime"
        PROGRAM="/app/program.js"
        RUN_CMD=(/usr/bin/timeout --kill-after=1s "${TIME_LIMIT}s" v8 "$PROGRAM")
        ;;

    dart)
        IMAGE="otojudge/dart-runtime"
        PROGRAM="/app/program"
        RUN_CMD=(/usr/bin/timeout --kill-after=1s "${TIME_LIMIT}s" "$PROGRAM")
        ;;

    *)
        sandbox_error "unsupported language: $LANG_ID"
        ;;
esac

# ------------------------------------------------------------
# Temporary files
# ------------------------------------------------------------

command -v docker >/dev/null 2>&1 || sandbox_error "Docker is not installed."

TMP_DIR="$(mktemp -d)"
OUTPUT_FILE="${TMP_DIR}/stdout"
ERROR_FILE="${TMP_DIR}/stderr"
STATUS_FILE="${TMP_DIR}/status"

cleanup() {
    docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
    rm -rf "$TMP_DIR"
}

trap cleanup EXIT

# Keep the first N bytes, then keep draining so the writer never blocks
# and nothing unbounded ever reaches the host disk.
capture() {   # capture <max_bytes> <file>
    head -c "$1" > "$2"
    cat > /dev/null
}

# ------------------------------------------------------------
# Run sandbox
#
# The fd juggling sends the container's stdout and stderr through separate
# size-capped pipes and records docker's exit status in STATUS_FILE.
# No --rm: we need `docker inspect` afterwards to tell OOM from TLE.
# --log-driver none: docker would otherwise keep a copy of all output.
# ------------------------------------------------------------

START_NS="$(date +%s%N)"

set +e

{
    timeout --kill-after=3s "${HOST_TIMEOUT}s" \
    docker run \
        --interactive \
        --name "$CONTAINER_NAME" \
        --pull never \
        --log-driver none \
        \
        --network none \
        \
        --memory "$DOCKER_MEMORY" \
        --memory-swap "$DOCKER_MEMORY" \
        --cpus "1" \
        --pids-limit "64" \
        \
        --read-only \
        \
        --tmpfs "/tmp:rw,nosuid,nodev,noexec,size=64m,uid=${RUN_UID},gid=${RUN_GID}" \
        \
        --cap-drop ALL \
        --security-opt no-new-privileges:true \
        \
        --user "${RUN_UID}:${RUN_GID}" \
        \
        --workdir /tmp \
        \
        --ulimit core=0:0 \
        --ulimit nofile=128:128 \
        \
        --env HOME=/tmp \
        --env PYTHONDONTWRITEBYTECODE=1 \
        \
        --mount "type=bind,source=${COMPILED_CODE},target=${PROGRAM},readonly" \
        \
        "$IMAGE" \
        "${RUN_CMD[@]}" \
        < "$INPUT_FILE" \
        2>&1 1>&3 3>&- \
    | capture "$MAX_STDERR_BYTES" "$ERROR_FILE"

    echo "${PIPESTATUS[0]}" > "$STATUS_FILE"
} 3>&1 | capture "$((MAX_OUTPUT_BYTES + 1))" "$OUTPUT_FILE"

set -e

END_NS="$(date +%s%N)"
ELAPSED_MS=$(( (END_NS - START_NS) / 1000000 ))

EXIT_CODE="$(cat "$STATUS_FILE" 2>/dev/null || true)"
EXIT_CODE="${EXIT_CODE:-1}"

OOM_KILLED="$(docker inspect --format '{{.State.OOMKilled}}' "$CONTAINER_NAME" 2>/dev/null || echo false)"

# ------------------------------------------------------------
# Verdict
# ------------------------------------------------------------

emit_output() {
    cat "$OUTPUT_FILE"
    cat "$ERROR_FILE" >&2
}

OUTPUT_SIZE="$(wc -c < "$OUTPUT_FILE")"

if (( OUTPUT_SIZE > MAX_OUTPUT_BYTES )); then
    echo "Output limit exceeded" >&2
    exit 153
fi

if [[ "$EXIT_CODE" == "125" ]]; then
    echo "Sandbox Error: Docker could not start the container." >&2
    cat "$ERROR_FILE" >&2
    exit 125
fi

if [[ "$OOM_KILLED" == "true" ]]; then
    emit_output
    exit 137
fi

case "$EXIT_CODE" in

    0)
        # Successful execution: stdout exactly as produced.
        cat "$OUTPUT_FILE"
        ;;

    124)
        emit_output
        exit 124
        ;;

    137)
        # SIGKILL without an OOM event: either `timeout --kill-after` had to
        # KILL a program that ignored SIGTERM (a TLE), or something else
        # killed it. Wall time tells them apart.
        emit_output
        if (( ELAPSED_MS >= TIME_LIMIT_MS )); then
            exit 124
        fi
        exit 137
        ;;

    *)
        # Includes 126/127 (cannot exec) and the program's own exit codes.
        emit_output
        exit "$EXIT_CODE"
        ;;

esac
