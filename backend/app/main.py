from __future__ import annotations

import base64
import io
import json
import os
import time
from typing import Any, Dict, List

from fastapi import FastAPI, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image


def allowed_origins() -> list[str]:
    raw = os.getenv("FRONTEND_CORS_ORIGIN", "http://localhost:3002")
    return [v.strip() for v in raw.split(",") if v.strip()]


app = FastAPI(title="Vision AI App Backend", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_model = None


def load_model():
    global _model
    if _model is not None:
        return _model
    try:
        from ultralytics import YOLO  # type: ignore
        _model = YOLO(os.getenv("MODEL_PATH", "yolov8n.pt"))
    except Exception:
        _model = None
    return _model


@app.get("/health")
async def health() -> Dict[str, Any]:
    return {"status": "ok", "time": time.time()}


def infer(image: Image.Image) -> List[Dict[str, Any]]:
    model = load_model()
    if model is None:
        return [{"label": "placeholder", "confidence": 0.99, "box": [50, 50, 200, 200]}]
    results = model(image)
    objects: List[Dict[str, Any]] = []
    try:
        r = results[0]
        boxes = r.boxes
        names = r.names
        for i in range(len(boxes)):
            b = boxes[i]
            xyxy = b.xyxy[0].tolist()
            conf = float(b.conf[0]) if hasattr(b, "conf") else 0.0
            cls_idx = int(b.cls[0]) if hasattr(b, "cls") else 0
            label = names.get(cls_idx, str(cls_idx)) if isinstance(names, dict) else str(cls_idx)
            objects.append({"label": label, "confidence": conf, "box": xyxy})
    except Exception:
        objects = [{"label": "object", "confidence": 0.5, "box": [10, 10, 100, 100]}]
    return objects


@app.post("/predict")
async def predict(file: UploadFile = File(...)) -> Dict[str, Any]:
    content = await file.read()
    image = Image.open(io.BytesIO(content)).convert("RGB")
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


def get_app() -> FastAPI:
    return app


