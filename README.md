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

## Weights
Place your YOLO `.pt` files in `weights/`. They are mounted read-only into the container.
