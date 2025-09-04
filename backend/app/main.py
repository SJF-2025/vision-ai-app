from __future__ import annotations

import base64
import io
import json
import os
import time
from typing import Any, Dict, List
import asyncio

from fastapi import FastAPI, File, UploadFile, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import numpy as np
try:
    import cv2  # type: ignore
except Exception:  # pragma: no cover
    cv2 = None


def allowed_origins() -> list[str]:
    raw = os.getenv(
        "FRONTEND_CORS_ORIGIN",
        "http://localhost:3002,http://127.0.0.1:3002",
    )
    return [v.strip() for v in raw.split(",") if v.strip()]


app = FastAPI(title="Vision AI App Backend", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_model_v5 = None
_current_weight_path: str | None = None


def _weights_dir() -> str:
    return os.path.normpath(
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "weights")
    )


def load_model_v5(requested_weight: str | None = None):
    global _model_v5
    global _current_weight_path
    # Resolve which weight to use
    default_path = os.path.join(_weights_dir(), "yolov5s.pt")
    if requested_weight:
        # If provided a filename, resolve relative to weights dir
        if not os.path.isabs(requested_weight):
            model_path = os.path.join(_weights_dir(), requested_weight)
        else:
            model_path = requested_weight
    else:
        model_path = os.getenv("MODEL_PATH", default_path)

    # Reload model if path changed or not yet loaded
    if _model_v5 is not None and _current_weight_path == model_path:
        return _model_v5
    # Load YOLO model locally using Ultralytics without network access
    # Lazy import so simple endpoints like /weights don't require it
    from ultralytics import YOLO  # type: ignore
    _model_v5 = YOLO(model_path)
    _current_weight_path = model_path
    return _model_v5


@app.get("/health")
async def health() -> Dict[str, Any]:
    return {"status": "ok", "time": time.time()}


def infer(image: Image.Image) -> List[Dict[str, Any]]:
    model = load_model_v5()
    frame = np.array(image)  # RGB
    results = model(frame)
    r = results[0]
    names = getattr(r, "names", getattr(model, "names", {}))
    dets: List[Dict[str, Any]] = []
    boxes = getattr(r, "boxes", None)
    if boxes is None or boxes.xyxy is None:
        return dets
    xyxy = boxes.xyxy.cpu().numpy()
    conf = boxes.conf.cpu().numpy()
    cls = boxes.cls.cpu().numpy()
    for i in range(xyxy.shape[0]):
        x1, y1, x2, y2 = [float(v) for v in xyxy[i].tolist()]
        c = float(conf[i])
        k = int(cls[i])
        label = names[k] if isinstance(names, dict) and k in names else str(k)
        dets.append({"label": label, "confidence": c, "box": [x1, y1, x2, y2]})
    return dets


@app.get("/weights")
async def list_weights() -> Dict[str, Any]:
    exts = {".pt", ".onnx", ".engine"}
    wdir = _weights_dir()
    try:
        files = [f for f in os.listdir(wdir) if os.path.splitext(f)[1].lower() in exts]
        files.sort()
    except Exception:
        files = []
    return {"weights": files}


@app.post("/upload-weight")
async def upload_weight(file: UploadFile = File(...)) -> Dict[str, Any]:
    allowed_exts = {".pt", ".onnx", ".engine"}
    name = os.path.basename(file.filename or "")
    _, ext = os.path.splitext(name)
    if not name or ext.lower() not in allowed_exts:
        return {"error": "unsupported file type"}
    wdir = _weights_dir()
    os.makedirs(wdir, exist_ok=True)
    dest = os.path.join(wdir, name)
    content = await file.read()
    with open(dest, "wb") as f:
        f.write(content)
    return {"ok": True, "name": name}


@app.post("/predict")
async def predict(file: UploadFile = File(...), weight: str | None = Query(default=None)) -> Dict[str, Any]:
    content = await file.read()
    image = Image.open(io.BytesIO(content)).convert("RGB")
    # Ensure the model is loaded for the requested weight (if any)
    load_model_v5(weight)
    return {"objects": infer(image), "ts": time.time()}


@app.websocket("/ws/detect")
async def ws_detect(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
                b64 = payload.get("image")
                if not b64:
                    await websocket.send_text(json.dumps({"error": "missing image"}))
                    continue
                image_bytes = base64.b64decode(b64.split(",")[-1])
                image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
                await websocket.send_text(json.dumps({"objects": infer(image), "ts": time.time()}))
            except Exception as e:
                await websocket.send_text(json.dumps({"error": str(e)}))
    except WebSocketDisconnect:
        return


@app.websocket("/ws/youtube")
async def ws_youtube(websocket: WebSocket, weight: str | None = None) -> None:
    await websocket.accept()
    if cv2 is None:
        await websocket.send_text(json.dumps({"error": "opencv not installed"}))
        await websocket.close()
        return
    try:
        first = await websocket.receive_text()
        payload = json.loads(first)
        url = payload.get("url")
        if not url:
            await websocket.send_text(json.dumps({"error": "missing url"}))
            await websocket.close()
            return
        # Ensure model is loaded for the requested weight
        load_model_v5(weight)

        # Use yt-dlp to resolve a progressive stream URL (mp4/http) if possible
        import yt_dlp  # type: ignore

        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "format": "best[protocol^=http][ext=mp4]/best[protocol^=https][ext=mp4]/best",
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:  # type: ignore
            info = ydl.extract_info(url, download=False)
            stream_url = info.get("url")
        if not stream_url:
            await websocket.send_text(json.dumps({"error": "unable to resolve stream"}))
            await websocket.close()
            return

        async def loop_with_cv2(surl: str) -> bool:
            cap = cv2.VideoCapture(surl)  # type: ignore
            if not cap.isOpened():
                return False
            try:
                last_sent = 0.0
                while True:
                    # Allow stop via client message
                    try:
                        msg = await asyncio.wait_for(websocket.receive_text(), timeout=0.0)
                        if msg == "stop":
                            break
                    except Exception:
                        pass
                    ok, frame = cap.read()
                    if not ok:
                        await asyncio.sleep(0.05)
                        continue
                    now = time.time()
                    if now - last_sent < 0.5:
                        await asyncio.sleep(0.01)
                        continue
                    last_sent = now
                    img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))  # type: ignore
                    objects = infer(img)
                    await websocket.send_text(json.dumps({"objects": objects, "ts": now}))
                return True
            finally:
                cap.release()

        # Try OpenCV first; if it fails, fall back to imageio-ffmpeg
        ok_cv = False
        if cv2 is not None:
            try:
                ok_cv = await loop_with_cv2(stream_url)
            except Exception:
                ok_cv = False
        if not ok_cv:
            import imageio.v3 as iio  # type: ignore
            last_sent = 0.0
            try:
                for frame in iio.imiter(stream_url, plugin="ffmpeg", output_format="rgb24"):
                    try:
                        msg = await asyncio.wait_for(websocket.receive_text(), timeout=0.0)
                        if msg == "stop":
                            break
                    except Exception:
                        pass
                    now = time.time()
                    if now - last_sent < 0.5:
                        await asyncio.sleep(0.005)
                        continue
                    last_sent = now
                    img = Image.fromarray(frame)
                    objects = infer(img)
                    await websocket.send_text(json.dumps({"objects": objects, "ts": now}))
            except Exception as e:
                await websocket.send_text(json.dumps({"error": str(e)}))
    except WebSocketDisconnect:
        return
    except Exception as e:  # pragma: no cover
        try:
            await websocket.send_text(json.dumps({"error": str(e)}))
        finally:
            await websocket.close()


def get_app() -> FastAPI:
    return app


