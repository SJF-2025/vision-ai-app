# Vision AI App - Podman Quick Start

This container runs both the backend (FastAPI) and frontend (Next.js) in one image.

## Prerequisites
- Podman 4+ installed ([Install guide](https://podman.io/docs/installation))
- macOS: `brew install podman` and `podman machine init && podman machine start`

## Downloads
- Podman Desktop (GUI for Mac/Windows/Linux): [podman-desktop.io](https://podman-desktop.io/)
- Podman CLI (all OS): [podman.io/docs/installation](https://podman.io/docs/installation)

Which one should I use?
- Use Podman Desktop if you prefer a simple GUI, want to avoid the terminal, and just need to run/build locally.
- Use Podman CLI if you're comfortable in the terminal or need automation (scripts/CI/CD/servers).
- Both Desktop and CLI run the same images/containers; you can switch anytime.

## Build
From the `vision-ai-app` folder:

```bash
podman build -t vision-ai-app:latest -f Containerfile .
```

Optional: include full ML deps (PyTorch/Ultralytics). This increases build size/time:
```bash
podman build --build-arg INCLUDE_TORCH=true -t vision-ai-app:full -f Containerfile .
```

## Run
```bash
podman run --rm -p 3000:3000 -p 8002:8002 \
  -e FRONTEND_PORT=3000 \
  -e BACKEND_PORT=8002 \
  -e FRONTEND_CORS_ORIGIN="http://localhost:3000,http://127.0.0.1:3000" \
  -v $(pwd)/weights:/app/weights:Z \
  --name vision-ai-app vision-ai-app:latest
```

- Frontend: http://localhost:3000
- Backend health: http://localhost:8002/health

## Notes
- Mounting `weights/` lets you use local `.pt` files without rebuilding.
- If you need YouTube processing, rebuild with full deps (`--build-arg INCLUDE_TORCH=true`).
- Stop the container with `Ctrl+C`.

## Troubleshooting
- If ports are busy, change host ports with `-p HOST:CONTAINER` mapping.
- On macOS with Podman, ensure the Podman machine is started.
