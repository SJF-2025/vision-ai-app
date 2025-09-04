# VisionAI

## About
VisionAI is a simple full‑stack application for running object detection (YOLOv5) right from your browser. The frontend (Next.js + Carbon) lets you select a media source and start detection, while the backend (FastAPI + Ultralytics) loads YOLO weights and returns bounding boxes and labels. Everything is packaged in a Podman container so both services start with a single command.

**Features
- **Sources**: Local image/video files, or a **Snapshot** URL (e.g., IP camera snapshot).
- **Weights**: Upload a local `.pt` file or use the pretrained `yolov5s.pt`.
- **Detection modes**: Single‑shot detection for images, and live overlay detection for videos.
- **Containerized**: Uses a Python virtual environment inside the container; `weights/` on your machine is bind‑mounted for custom models.

## Requirements
- Podman installed (Desktop or CLI)
- On macOS, start the Podman machine first if needed:

```bash
podman machine start
```

## Downloads
- Podman Desktop (GUI for Mac/Windows/Linux): https://podman-desktop.io/
- Podman CLI (all OS): https://podman.io/docs/installation

Which one should I use?
- Use Desktop if you want a simple GUI and minimal terminal use.
- Use CLI if you're comfortable in terminal or need scripts/CI.

## Quick Start
From this folder (root):

```bash
./run.sh
```

- Frontend: http://localhost:3001
- Backend health: http://localhost:8002/health

To use a different port:
```bash
FRONTEND_PORT=3005 ./run.sh
```

## Weights
Place your YOLO `.pt` files in `weights/`. They are mounted read-only into the container.