"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { FiCamera, FiLink } from "react-icons/fi";
import { Select, SelectItem, FileUploaderDropContainer, FileUploaderItem, Button, TextInput, FormLabel } from "@carbon/react";
import { TrashCan } from "@carbon/icons-react";
import { CheckmarkFilled } from "@carbon/icons-react";

export default function Home() {
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [availableWeights, setAvailableWeights] = useState<string[]>([]);
  const [selectedWeight, setSelectedWeight] = useState<string>("");
  const [uploadedWeightName, setUploadedWeightName] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [boxes, setBoxes] = useState<{ box: number[]; label: string; confidence: number }[]>([]);
  const [sourceKind, setSourceKind] = useState<"local" | "snapshot" | "webcam">("local");
  const [snapshotUrl, setSnapshotUrl] = useState<string>("");
  const [weightSourceKind, setWeightSourceKind] = useState<"local" | "pretrained">("local");
  const wsRef = useRef<WebSocket | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const [webcamOn, setWebcamOn] = useState(false);
  const [drawMeta, setDrawMeta] = useState({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    naturalW: 0,
    naturalH: 0,
    containerW: 0,
    containerH: 0,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [liveOverlay, setLiveOverlay] = useState(false);

  const isWeightReady = weightSourceKind === "local" ? !!uploadedWeightName : !!selectedWeight;

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

  // Ensure a default selection when switching to pretrained
  useEffect(() => {
    if (weightSourceKind === "pretrained" && !selectedWeight) {
      setSelectedWeight("yolov5s.pt");
    }
  }, [weightSourceKind, selectedWeight]);

  // Revoke object URLs when files change/unmount
  useEffect(() => {
    return () => {
      if (imageUrl && imageUrl.startsWith("blob:")) URL.revokeObjectURL(imageUrl);
      if (videoUrl && videoUrl.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
      // Ensure webcam is stopped on unmount
      stopWebcam();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddedFiles = (addedFiles: File[]) => {
    if (!addedFiles || addedFiles.length === 0) return;
    const f = addedFiles[0];
    const mime = f.type || "";
    const n = f.name?.toLowerCase?.() || "";
    const isImage = mime.startsWith("image/") || /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(n);
    const isVideo = mime.startsWith("video/") || /\.(mp4|m4v|mov|mpeg|mpg|avi|mkv|webm)$/i.test(n);
    if (!isImage && !isVideo) return;
    const url = URL.createObjectURL(f);
    if (isImage) {
      setImageFiles([f]);
      setImageUrl(url);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      setVideoUrl("");
    } else if (isVideo) {
      setImageFiles([]);
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      setImageUrl("");
      setVideoUrl(url);
    }
  };

  // Compute how the image is fitted inside the container so we can scale boxes
  const recomputeDrawMeta = () => {
    const container = containerRef.current;
    const img = imgRef.current;
    const vid = videoRef.current;
    if (!container) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const nw = vid && vid.videoWidth ? vid.videoWidth : (img ? img.naturalWidth : 0);
    const nh = vid && vid.videoHeight ? vid.videoHeight : (img ? img.naturalHeight : 0);
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

  // Update preview when snapshot URL changes
  useEffect(() => {
    if (sourceKind !== "snapshot") return;
    if (snapshotUrl) {
      setImageUrl(snapshotUrl);
      setVideoUrl("");
      setImageFiles([]);
    }
  }, [snapshotUrl, sourceKind]);

  // Reset viewer state when changing source kind
  useEffect(() => {
    // Clear detection boxes and live states on any switch
    setBoxes([]);
    setIsPlaying(false);
    setLiveOverlay(false);

    if (sourceKind === "local") {
      // Switched to Local: clear remote preview
      setSnapshotUrl("");
      stopWebcam();
      // Keep previously selected local file if any; clear remote image preview
      if (imageUrl && !imageUrl.startsWith("blob:")) {
        setImageUrl("");
      }
    } else if (sourceKind === "snapshot") {
      // Switched to Snapshot: clear local file/video previews and webcam
      if (imageUrl && imageUrl.startsWith("blob:")) {
        try { URL.revokeObjectURL(imageUrl); } catch {}
      }
      if (videoUrl && videoUrl.startsWith("blob:")) {
        try { URL.revokeObjectURL(videoUrl); } catch {}
      }
      stopWebcam();
      setImageFiles([]);
      setImageUrl("");
      setVideoUrl("");
    } else if (sourceKind === "webcam") {
      // Switching to webcam: clear any file/snapshot previews
      if (imageUrl && imageUrl.startsWith("blob:")) {
        try { URL.revokeObjectURL(imageUrl); } catch {}
      }
      if (videoUrl && videoUrl.startsWith("blob:")) {
        try { URL.revokeObjectURL(videoUrl); } catch {}
      }
      setImageFiles([]);
      setImageUrl("");
      setVideoUrl("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKind]);

  // When webcam is toggled on and the <video> is in the DOM, bind the stream and play
  useEffect(() => {
    if (!webcamOn) return;
    const stream = webcamStreamRef.current;
    const v = videoRef.current;
    if (!stream || !v) return;
    try {
      // @ts-ignore
      v.srcObject = stream;
    } catch {
      (v as any).srcObject = stream as any;
    }
    v.muted = true;
    v.play().then(() => setIsPlaying(true)).catch(() => {});
    const t = setTimeout(recomputeDrawMeta, 100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webcamOn]);

  // Live overlay detection loop for video sources (local file or webcam)
  useEffect(() => {
    if (!(isPlaying && liveOverlay && (sourceKind === "local" || sourceKind === "webcam") && videoRef.current)) return;
    let cancelled = false;
    let lastSent = 0;
    const canvas = document.createElement("canvas");
    const vid = videoRef.current!;
    const tick = async () => {
      if (cancelled) return;
      const now = performance.now();
      if (now - lastSent < 450) {
        requestAnimationFrame(tick);
        return;
      }
      if (vid.videoWidth && vid.videoHeight) {
        canvas.width = vid.videoWidth;
        canvas.height = vid.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
          const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b as Blob), "image/jpeg", 0.8)!);
          const form = new FormData();
          form.append("file", new File([blob], "frame.jpg", { type: "image/jpeg" }));
          const q = selectedWeight ? `?weight=${encodeURIComponent(selectedWeight)}` : "";
          try {
            const res = await fetch(`http://localhost:8002/predict${q}`, { method: "POST", body: form });
            const data = await res.json();
            if (!cancelled) setBoxes(Array.isArray(data?.objects) ? data.objects : []);
          } catch {
            // ignore transient errors
          }
        }
      }
      lastSent = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, liveOverlay, selectedWeight, sourceKind]);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      webcamStreamRef.current = stream;
      // First set on so the <video> renders, then the effect above will bind stream
      setWebcamOn(true);
      // In case the video already exists (e.g., re-enable without unmount), bind immediately too
      const v = videoRef.current;
      if (v) {
        try {
          // @ts-ignore
          v.srcObject = stream;
        } catch {
          (v as any).srcObject = stream as any;
        }
        v.muted = true;
        v.play().then(() => setIsPlaying(true)).catch(() => {});
        setTimeout(recomputeDrawMeta, 100);
      }
    } catch (err) {
      console.error("Failed to start webcam:", err);
    }
  };

  const stopWebcam = () => {
    try {
      const s = webcamStreamRef.current;
      if (s) {
        s.getTracks().forEach((t) => t.stop());
      }
    } catch {}
    webcamStreamRef.current = null;
    try {
      const v = videoRef.current;
      if (v) {
        // @ts-ignore
        v.srcObject = null;
        v.pause();
      }
    } catch {}
    setWebcamOn(false);
    setIsPlaying(false);
    setLiveOverlay(false);
    setBoxes([]);
  };

  const handleResetViewer = () => {
    try {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    } catch {}
    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
      wsRef.current = null;
    }
    if (imageUrl && imageUrl.startsWith("blob:")) URL.revokeObjectURL(imageUrl);
    if (videoUrl && videoUrl.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
    stopWebcam();
    setImageFiles([]);
    setImageUrl("");
    setVideoUrl("");
    setBoxes([]);
    setIsPlaying(false);
    setLiveOverlay(false);
  };

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
          { /* Border switches to dashed when empty, solid when media is present */ }
          { /* hasMedia used below via inline expression */ }
          <div
            style={{
              width: "100%",
              aspectRatio: "16 / 9",
              border: (imageUrl || videoUrl || webcamOn) ? "1px solid #8d8d8d" : "1px dashed #8d8d8d",
              borderRadius: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              background: "#fcfcfc",
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
              ) : (videoUrl || webcamOn) ? (
                <div style={{ position: "relative", width: "100%", height: "100%" }}>
                  <video
                    ref={videoRef}
                    src={videoUrl || undefined}
                    style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }}
                    onLoadedMetadata={() => { recomputeDrawMeta(); }}
                    onPlay={() => { setIsPlaying(true); }}
                    onPause={() => { setIsPlaying(false); }}
                    autoPlay={webcamOn}
                    playsInline
                    controls={false}
                  />
                </div>
              ) : (
                  <div
                    style={{ position: "absolute", inset: 0, cursor: sourceKind === "local" ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center" }}
                    onClick={sourceKind === "local" ? () => fileInputRef.current?.click() : undefined}
                    onDragOver={sourceKind === "local" ? (e) => { e.preventDefault(); } : undefined}
                    onDrop={sourceKind === "local" ? (e) => { e.preventDefault(); const files = Array.from(e.dataTransfer.files); handleAddedFiles(files as File[]); } : undefined}
                  >
                    <span style={{ color: (sourceKind === "snapshot" || sourceKind === "webcam") ? "#8d8d8d" : "#0f62fe", display: "inline-flex", alignItems: "center", gap: 8, textAlign: "center", padding: 8 }}>
                      {sourceKind === "webcam"
                        ? (<>
                            Enable Webcam below. <FiCamera aria-hidden="true" />
                          </>)
                        : sourceKind === "snapshot"
                        ? (<>
                            Add Source in Snapshot URL field. <FiLink aria-hidden="true" />
                          </>)
                        : (<>
                            Get started by adding an image or video here! <FiCamera aria-hidden="true" />
                          </>)}
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const files = e.target.files ? Array.from(e.target.files) : [];
                        handleAddedFiles(files as File[]);
                        if (e.currentTarget) e.currentTarget.value = "";
                      }}
                    />
                  </div>
              )}
              {/* Controls overlay: clear/reset button */}
              {(imageUrl || videoUrl || webcamOn) && (
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 3 }}>
                  <div style={{ position: "absolute", right: 12, bottom: 12, pointerEvents: "auto" }}>
                    <Button
                      hasIconOnly
                      iconDescription="Clear source"
                      renderIcon={TrashCan}
                      kind="tertiary"
                      size="sm"
                      onClick={handleResetViewer}
                    />
                  </div>
                </div>
              )}

              
              {/* Draw boxes in overlay above media */}
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 }}>
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
                {(() => {
                  const labelCounts = boxes.reduce<Record<string, number>>((acc, b) => {
                    acc[b.label] = (acc[b.label] || 0) + 1;
                    return acc;
                  }, {});
                  const entries = Object.entries(labelCounts);
                  if (!entries.length) return null;
                  return (
                    <div style={{ position: "absolute", left: 8, bottom: 8, background: "rgba(255,255,255,0.9)", color: "#525252", fontSize: 14, padding: "4px 8px", borderRadius: 2 }}>
                      Detected <strong>{entries.length} Categories</strong>: {entries.map(([k, v]) => `${k} (${v})`).join(", ")}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* categories are shown inside the preview, bottom-left, to avoid layout shifts */}
        </div>
      </section>

      <section style={{ padding: 16, borderTop: "1px solid #e0e0e0", background: "#fff" }}>
        <div style={{ width: "100%", maxWidth: 1200, margin: "0 auto", marginTop: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr 1px 1fr", columnGap: 0, alignItems: "start" }}>
            {/* Left: 1. Add Source */}
            <div style={{ padding: "0 48px" }}>
              <h3 style={{ margin: "0 0 16px", fontWeight: 400, fontSize: 18 }}>1. Choose File Source</h3>
              <div style={{ marginBottom: 16 }}>
                <Select
                  id="choose-source-kind"
                  labelText="Source"
                  value={sourceKind}
                  onChange={(e) => setSourceKind(e.target.value as any)}
                >
                  <SelectItem text="Local File" value="local" />
                  <SelectItem text="Snapshot" value="snapshot" />
                  <SelectItem text="Webcam" value="webcam" />
                </Select>
              </div>
              <div>
                {sourceKind === "local" ? (
                  <>
                    <FormLabel style={{ display: "block", marginBottom: 8 }}>File</FormLabel>
                    <FileUploaderDropContainer
                    accept={["image/*", "video/*"]}
                    multiple={false}
                    labelText="Click or drag an image / video here"
                    onAddFiles={(evt: any, { addedFiles }: { addedFiles: File[] }) => {
                      if (!addedFiles || addedFiles.length === 0) return;
                      const f = addedFiles[0];
                      const mime = f.type || "";
                      const n = f.name?.toLowerCase?.() || "";
                      const isImage = mime.startsWith("image/") || /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(n);
                      const isVideo = mime.startsWith("video/") || /\.(mp4|m4v|mov|mpeg|mpg|avi|mkv|webm)$/i.test(n);
                      if (!isImage && !isVideo) return;
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
                    style={{ height: 40, display: "flex", alignItems: "center" } as any}
                  />
                  </>
                ) : sourceKind === "snapshot" ? (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <FormLabel style={{ display: "block", marginBottom: 0 }}>Snapshot URL</FormLabel>
                      {snapshotUrl && (
                        <CheckmarkFilled size={16} aria-hidden="true" style={{ color: "#0f62fe" }} />
                      )}
                    </div>
                    <div>
                      <TextInput
                        id="snapshot-url-input"
                        hideLabel
                        labelText="Snapshot URL"
                        placeholder="http://<ip-address>/snapshot.jpg"
                        value={snapshotUrl}
                        onChange={(e: any) => setSnapshotUrl(e.target.value)}
                      />
                    </div>
                  </div>
                ) : sourceKind === "webcam" ? (
                  <div>
                    <Button
                      kind={webcamOn ? "danger--tertiary" : "primary"}
                      size="md"
                      onClick={async () => {
                        if (webcamOn) {
                          stopWebcam();
                        } else {
                          await startWebcam();
                        }
                      }}
                    >
                      {webcamOn ? "Disable Webcam" : "Enable Webcam"}
                    </Button>
                  </div>
                ) : null}
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
            <div style={{ padding: "0 48px" }}>
              <h3 style={{ margin: "0 0 16px", fontWeight: 400, fontSize: 18 }}>2. Import Model Weight</h3>
              <div style={{ marginBottom: 16 }}>
                <Select
                  id="weight-source-kind"
                  labelText="Source"
                  value={weightSourceKind}
                  onChange={(e) => setWeightSourceKind(e.target.value as any)}
                >
                  <SelectItem text="Local Weight" value="local" />
                  <SelectItem text="Pretrained Weight" value="pretrained" />
                </Select>
              </div>
              {weightSourceKind === "local" ? (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <FormLabel style={{ display: "block", marginBottom: 0 }}>Local Weight</FormLabel>
                  </div>
                  <FileUploaderDropContainer
                    accept={[ ".pt" ]}
                    multiple={false}
                    labelText="Click or drag a weight file here (.pt)"
                    onAddFiles={async (_evt: any, { addedFiles }: { addedFiles: File[] }) => {
                      if (!addedFiles || !addedFiles.length) return;
                      const f = addedFiles[0];
                      const form = new FormData();
                      form.append("file", f);
                      try {
                        await fetch("http://localhost:8002/upload-weight", { method: "POST", body: form });
                        setUploadedWeightName(f.name);
                        setSelectedWeight(f.name);
                        // Refresh list
                        const r = await fetch("http://localhost:8002/weights", { cache: "no-store" });
                        if (r.ok) {
                          const d = await r.json();
                          const list = Array.isArray(d?.weights) ? d.weights : [];
                          setAvailableWeights(list);
                        }
                      } catch {}
                    }}
                    style={{ height: 40, display: "flex", alignItems: "center" } as any}
                  />
                  <div style={{ marginTop: 8 }}>
                    {uploadedWeightName && (
                      <FileUploaderItem
                        key={uploadedWeightName}
                        name={uploadedWeightName}
                        status="complete"
                        onDelete={() => {
                          setUploadedWeightName("");
                          setSelectedWeight("");
                        }}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <Select
                  id="pretrained-weight-select"
                  labelText="Pretrained Weight"
                  value={selectedWeight || "yolov5s.pt"}
                  onChange={(e) => setSelectedWeight(e.target.value)}
                  style={{ minWidth: 260 }}
                >
                  <SelectItem text="yolov5s.pt" value="yolov5s.pt" />
                </Select>
              )}
            </div>

            {/* Divider */}
            <div style={{ width: 1, background: "#e0e0e0", height: "100%", minHeight: 120 }} />

            {/* 3. Start Detection */}
            <div style={{ padding: "0 48px" }}>
              <h3 style={{ margin: "0 0 16px", fontWeight: 400, fontSize: 18 }}>3. Start Object Detection</h3>
              <p style={{ margin: "0 0 12px", color: "#525252" }}>
                Start object detection using the selected source and uploaded model weights.
              </p>
              <Button
                kind="primary"
                size="md"
                disabled={!isWeightReady}
                onClick={async () => {
                  if (!isWeightReady) return;
                  // Webcam toggles
                  if (sourceKind === "webcam") {
                    if (liveOverlay) {
                      // Stop live detection but keep webcam preview
                      setLiveOverlay(false);
                      setBoxes([]);
                      return;
                    }
                    if (webcamOn) {
                      // Webcam already enabled; just start overlay
                      setLiveOverlay(true);
                      return;
                    }
                    await startWebcam();
                    setLiveOverlay(true);
                    return;
                  }
                  // Single control for live detection on local video file
                  if (sourceKind === "local" && videoUrl) {
                    if (liveOverlay) {
                      // Stop live detection
                      setLiveOverlay(false);
                      try { const v = videoRef.current; if (v) v.pause(); } catch {}
                    } else {
                      // Start live detection: enable overlay and start playback
                      setLiveOverlay(true);
                      try { const v = videoRef.current; if (v) await v.play(); } catch {}
                    }
                    return;
                  }
                  // Single-shot detection for still images (including snapshot URL)
                  const form = new FormData();
                  if (!imageFiles.length && !imageUrl) return;
                  const file = imageFiles[0];
                  form.append("file", file);
                  const q = selectedWeight ? `?weight=${encodeURIComponent(selectedWeight)}` : "";
                  const res = await fetch(`http://localhost:8002/predict${q}`, { method: "POST", body: form });
                  const data = await res.json();
                  setBoxes(Array.isArray(data?.objects) ? data.objects : []);
                }}
              >
                {(sourceKind === "local" && videoUrl) || sourceKind === "webcam"
                  ? (liveOverlay ? "Stop Live Detection" : "Start Live Detection")
                  : "Start Object Detection"}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
