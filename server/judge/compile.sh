#!/usr/bin/env bash

set -Eeuo pipefail

# ============================================================
# OtoJudge - Docker Sandbox Compiler
#
# Compiles untrusted source code inside a locked-down, network-less
# container. Usage:
#
#   ./compile.sh <work_dir> <lang>      (lang: cpp | py | kt | js | dart)
#
# <work_dir> must already contain the source file with the fixed name
# expected for <lang> (see exec.go: sourceFileName).
#
# Exit codes (the Go caller relies on these):
#   0  success; absolute path of the artifact is printed to stdout
#   1  the submission failed to compile (diagnostics on stderr, capped)
#   2  sandbox / infrastructure problem (NOT the submitter's fault)
# ============================================================

MAX_DIAG_BYTES=8192                        # compiler output returned to the user
MAX_ARTIFACT_BYTES=$((128 * 1024 * 1024))  # largest single file the compiler may write
PATH_RE='^/[A-Za-z0-9._/-]+$'              # docker --mount is comma-separated: keep paths boring

RUN_UID=65532
RUN_GID=65532

internal_error() {
    echo "Error: $*" >&2
    exit 2
}

WORK_DIR="${1:-}"
LANG_ID="${2:-}"   # not LANG: that is a locale variable

[[ -n "$WORK_DIR" && -d "$WORK_DIR" ]] || internal_error "work directory is missing or invalid"
[[ -n "$LANG_ID" ]] || internal_error "language is missing"

WORK_DIR="$(realpath "$WORK_DIR")"
[[ $WORK_DIR =~ $PATH_RE ]] || internal_error "work directory path contains unsupported characters"

LANG_ID="${LANG_ID,,}"

CONTAINER_NAME="otojudge-compile-$$-$(date +%s%N)"

IMAGE=""
SRC_NAME=""
OUT_NAME=""
COMPILE_CMD=()
COMPILE_MEM="512m"
COMPILE_TIMEOUT=30      # seconds, enforced from the host
JAVA_OPTS_VALUE=""

case "$LANG_ID" in

    cpp)
        IMAGE="otojudge/cpp-build"
        SRC_NAME="source.cpp"
        OUT_NAME="program"
        COMPILE_CMD=(g++ -O2 -o "/work/${OUT_NAME}" "/work/${SRC_NAME}")
        ;;

    py)
        IMAGE="otojudge/python-build"
        SRC_NAME="source.py"
        OUT_NAME="source.py"
        # Syntax check only, and it writes nothing (py_compile would create
        # __pycache__ in /work regardless of PYTHONDONTWRITEBYTECODE).
        COMPILE_CMD=(python3 -c 'import sys; compile(open(sys.argv[1]).read(), sys.argv[1], "exec")' "/work/${SRC_NAME}")
        ;;

    kt)
        IMAGE="otojudge/kotlin-build"
        SRC_NAME="source.kt"
        OUT_NAME="program.jar"
        COMPILE_CMD=(kotlinc -nowarn "/work/${SRC_NAME}" -include-runtime -d "/work/${OUT_NAME}")
        COMPILE_MEM="1024m"
        COMPILE_TIMEOUT=90
        JAVA_OPTS_VALUE="-Xmx768m -Xss16m"
        ;;

    js)
        IMAGE="otojudge/js-build"
        SRC_NAME="source.js"
        OUT_NAME="source.js"
        COMPILE_CMD=(node --check "/work/${SRC_NAME}")
        ;;

    dart)
        IMAGE="otojudge/dart-build"
        SRC_NAME="source.dart"
        OUT_NAME="program"
        COMPILE_CMD=(dart compile exe "/work/${SRC_NAME}" -o "/work/${OUT_NAME}")
        COMPILE_MEM="1024m"
        COMPILE_TIMEOUT=60
        ;;

    *)
        internal_error "unsupported language: $LANG_ID"
        ;;
esac

if [[ ! -f "$WORK_DIR/$SRC_NAME" ]]; then
    internal_error "expected source file not found: $WORK_DIR/$SRC_NAME"
fi

# ------------------------------------------------------------
# Who does the compiler run as?
#
# Running it as the same uid as the host user means the work dir can stay
# 0700 (no world-writable dir that other local users could tamper with
# between compile and run) and the host can always delete what the
# compiler created. If we're root, never run the compiler as root: hand
# the directory to the unprivileged uid instead.
# ------------------------------------------------------------

