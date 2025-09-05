# VisionAI

## 🌟 Try the Live Demo

**[🚀 Live Demo on GitHub Pages](https://sjf-2025.github.io/vision-ai-app)**

Experience the VisionAI interface with sample images and simulated object detection - no setup required!

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