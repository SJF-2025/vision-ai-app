# VisionAI

## About
VisionAI is a simple full‑stack application for running object detection (YOLOv5) right from your browser. The frontend (Next.js + Carbon) lets you select a media source and start detection, while the backend (FastAPI + Ultralytics) loads YOLO weights and returns bounding boxes and labels. Everything is packaged in a Podman container so both services start with a single command.

**Features
- **Sources**: Local image/video files, a **Snapshot** URL (e.g., IP camera snapshot), or your **Webcam**.
- **Weights**: Upload a local `.pt` file or use the pretrained `yolov5s.pt`.
- **Detection modes**: Single‑shot detection for images, and live overlay detection for videos/webcam.
- **Containerized**: Uses a Python virtual environment inside the container; `weights/` on your machine is bind‑mounted for custom models.

## Requirements (all platforms)
- Podman installed (Desktop or CLI). See Downloads below.

## Platform setup

### For Windows
Simplest: use the provided PowerShell script.

- PowerShell (recommended):
```powershell
# From the project root in PowerShell
.\run.ps1
```

- PowerShell with custom port:
```powershell
.\run.ps1 -FrontendPort 3005
```

- Bash (Git Bash or WSL):
```bash
# From the project root in Git Bash or WSL
MSYS_NO_PATHCONV=1 ./run.sh
```

Notes for Windows:
- The SELinux mount flag `:Z` is not needed on Windows; the script omits it.
- On first run, Windows Firewall may prompt you; allow access.
- Open http://localhost:3001 after the container starts.

### For macOS
1. Install Podman Desktop (recommended) or CLI.
2. Start the Podman VM once (or whenever it’s not running):

- Bash:
```bash
podman machine start
```

3. From the project root, run:

- Bash:
```bash
./run.sh
```

- Frontend: http://localhost:3001
- Backend health: http://localhost:8002/health

To use a different port:

- Bash:
```bash
FRONTEND_PORT=3005 ./run.sh
```

## Stop the container
Default container name is `vision-ai-app`.

- PowerShell:
```powershell
podman rm -f vision-ai-app
```

- Bash:
```bash
podman rm -f vision-ai-app
```

## Downloads
- Podman Desktop (GUI for Mac/Windows/Linux): https://podman-desktop.io/
- Podman CLI (all OS): https://podman.io/docs/installation

Which one should I use?
- Use Desktop if you want a simple GUI and minimal terminal use.
- Use CLI if you're comfortable in terminal or need scripts/CI.

## Weights
Place your YOLO `.pt` files in `weights/`. They are mounted read-only into the container.

---

## Deploying to Google Cloud Run
This repo can be deployed to Cloud Run as two services: a backend (FastAPI) and a frontend (Next.js). Each folder contains a Cloud Run–ready `Dockerfile` and `.dockerignore`.

### Prerequisites
- gcloud CLI installed and authenticated
- A Google Cloud project selected: `gcloud config set project <PROJECT_ID>`
- Artifact Registry repository created (optional if using gcloud build from local)

### 1) Backend (FastAPI)
From repo root:
```bash
cd backend
# Build
gcloud builds submit --tag gcr.io/$(gcloud config get-value project)/visionai-backend
# Deploy
gcloud run deploy visionai-backend \
  --image gcr.io/$(gcloud config get-value project)/visionai-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8002 \
  --set-env-vars FRONTEND_CORS_ORIGIN=https://<your-vercel-or-frontend-domain>
```
Notes:
- Cloud Run will inject `$PORT`; the Dockerfile respects it. `--port 8002` is the container’s internal default for local parity.
- The backend exposes endpoints: `/health`, `/weights`, `/upload-weight`, `/predict`, and WebSockets at `/ws/*`.
- For large YOLO weights, consider uploading via `/upload-weight` at runtime or mounting a volume with Filestore (if needed).

### 2) Frontend (Next.js)
From repo root:
```bash
cd frontend
# Build
gcloud builds submit --tag gcr.io/$(gcloud config get-value project)/visionai-frontend
# Deploy
gcloud run deploy visionai-frontend \
  --image gcr.io/$(gcloud config get-value project)/visionai-frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars NEXT_PUBLIC_BACKEND_HTTP=https://<your-backend-run-url>
```
Notes:
- The frontend reads `NEXT_PUBLIC_BACKEND_HTTP` to call the backend.
- After both services are deployed, open the frontend URL, and it should connect to the backend.

### Optional: Custom domains
- Map a custom domain to each service via Cloud Run console or gcloud: `gcloud run domain-mappings`.

### Troubleshooting
- 404s on `/weights`: verify backend URL and CORS.
- CORS errors: set `FRONTEND_CORS_ORIGIN` on backend to the exact frontend origin (e.g., `https://visionai-frontend-xxxxx-uc.a.run.app`).
- Cold starts: Cloud Run may cold start; consider minimum instances if needed.