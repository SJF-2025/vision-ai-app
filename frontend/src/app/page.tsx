"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { ThumbsUp } from "@carbon/icons-react";
import { Select, SelectItem, FileUploaderDropContainer, FileUploaderItem, Button } from "@carbon/react";

export default function Home() {
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [availableWeights, setAvailableWeights] = useState<string[]>([]);
  const [selectedWeight, setSelectedWeight] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [boxes, setBoxes] = useState<{ box: number[]; label: string; confidence: number }[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [drawMeta, setDrawMeta] = useState({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    naturalW: 0,
    naturalH: 0,
    containerW: 0,
    containerH: 0,
  });

  useEffect(() => {
    const candidates = [
      process.env.NEXT_PUBLIC_BACKEND_HTTP && `${process.env.NEXT_PUBLIC_BACKEND_HTTP}/weights`,
      "http://localhost:8002/weights",
      "http://127.0.0.1:8002/weights",
    ].filter(Boolean) as string[];

    let attempts = 0;
    let timer: any;

    const fetchOnce = async () => {
      for (const url of candidates) {
        try {
          const r = await fetch(url, { cache: "no-store" });
          if (!r.ok) continue;
          const d = await r.json();
          const list = Array.isArray(d?.weights) ? d.weights : [];
          if (list.length) {
            setAvailableWeights(list);
            if (!selectedWeight) setSelectedWeight(list[0]);
            if (timer) clearInterval(timer);
            return;
          }
        } catch (_) {}
      }
    };

    // Initial try then poll a few times
    fetchOnce();
    timer = setInterval(() => {
      attempts += 1;
      if (attempts > 10) {
        clearInterval(timer);
      } else {
        fetchOnce();
      }
    }, 1500);

    return () => timer && clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Revoke object URLs when files change/unmount
  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [imageUrl, videoUrl]);

  // Compute how the image is fitted inside the container so we can scale boxes
  const recomputeDrawMeta = () => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const nw = (img as HTMLImageElement).naturalWidth || 0;
    const nh = (img as HTMLImageElement).naturalHeight || 0;
    if (!nw || !nh || !cw || !ch) return;
    const scale = Math.min(cw / nw, ch / nh);
    const dispW = nw * scale;
    const dispH = nh * scale;
    const offsetX = (cw - dispW) / 2;
    const offsetY = (ch - dispH) / 2;
    setDrawMeta({ scale, offsetX, offsetY, naturalW: nw, naturalH: nh, containerW: cw, containerH: ch });
  };

  useEffect(() => {
    const handle = () => recomputeDrawMeta();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <main style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 48px)" }}>
      <section
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          marginTop: 16,
          marginBottom: 8,
        }}
      >
        <div style={{ width: "100%", maxWidth: 960 }}>
          <div
            style={{
              width: "100%",
              aspectRatio: "16 / 9",
              border: "1px solid #8d8d8d",
              borderRadius: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              background: "#f4f4f4",
            }}
          >
            <div ref={containerRef} style={{ position: "relative", width: "100%", height: "100%" }}>
              {imageUrl ? (
                <img
                  ref={imgRef}
                  src={imageUrl}
                  alt="uploaded"
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  onLoad={() => recomputeDrawMeta()}
                />
              ) : videoUrl ? (
                <video
                  src={videoUrl}
                  style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }}
                  controls
                />
              ) : (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#8d8d8d",
                    textAlign: "center",
                    padding: 16,
                    gap: 8,
                  }}
                >
                  <span>Get started by adding a source & model weight!</span>
                  <ThumbsUp size={20} aria-hidden="true" />
                </div>
              )}
              {/* Draw boxes */}
              {boxes.map((d, idx) => {
                const [x1, y1, x2, y2] = d.box;
                const left = drawMeta.offsetX + x1 * drawMeta.scale;
                const top = drawMeta.offsetY + y1 * drawMeta.scale;
                const width = (x2 - x1) * drawMeta.scale;
                const height = (y2 - y1) * drawMeta.scale;
                return (
                  <div key={idx} style={{ position: "absolute", left, top, width, height, border: "2px solid #0f62fe" }}>
                    <div style={{ position: "absolute", left: 0, top: -20, background: "#0f62fe", color: "#fff", fontSize: 12, padding: "2px 4px" }}>
                      {d.label} {(d.confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {(() => {
            const labelCounts = boxes.reduce<Record<string, number>>((acc, b) => {
              acc[b.label] = (acc[b.label] || 0) + 1;
              return acc;
            }, {});
            const entries = Object.entries(labelCounts);
            if (!entries.length) return null;
            return (
              <div style={{ marginTop: 12, color: "#525252", fontSize: 16 }}>
                Detected <strong>{entries.length} Categories</strong>: {entries.map(([k, v]) => `${k} (${v})`).join(", ")}
              </div>
            );
          })()}
        </div>
      </section>

      <section style={{ padding: 16, borderTop: "1px solid #e0e0e0", background: "#fff" }}>
        <div style={{ width: "100%", maxWidth: 1200, margin: "0 auto", marginTop: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr 1px 1fr", gap: 32, alignItems: "start" }}>
            {/* Left: 1. Add Source */}
            <div>
              <h3 style={{ margin: "0 0 16px", fontWeight: 400, fontSize: 18 }}>1. Add Source</h3>
              <div>
                <FileUploaderDropContainer
                  accept={[
                    ".jpg",
                    "image/jpeg",
                    ".png",
                    "image/png",
                    "video/*",
                    ".mp4",
                    ".mpeg",
                    ".mpg",
                    ".m4v",
                    ".mov",
                  ]}
                  multiple={false}
                  labelText="Click or drag an image / video here"
                  onAddFiles={(evt: any, { addedFiles }: { addedFiles: File[] }) => {
                    if (!addedFiles || addedFiles.length === 0) return;
                    const f = addedFiles[0];
                    const isImage = f.type.startsWith("image/");
                    const url = URL.createObjectURL(f);
                    if (isImage) {
                      setImageFiles([f]);
                      setImageUrl(url);
                      if (videoUrl) URL.revokeObjectURL(videoUrl);
                      setVideoUrl("");
                    } else {
                      setImageFiles([]);
                      if (imageUrl) URL.revokeObjectURL(imageUrl);
                      setImageUrl("");
                      setVideoUrl(url);
                    }
                  }}
                />
                <div style={{ marginTop: 8 }}>
                  {imageFiles.map((f) => (
                    <FileUploaderItem
                      key={f.name}
                      name={f.name}
                      status="complete"
                      onDelete={() => {
                        setImageFiles([]);
                        if (imageUrl) URL.revokeObjectURL(imageUrl);
                        setImageUrl("");
                      }}
                    />
                  ))}
                  {!imageFiles.length && videoUrl && (
                    <FileUploaderItem
                      key={videoUrl}
                      name={videoUrl.split("/").pop() || "video"}
                      status="complete"
                      onDelete={() => {
                        if (videoUrl) URL.revokeObjectURL(videoUrl);
                        setVideoUrl("");
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ width: 1, background: "#e0e0e0", height: "100%", minHeight: 120 }} />

            {/* Right: 2. Import Model Weight */}
            <div>
              <h3 style={{ margin: "0 0 16px", fontWeight: 400, fontSize: 18 }}>2. Import Model Weight</h3>
              <Select
                id="model-weight-select"
                labelText="Model Weights"
                value={selectedWeight}
                onChange={(e) => setSelectedWeight(e.target.value)}
                style={{ minWidth: 260 }}
              >
                {availableWeights.length === 0 ? (
                  <SelectItem text="No weights found" value="" />
                ) : (
                  availableWeights.map((w) => (
                    <SelectItem key={w} text={w} value={w} />
                  ))
                )}
              </Select>
            </div>

            {/* Divider */}
            <div style={{ width: 1, background: "#e0e0e0", height: "100%", minHeight: 120 }} />

            {/* 3. Start Detection */}
            <div>
              <h3 style={{ margin: "0 0 16px", fontWeight: 400, fontSize: 18 }}>3. Start Detection</h3>
              <p style={{ margin: "0 0 12px", color: "#525252" }}>
                Start object detection using the selected source and uploaded model weights.
              </p>
              <Button
                kind="primary"
                size="md"
                onClick={async () => {
                  // Only support still image for now
                  if (!imageFiles.length && !imageUrl) return;
                  const file = imageFiles[0];
                  const form = new FormData();
                  form.append("file", file);
                  const q = selectedWeight ? `?weight=${encodeURIComponent(selectedWeight)}` : "";
                  const res = await fetch(`http://localhost:8002/predict${q}`, {
                    method: "POST",
                    body: form,
                  });
                  const data = await res.json();
                  setBoxes(Array.isArray(data?.objects) ? data.objects : []);
                }}
              >
                Start Object Detection
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