if [[ "$(id -u)" -eq 0 ]]; then
    CONTAINER_UID=$RUN_UID
    CONTAINER_GID=$RUN_GID
    chown "${CONTAINER_UID}:${CONTAINER_GID}" "$WORK_DIR" "$WORK_DIR/$SRC_NAME"
else
    CONTAINER_UID="$(id -u)"
    CONTAINER_GID="$(id -g)"
fi

ERROR_FILE="$(mktemp)"

cleanup() {
    # Not --rm: if the host-side timeout kills the docker client, the
    # container could otherwise keep running. Always remove by name.
    docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
    rm -f "$ERROR_FILE"
}

trap cleanup EXIT

print_diagnostics() {
    cat "$ERROR_FILE" >&2
    if [[ "$(wc -c < "$ERROR_FILE")" -ge "$MAX_DIAG_BYTES" ]]; then
        printf '\n... (compiler output truncated)\n' >&2
    fi
}

# ------------------------------------------------------------
# Check Docker
# ------------------------------------------------------------

command -v docker >/dev/null 2>&1 || internal_error "Docker is not installed."
docker info >/dev/null 2>&1 || internal_error "Docker is not running or current user cannot access Docker."

# ------------------------------------------------------------
# Compile in sandbox
#
# - stderr goes through `head -c` so a compiler error bomb can't fill the
#   disk or memory; the rest is drained so the container isn't blocked.
# - stdout is discarded.
# - --log-driver none: otherwise docker's json-file log stores every byte
#   the container prints, unbounded, until the container is removed.
# - fsize ulimit caps any single file the compiler writes to /work.
# ------------------------------------------------------------

set +e

timeout --kill-after=5s "${COMPILE_TIMEOUT}s" \
docker run \
    --name "$CONTAINER_NAME" \
    --pull never \
    --log-driver none \
    \
    --network none \
    \
    --memory "$COMPILE_MEM" \
    --memory-swap "$COMPILE_MEM" \
    --cpus "1" \
    --pids-limit "256" \
    \
    --read-only \
    --tmpfs "/tmp:rw,nosuid,nodev,size=256m,uid=${CONTAINER_UID},gid=${CONTAINER_GID}" \
    \
    --cap-drop ALL \
    --security-opt no-new-privileges:true \
    \
    --user "${CONTAINER_UID}:${CONTAINER_GID}" \
    \
    --workdir /work \
    \
    --ulimit core=0:0 \
    --ulimit nofile=1024:1024 \
    --ulimit fsize="${MAX_ARTIFACT_BYTES}:${MAX_ARTIFACT_BYTES}" \
    \
    --env HOME=/tmp \
    --env PYTHONDONTWRITEBYTECODE=1 \
    --env DART_SUPPRESS_ANALYTICS=true \
    --env "JAVA_OPTS=${JAVA_OPTS_VALUE}" \
    \
    --mount "type=bind,source=${WORK_DIR},target=/work" \
    \
    "$IMAGE" \
    "${COMPILE_CMD[@]}" \
    2>&1 >/dev/null \
    | { head -c "$MAX_DIAG_BYTES" > "$ERROR_FILE"; cat > /dev/null; }

EXIT_CODE=${PIPESTATUS[0]}

set -e

case "$EXIT_CODE" in
    0)
        ;;
    124)
        echo "Compilation timed out (limit: ${COMPILE_TIMEOUT}s)" >&2
        exit 1
        ;;
    125)
        echo "Error: Docker could not start the compile container:" >&2
        print_diagnostics
        exit 2
        ;;
    137)
        print_diagnostics
        echo "Compiler was killed (memory limit exceeded or timed out)" >&2
        exit 1
        ;;
    *)
        print_diagnostics
        exit 1
        ;;
esac

# ------------------------------------------------------------
# Validate the artifact on the host
#
# The compiler had write access to the work dir, so never trust what is
# there: a symlink here would make the run step bind-mount an arbitrary
# host file into the runtime container.
# ------------------------------------------------------------

ARTIFACT="${WORK_DIR}/${OUT_NAME}"

if [[ -L "$ARTIFACT" || ! -f "$ARTIFACT" ]]; then
    echo "Error: compilation did not produce expected output: $OUT_NAME" >&2
    exit 1
fi

# The runtime container uses a different uid; it needs to read/execute it.
chmod a+rx "$ARTIFACT"

printf '%s' "$ARTIFACT"
