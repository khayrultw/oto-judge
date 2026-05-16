#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
CLIENT_DIR="$ROOT_DIR/client"
SERVER_DIR="$ROOT_DIR/server"
DEPLOY_DIR="$ROOT_DIR/deploy/"

require_command() {
	if ! command -v "$1" >/dev/null 2>&1; then
		echo "Missing required command: $1" >&2
		exit 1
	fi
}

prepare_deploy_dir() {
	rm -rf "$DEPLOY_DIR"
	mkdir -p "$DEPLOY_DIR/public" "$DEPLOY_DIR/judge" "$DEPLOY_DIR/store"
}

build_frontend() {
	require_command npm
	pushd "$CLIENT_DIR" >/dev/null
	npm run build
	popd >/dev/null
}

build_backend() {
	require_command go
	pushd "$SERVER_DIR" >/dev/null
	go build -o "$DEPLOY_DIR/server" .
	popd >/dev/null
}

copy_runtime_files() {
	cp -R "$CLIENT_DIR/dist/." "$DEPLOY_DIR/public/"
	cp -R "$SERVER_DIR/judge/." "$DEPLOY_DIR/judge/"
	if [[ -d "$SERVER_DIR/store" ]]; then
		cp -R "$SERVER_DIR/store/." "$DEPLOY_DIR/store/"
	fi
	cp "$SERVER_DIR/.env.example" "$DEPLOY_DIR/.env.example"
	chmod +x \
		"$DEPLOY_DIR/server" \
		"$DEPLOY_DIR/judge/compile.sh" \
		"$DEPLOY_DIR/judge/run.sh"
}

main() {
	prepare_deploy_dir
	build_frontend
	build_backend
	copy_runtime_files

	echo "Deployment bundle ready at: $DEPLOY_DIR"
	echo "Upload that folder, create .env from .env.example, then run: ./server"
}

main "$@"