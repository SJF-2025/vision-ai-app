#!/usr/bin/env bash
set -euo pipefail

BACKEND_PORT=${BACKEND_PORT:=8002}
FRONTEND_PORT=${FRONTEND_PORT:=3000}

# Start backend (FastAPI/Uvicorn)
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port "$BACKEND_PORT" &
BACKEND_PID=$!

# Start frontend (Next.js) in production mode
cd /app/frontend
npm run start -- --port "$FRONTEND_PORT" --hostname 0.0.0.0 &
FRONTEND_PID=$!

# Graceful shutdown on SIGTERM/SIGINT
term() {
  echo "Shutting down..."
  kill -TERM "$BACKEND_PID" 2>/dev/null || true
  kill -TERM "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" 2>/dev/null || true
  wait "$FRONTEND_PID" 2>/dev/null || true
}
trap term TERM INT

# Wait for one of the processes to exit, then cleanup
wait -n "$BACKEND_PID" "$FRONTEND_PID" || true
term
