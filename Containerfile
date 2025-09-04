# Build a single container that runs both the backend (FastAPI/Uvicorn)
# and the frontend (Next.js). Designed for Podman or Docker.

ARG DEBIAN_FRONTEND=noninteractive
ARG INCLUDE_TORCH=false

FROM python:3.11-slim AS base
ARG INCLUDE_TORCH=false
WORKDIR /app

# Install Node.js 20.x and system deps
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# ===== Backend deps =====
COPY backend/requirements.txt /app/backend/requirements.txt
COPY backend/requirements.txt /app/backend/requirements-full.txt

# A lighter default to avoid huge ML downloads for quick demos
RUN mkdir -p /app/backend \
 && printf "fastapi==0.115.0\nuvicorn[standard]==0.30.6\npillow==10.4.0\nnumpy\npython-multipart==0.0.9\nopencv-python-headless==4.10.0.84\nyt-dlp==2025.01.15\nimageio-ffmpeg==0.5.1\nimageio==2.35.1\n" > /app/backend/requirements-lite.txt

RUN python -m venv /venv && /venv/bin/pip install --no-cache-dir --upgrade pip

# Set default to lite install. Build with: --build-arg INCLUDE_TORCH=true to install full.
ENV PATH="/venv/bin:${PATH}"
RUN echo "INCLUDE_TORCH=$INCLUDE_TORCH" && if [ "$INCLUDE_TORCH" = "true" ]; then \
      pip install --no-cache-dir -r /app/backend/requirements-full.txt ; \
    else \
      pip install --no-cache-dir -r /app/backend/requirements-lite.txt ; \
    fi

# Ensure headless OpenCV to avoid libGL dependency in containers
RUN pip uninstall -y opencv-python opencv-contrib-python || true \
    && pip install --no-cache-dir --upgrade --force-reinstall opencv-python-headless==4.10.0.84

# ===== Frontend build =====
COPY frontend/package*.json /app/frontend/
WORKDIR /app/frontend
RUN npm ci --no-audit --no-fund
COPY frontend /app/frontend
# Production build of Next.js
RUN npm run build

# ===== Runtime image =====
FROM python:3.11-slim AS runtime
WORKDIR /app

# Copy Node.js from a fresh layer (simpler: install node again)
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy venv from build stage
COPY --from=base /venv /venv
ENV PATH="/venv/bin:${PATH}"

# App code
COPY backend /app/backend
COPY --from=base /app/backend/requirements-lite.txt /app/backend/requirements-lite.txt
COPY --from=base /app/backend/requirements-full.txt /app/backend/requirements-full.txt

# Frontend artifacts and runtime
COPY --from=base /app/frontend/.next /app/frontend/.next
COPY --from=base /app/frontend/node_modules /app/frontend/node_modules
COPY --from=base /app/frontend/package.json /app/frontend/package.json
COPY --from=base /app/frontend/next.config.mjs /app/frontend/next.config.mjs
COPY --from=base /app/frontend/public /app/frontend/public

# Shared assets like weights/images/videos
COPY images /app/images
COPY videos /app/videos
COPY weights /app/weights

# Entrypoint that launches both services
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENV FRONTEND_PORT=3000 \
    BACKEND_PORT=8002 \
    FRONTEND_CORS_ORIGIN="http://localhost:3000,http://127.0.0.1:3000"

EXPOSE 3000 8002

WORKDIR /app
CMD ["/app/entrypoint.sh"]


