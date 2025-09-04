# Vision AI App

Start the full stack (frontend + backend) in one command.

## Quick Start
From this folder:

```bash
./run.sh
```

- Frontend: http://localhost:3000
- Backend health: http://localhost:8002/health

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

## Weights
Place your YOLO `.pt` files in `weights/`. They are mounted read-only into the container.
