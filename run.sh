#!/usr/bin/env bash
set -euo pipefail

IMAGE_TAG=${IMAGE_TAG:-vision-ai-app:full}
CONTAINER_NAME=${CONTAINER_NAME:-vision-ai-app}
FRONTEND_PORT=${FRONTEND_PORT:-3000}
BACKEND_PORT=${BACKEND_PORT:-8002}

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Build full image (includes PyTorch/Ultralytics)
podman build --build-arg INCLUDE_TORCH=true -t "$IMAGE_TAG" -f Containerfile .

# Stop previous container if running
podman rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true

# Run container with ports and weights mounted
podman run --rm -d \
  -p ${FRONTEND_PORT}:3000 \
  -p ${BACKEND_PORT}:8002 \
  -e FRONTEND_PORT=${FRONTEND_PORT} \
  -e BACKEND_PORT=${BACKEND_PORT} \
  -e FRONTEND_CORS_ORIGIN="http://localhost:${FRONTEND_PORT},http://127.0.0.1:${FRONTEND_PORT}" \
  -v "$(pwd)/weights:/app/weights:Z" \
  --name "$CONTAINER_NAME" "$IMAGE_TAG"

printf "\nStarted %s\n- Frontend: http://localhost:%s\n- Backend:  http://localhost:%s/health\n\n" "$CONTAINER_NAME" "$FRONTEND_PORT" "$BACKEND_PORT"
