# syntax=docker/dockerfile:1
FROM python:3.11-slim

# Install system dependencies (optional minimal set)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       curl ca-certificates \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt /app/requirements.txt
RUN python -m pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r /app/requirements.txt

# Copy app code
COPY app /app/app

# Copy model weights (bundle into image)
COPY ../weights /app/weights

# Default model path (can be overridden by env)
ENV MODEL_PATH=/app/weights/yolov5s.pt

# Cloud Run provides $PORT; default to 8002 for local
ENV PORT=8002

# Start FastAPI using Uvicorn on $PORT
CMD ["sh", "-c", "uvicorn app.main:get_app --host 0.0.0.0 --port ${PORT} --factory"]
