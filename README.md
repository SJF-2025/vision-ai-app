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

### For macOS
1. Install Podman Desktop (recommended) or CLI.
2. Start the Podman VM once (or whenever it’s not running):

```bash
podman machine start
```

3. From the project root, run:

```bash
./run.sh
```

- Frontend: http://localhost:3001
- Backend health: http://localhost:8002/health

To use a different port:
```bash
FRONTEND_PORT=3005 ./run.sh
```

### For Windows
Use Podman Desktop (recommended). You have two options:

- Option A: PowerShell commands (no Bash required)

```powershell
$env:IMAGE_TAG="vision-ai-app:full"
$env:CONTAINER_NAME="vision-ai-app"
$env:FRONTEND_PORT="3001"
$env:BACKEND_PORT="8002"

podman build --build-arg INCLUDE_TORCH=true -t $env:IMAGE_TAG -f Containerfile .
podman rm -f $env:CONTAINER_NAME 2>$null
podman run --rm -d `
  -p ${env:FRONTEND_PORT}:${env:FRONTEND_PORT} `
  -p ${env:BACKEND_PORT}:8002 `
  -e FRONTEND_PORT=$env:FRONTEND_PORT `
  -e BACKEND_PORT=$env:BACKEND_PORT `
  -e FRONTEND_CORS_ORIGIN="http://localhost:$($env:FRONTEND_PORT),http://127.0.0.1:$($env:FRONTEND_PORT)" `
  -v "${PWD}\weights:/app/weights" `
  --name $env:CONTAINER_NAME $env:IMAGE_TAG
```

- Option B: Run the Bash script via Git Bash or WSL
  - Open Git Bash or WSL at the project root and run `./run.sh`.

Notes for Windows:
- The SELinux mount flag `:Z` is not needed on Windows; the example above omits it.
- On first run, Windows Firewall may prompt you; allow access.
- Open http://localhost:3001 after the container starts.

## Downloads
- Podman Desktop (GUI for Mac/Windows/Linux): https://podman-desktop.io/
- Podman CLI (all OS): https://podman.io/docs/installation

Which one should I use?
- Use Desktop if you want a simple GUI and minimal terminal use.
- Use CLI if you're comfortable in terminal or need scripts/CI.

## Weights
Place your YOLO `.pt` files in `weights/`. They are mounted read-only into the container.