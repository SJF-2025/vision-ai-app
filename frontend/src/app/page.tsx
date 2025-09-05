"use client";

import { useState, useEffect, useRef } from "react";
import { FiCamera, FiLink } from "react-icons/fi";
import { Select, SelectItem, FileUploaderDropContainer, FileUploaderItem, Button, TextInput, FormLabel, InlineNotification } from "@carbon/react";
import { TrashCan, View } from "@carbon/icons-react";
import { CheckmarkFilled } from "@carbon/icons-react";
import { DEMO_IMAGES, DEMO_WEIGHTS, simulateDetection, type DetectionBox } from "../data/demoData";

export default function Home() {
  // Demo mode - since we can't run backend on GitHub Pages
  const IS_DEMO_MODE = true;
  
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [availableWeights, setAvailableWeights] = useState<string[]>(DEMO_WEIGHTS);
  const [selectedWeight, setSelectedWeight] = useState<string>("yolov5s.pt");
  const [uploadedWeightName, setUploadedWeightName] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [boxes, setBoxes] = useState<DetectionBox[]>([]);
  const [sourceKind, setSourceKind] = useState<"local" | "snapshot" | "webcam" | "demo">("demo");
  const [snapshotUrl, setSnapshotUrl] = useState<string>("");
  const [weightSourceKind, setWeightSourceKind] = useState<"local" | "pretrained">("pretrained");
  const [selectedDemoImage, setSelectedDemoImage] = useState<string>("");
  const [isDetecting, setIsDetecting] = useState(false);
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
  const [isNarrow, setIsNarrow] = useState(false);

  const isWeightReady = weightSourceKind === "local" ? !!uploadedWeightName : !!selectedWeight;

  useEffect(() => {
    const onResize = () => setIsNarrow(typeof window !== "undefined" && window.innerWidth < 1100);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    // Demo mode initialization - no backend calls
    if (IS_DEMO_MODE) {
      setAvailableWeights(DEMO_WEIGHTS);
      if (!selectedWeight) setSelectedWeight(DEMO_WEIGHTS[0]);
    }
  }, []);

  useEffect(() => {
    if (weightSourceKind === "pretrained" && !selectedWeight) {
      setSelectedWeight("yolov5s.pt");
    }
  }, [weightSourceKind, selectedWeight]);

  useEffect(() => {
    return () => {
      if (imageUrl && imageUrl.startsWith("blob:")) URL.revokeObjectURL(imageUrl);
      if (videoUrl && videoUrl.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
      stopWebcam();
    };
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
  }, []);

  useEffect(() => {
    if (sourceKind !== "demo") return;
    if (selectedDemoImage) {
      const demoImage = DEMO_IMAGES.find(img => img.id === selectedDemoImage);
      if (demoImage) {
        setImageUrl(demoImage.url);
        setVideoUrl("");
        setImageFiles([]);
      }
    }
  }, [selectedDemoImage, sourceKind]);

  useEffect(() => {
    if (sourceKind !== "snapshot") return;
    if (snapshotUrl) {
      setImageUrl(snapshotUrl);
      setVideoUrl("");
      setImageFiles([]);
    }
  }, [snapshotUrl, sourceKind]);

  useEffect(() => {
    setBoxes([]);
    setIsPlaying(false);
    setLiveOverlay(false);

    if (sourceKind === "local") {
      setSnapshotUrl("");
      setSelectedDemoImage("");
      stopWebcam();
      if (imageUrl && !imageUrl.startsWith("blob:") && !imageUrl.includes("sample-images")) {
        setImageUrl("");
      }
    } else if (sourceKind === "snapshot") {
      if (imageUrl && imageUrl.startsWith("blob:")) {
        try { URL.revokeObjectURL(imageUrl); } catch {}
      }
      if (videoUrl && videoUrl.startsWith("blob:")) {
        try { URL.revokeObjectURL(videoUrl); } catch {}
      }
      setSelectedDemoImage("");
      stopWebcam();
      setImageFiles([]);
      setImageUrl("");
      setVideoUrl("");
    } else if (sourceKind === "webcam") {
      if (imageUrl && imageUrl.startsWith("blob:")) {
        try { URL.revokeObjectURL(imageUrl); } catch {}
      }
      if (videoUrl && videoUrl.startsWith("blob:")) {
        try { URL.revokeObjectURL(videoUrl); } catch {}
      }
      setSelectedDemoImage("");
      setImageFiles([]);
      setImageUrl("");
      setVideoUrl("");
    } else if (sourceKind === "demo") {
      if (imageUrl && imageUrl.startsWith("blob:")) {
        try { URL.revokeObjectURL(imageUrl); } catch {}
      }
      if (videoUrl && videoUrl.startsWith("blob:")) {
        try { URL.revokeObjectURL(videoUrl); } catch {}
      }
      stopWebcam();
      setImageFiles([]);
      setSnapshotUrl("");
      if (!selectedDemoImage) {
        setImageUrl("");
      }
    }
  }, [sourceKind]);

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
  }, [webcamOn]);

  useEffect(() => {
    // Demo mode: simulate live detection for videos/webcam
    if (!(isPlaying && liveOverlay && (sourceKind === "local" || sourceKind === "webcam") && videoRef.current)) return;
    if (!IS_DEMO_MODE) return; // Skip if not in demo mode
    
    let cancelled = false;
    let lastDetection = 0;
    
    const simulateLiveDetection = async () => {
      if (cancelled) return;
      const now = performance.now();
      if (now - lastDetection < 2000) { // Every 2 seconds
        setTimeout(simulateLiveDetection, 500);
        return;
      }
      
      try {
        const detections = await simulateDetection();
        if (!cancelled) setBoxes(detections);
      } catch {}
      
      lastDetection = now;
      setTimeout(simulateLiveDetection, 500);
    };
    
    setTimeout(simulateLiveDetection, 1000);
    return () => { cancelled = true; };
  }, [isPlaying, liveOverlay, selectedWeight, sourceKind]);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      webcamStreamRef.current = stream;
      setWebcamOn(true);
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

  const handleDetection = async () => {
    if (!isWeightReady) return;
    
    // Handle webcam
    if (sourceKind === "webcam") {
      if (liveOverlay) { 
        setLiveOverlay(false); 
        setBoxes([]); 
        return; 
      }
      if (webcamOn) { 
        setLiveOverlay(true); 
        return; 
      }
      await startWebcam(); 
      setLiveOverlay(true); 
      return;
    }
    
    // Handle video
    if (sourceKind === "local" && videoUrl) {
      if (liveOverlay) { 
        setLiveOverlay(false); 
        try { 
          const v = videoRef.current; 
          if (v) v.pause(); 
        } catch {} 
      } else { 
        setLiveOverlay(true); 
        try { 
          const v = videoRef.current; 
          if (v) await v.play(); 
        } catch {} 
      }
      return;
    }
    
    // Handle demo images
    if (sourceKind === "demo" && selectedDemoImage) {
      setIsDetecting(true);
      const demoImage = DEMO_IMAGES.find(img => img.id === selectedDemoImage);
      if (demoImage) {
        // Simulate detection delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        setBoxes(demoImage.detections);
      }
      setIsDetecting(false);
      return;
    }
    
    // Handle uploaded files (demo mode)
    if (IS_DEMO_MODE && (imageFiles.length > 0 || imageUrl)) {
      setIsDetecting(true);
      try {
        const detections = await simulateDetection(imageFiles[0]);
        setBoxes(detections);
      } catch (error) {
        console.error('Demo detection failed:', error);
        setBoxes([]);
      }
      setIsDetecting(false);
      return;
    }
    
    // If we reach here and not in demo mode, show error
    if (!IS_DEMO_MODE) {
      alert('Backend connection required for this feature');
    }
  };

  const stopWebcam = () => {
    try {
      const s = webcamStreamRef.current;
      if (s) s.getTracks().forEach((t) => t.stop());
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
      {IS_DEMO_MODE && (
        <section style={{ padding: "16px", background: "#f1f3f4", borderBottom: "1px solid #e0e0e0" }}>
          <div style={{ maxWidth: "min(1100px, 90vw)", margin: "0 auto" }}>
            <InlineNotification
              kind="info"
              title="Demo Mode"
              subtitle="This is a demonstration version running on GitHub Pages. Try the sample images below or upload your own for simulated object detection."
              hideCloseButton
            />
          </div>
        </section>
      )}
      <section
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: isNarrow ? 8 : 16,
          marginTop: 16,
          marginBottom: 8,
        }}
      >
        <div style={{ width: "100%", maxWidth: "min(1100px, 90vw)" }}>
          <div
            style={{
              width: "100%",
              aspectRatio: "16 / 9",
              maxHeight: "52vh",
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
                        ? (<>Enable Webcam below. <FiCamera aria-hidden="true" /></>)
                        : sourceKind === "snapshot"
                        ? (<>Add Source in Snapshot URL field. <FiLink aria-hidden="true" /></>)
                        : (<>Get started by adding an image or video here! <FiCamera aria-hidden="true" /></>)}
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

          {/* categories overlay handled above to avoid layout shift */}
        </div>
      </section>

      <section style={{ padding: isNarrow ? 8 : 16, borderTop: "1px solid #e0e0e0", background: "#fff" }}>
        <div style={{ width: "100%", maxWidth: "min(1100px, 90vw)", margin: "0 auto", marginTop: 16 }}>
          {isNarrow ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ padding: "0 8px" }}>
                <h3 style={{ margin: "0 0 16px", fontWeight: 400, fontSize: 18 }}>1. Choose File Source</h3>
                <div style={{ marginBottom: 16 }}>
                  <Select id="choose-source-kind" labelText="Source" value={sourceKind} onChange={(e) => setSourceKind(e.target.value as any)}>
                    <SelectItem text="Demo Images" value="demo" />
                    <SelectItem text="Local File" value="local" />
                    <SelectItem text="Snapshot" value="snapshot" />
                    <SelectItem text="Webcam" value="webcam" />
                  </Select>
                </div>
                {/* reuse same body from wide layout */}
                {/* START source body */}
                <div>
                  {sourceKind === "demo" ? (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                        <FormLabel style={{ display: "block", marginBottom: 0 }}>Sample Images</FormLabel>
                        {selectedDemoImage && (
                          <CheckmarkFilled size={16} aria-hidden="true" style={{ color: "#0f62fe" }} />
                        )}
                      </div>
                      <Select id="demo-image-select" labelText="Choose a sample image" value={selectedDemoImage} onChange={(e) => setSelectedDemoImage(e.target.value)}>
                        <SelectItem text="Select an image..." value="" />
                        {DEMO_IMAGES.map(img => (
                          <SelectItem key={img.id} text={img.name} value={img.id} />
                        ))}
                      </Select>
                      {selectedDemoImage && (
                        <p style={{ marginTop: 8, fontSize: 12, color: "#525252" }}>
                          {DEMO_IMAGES.find(img => img.id === selectedDemoImage)?.description}
                        </p>
                      )}
                    </div>
                  ) : sourceKind === "local" ? (
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
                        <TextInput id="snapshot-url-input" hideLabel labelText="Snapshot URL" placeholder="http://<ip-address>/snapshot.jpg" value={snapshotUrl} onChange={(e: any) => setSnapshotUrl(e.target.value)} />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Button kind={webcamOn ? "danger--tertiary" : "primary"} size="md" onClick={async () => { if (webcamOn) { stopWebcam(); } else { await startWebcam(); } }}> {webcamOn ? "Disable Webcam" : "Enable Webcam"}</Button>
                    </div>
                  )}
                </div>
                {/* END source body */}
              </div>

              <div style={{ height: 1, background: "#e0e0e0" }} />

              <div style={{ padding: "0 8px" }}>
                <h3 style={{ margin: "0 0 16px", fontWeight: 400, fontSize: 18 }}>2. Import Model Weight</h3>
                <div style={{ marginBottom: 16 }}>
                  <Select id="weight-source-kind" labelText="Source" value={weightSourceKind} onChange={(e) => setWeightSourceKind(e.target.value as any)}>
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
                          await fetch(`${""}/upload-weight`, { method: "POST", body: form });
                          setUploadedWeightName(f.name);
                          setSelectedWeight(f.name);
                          const r = await fetch(`${""}/weights`, { cache: "no-store" });
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
                        <FileUploaderItem key={uploadedWeightName} name={uploadedWeightName} status="complete" onDelete={() => { setUploadedWeightName(""); setSelectedWeight(""); }} />
                      )}
                    </div>
                  </div>
                ) : (
                  <Select id="pretrained-weight-select" labelText="Pretrained Weight" value={selectedWeight || "yolov5s.pt"} onChange={(e) => setSelectedWeight(e.target.value)} style={{ minWidth: 260 }}>
                    <SelectItem text="yolov5s.pt" value="yolov5s.pt" />
                  </Select>
                )}
              </div>

              <div style={{ height: 1, background: "#e0e0e0" }} />

              <div style={{ padding: "0 8px" }}>
                <h3 style={{ margin: "0 0 16px", fontWeight: 400, fontSize: 18 }}>3. Start Object Detection</h3>
                <p style={{ margin: "0 0 12px", color: "#525252" }}>
                  Start object detection using the selected source and uploaded model weights.
                </p>
                <Button 
                  kind="primary" 
                  size="md" 
                  disabled={!isWeightReady || isDetecting} 
                  onClick={handleDetection}
                >
                  {isDetecting ? "Detecting..." : 
                   (sourceKind === "local" && videoUrl) || sourceKind === "webcam" ? 
                     (liveOverlay ? "Stop Live Detection" : "Start Live Detection") : 
                     "Start Object Detection"}
                </Button>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr 1px 1fr", columnGap: 0, alignItems: "start" }}>
              {/* Left: 1. Add Source */}
              <div style={{ padding: "0 48px" }}>
                <h3 style={{ margin: "0 0 16px", fontWeight: 400, fontSize: 18 }}>1. Choose File Source</h3>
                <div style={{ marginBottom: 16 }}>
                  <Select id="choose-source-kind" labelText="Source" value={sourceKind} onChange={(e) => setSourceKind(e.target.value as any)}>
                    <SelectItem text="Demo Images" value="demo" />
                    <SelectItem text="Local File" value="local" />
                    <SelectItem text="Snapshot" value="snapshot" />
                    <SelectItem text="Webcam" value="webcam" />
                  </Select>
                </div>
                <div>
                  {sourceKind === "demo" ? (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                        <FormLabel style={{ display: "block", marginBottom: 0 }}>Sample Images</FormLabel>
                        {selectedDemoImage && (
                          <CheckmarkFilled size={16} aria-hidden="true" style={{ color: "#0f62fe" }} />
                        )}
                      </div>
                      <Select id="demo-image-select-wide" labelText="Choose a sample image" value={selectedDemoImage} onChange={(e) => setSelectedDemoImage(e.target.value)}>
                        <SelectItem text="Select an image..." value="" />
                        {DEMO_IMAGES.map(img => (
                          <SelectItem key={img.id} text={img.name} value={img.id} />
                        ))}
                      </Select>
                      {selectedDemoImage && (
                        <p style={{ marginTop: 8, fontSize: 12, color: "#525252" }}>
                          {DEMO_IMAGES.find(img => img.id === selectedDemoImage)?.description}
                        </p>
                      )}
                    </div>
                  ) : sourceKind === "local" ? (
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
                        <TextInput id="snapshot-url-input" hideLabel labelText="Snapshot URL" placeholder="http://<ip-address>/snapshot.jpg" value={snapshotUrl} onChange={(e: any) => setSnapshotUrl(e.target.value)} />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Button kind={webcamOn ? "danger--tertiary" : "primary"} size="md" onClick={async () => { if (webcamOn) { stopWebcam(); } else { await startWebcam(); } }}> {webcamOn ? "Disable Webcam" : "Enable Webcam"}</Button>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ width: 1, background: "#e0e0e0", height: "100%", minHeight: 120 }} />

              <div style={{ padding: "0 48px" }}>
                <h3 style={{ margin: "0 0 16px", fontWeight: 400, fontSize: 18 }}>2. Import Model Weight</h3>
                <div style={{ marginBottom: 16 }}>
                  <Select id="weight-source-kind" labelText="Source" value={weightSourceKind} onChange={(e) => setWeightSourceKind(e.target.value as any)}>
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
                          await fetch(`${""}/upload-weight`, { method: "POST", body: form });
                          setUploadedWeightName(f.name);
                          setSelectedWeight(f.name);
                          const r = await fetch(`${""}/weights`, { cache: "no-store" });
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
                        <FileUploaderItem key={uploadedWeightName} name={uploadedWeightName} status="complete" onDelete={() => { setUploadedWeightName(""); setSelectedWeight(""); }} />
                      )}
                    </div>
                  </div>
                ) : (
                  <Select id="pretrained-weight-select" labelText="Pretrained Weight" value={selectedWeight || "yolov5s.pt"} onChange={(e) => setSelectedWeight(e.target.value)} style={{ minWidth: 260 }}>
                    <SelectItem text="yolov5s.pt" value="yolov5s.pt" />
                  </Select>
                )}
              </div>

              <div style={{ width: 1, background: "#e0e0e0", height: "100%", minHeight: 120 }} />

              <div style={{ padding: "0 48px" }}>
                <h3 style={{ margin: "0 0 16px", fontWeight: 400, fontSize: 18 }}>3. Start Object Detection</h3>
                <p style={{ margin: "0 0 12px", color: "#525252" }}>
                  Start object detection using the selected source and uploaded model weights.
                </p>
                <Button 
                  kind="primary" 
                  size="md" 
                  disabled={!isWeightReady || isDetecting} 
                  onClick={handleDetection}
                >
                  {isDetecting ? "Detecting..." : 
                   (sourceKind === "local" && videoUrl) || sourceKind === "webcam" ? 
                     (liveOverlay ? "Stop Live Detection" : "Start Live Detection") : 
                     "Start Object Detection"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
