"use client";

import { useState } from "react";
import { Select, SelectItem, FileUploader, TextInput, Button } from "@carbon/react";

export default function Home() {
  const [source, setSource] = useState<"image" | "video">("image");
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
        <div
          style={{
            width: "100%",
            maxWidth: 960,
            aspectRatio: "16 / 9",
            border: "2px solid #8d8d8d",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#8d8d8d",
            background: "#f4f4f4",
          }}
        >
          Video feed placeholder
        </div>
      </section>

      <section style={{ padding: 16, borderTop: "1px solid #e0e0e0", background: "#fff" }}>
        <div style={{ width: "100%", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr 1px auto", gap: 32, alignItems: "start" }}>
            {/* Left: 1. Upload Video File */}
            <div>
              <h3 style={{ margin: "0 0 16px", fontWeight: 400 }}>1. Add Source</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, alignItems: "end" }}>
                <Select id="video-source" labelText="Source Type" value={source} onChange={(e) => setSource(e.target.value as any)}>
                  <SelectItem text="Image (.JPG / .PNG)" value="image" />
                  <SelectItem text="Video (.MP3 / .MP4)" value="video" />
                </Select>

                {source === "image" && (
                  <FileUploader
                    labelTitle="Upload image"
                    labelDescription="Max file size 500 MB. .jpg and .png supported."
                    buttonLabel="Add image"
                    accept={[".jpg", "image/jpeg", ".png", "image/png"]}
                    size="md"
                  />
                )}
                {source === "video" && (
                  <FileUploader
                    labelTitle="Upload video"
                    labelDescription="Upload .mp4 / .mp* video"
                    buttonLabel="Add video"
                    accept={["video/*", ".mp4", ".mpeg", ".mpg", ".m4v", ".mov"]}
                    size="md"
                  />
                )}
              </div>
            </div>

            {/* Divider */}
            <div style={{ width: 1, background: "#e0e0e0", height: "100%", minHeight: 120 }} />

            {/* Right: 2. Import Model Weight */}
            <div>
              <h3 style={{ margin: "0 0 16px", fontWeight: 400 }}>2. Import Model Weight</h3>
              <FileUploader labelTitle="Model weights" labelDescription="Upload weights.pt / best.pt" buttonLabel="Add weights" accept={[".pt", ".onnx", ".engine"]} size="md" />
            </div>

            {/* Divider */}
            <div style={{ width: 1, background: "#e0e0e0", height: "100%", minHeight: 120 }} />

            {/* 3. Start Detection */}
            <div>
              <h3 style={{ margin: "0 0 16px", fontWeight: 400 }}>3. Start Detection</h3>
              <Button kind="primary">Start Object Detection</Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
