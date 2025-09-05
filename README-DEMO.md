# VisionAI Demo - GitHub Pages

This repository contains a demonstration version of the VisionAI application, optimized for GitHub Pages deployment.

## 🌟 Live Demo

Visit the live demo at: [https://sjf-2025.github.io/vision-ai-app](https://sjf-2025.github.io/vision-ai-app)

## 📋 About This Demo

This is a **demonstration version** of the VisionAI object detection application. Since GitHub Pages only supports static hosting, this version runs entirely in the browser with:

### ✨ Demo Features
- **Sample Images**: Pre-loaded demo images with realistic object detection results
- **Simulated Detection**: Mock object detection that simulates the YOLO model behavior
- **File Upload**: Upload your own images for simulated detection
- **Webcam Support**: Real-time simulated detection from webcam feed
- **Interactive UI**: Full Carbon Design System interface

### 🚀 Original Application

The complete VisionAI application includes:
- **FastAPI Backend**: Real YOLO object detection using Ultralytics
- **Docker/Podman**: Containerized deployment
- **Custom Models**: Support for uploading custom YOLO weights
- **Real-time Processing**: Actual ML model inference

For the full application with backend capabilities, see the development instructions below.

## 🏗️ Architecture

### Demo Mode (GitHub Pages)
```
User → GitHub Pages → Static Next.js App → Demo Data & Simulated Detection
```

### Full Application (Local/Server Deployment)
```
User → Next.js Frontend → FastAPI Backend → YOLO Model → Object Detection Results
```

## 🛠️ Local Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000` to see the demo version.

### Building for GitHub Pages
```bash
cd frontend
npm run build
```

The static export will be generated in `frontend/out/`.

## 🚀 Deployment

### GitHub Pages (Automatic)
- Push to `main` branch
- GitHub Actions automatically builds and deploys
- Available at `https://sjf-2025.github.io/vision-ai-app`

### Manual Deployment
1. Build the application: `cd frontend && npm run build`
2. Deploy the `frontend/out/` directory to any static hosting service

## 📁 Project Structure

```
vision-ai-app/
├── frontend/                    # Next.js frontend application
│   ├── src/
│   │   ├── app/                # Next.js app router pages
│   │   ├── components/         # React components
│   │   └── data/              # Demo data and mock functions
│   ├── public/                # Static assets
│   │   └── sample-images/     # Demo images
│   └── out/                   # Built static export (generated)
├── backend/                   # FastAPI backend (not used in demo)
├── .github/workflows/         # GitHub Actions deployment
└── README.md                  # This file
```

## 🔧 Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **UI Library**: IBM Carbon Design System
- **Deployment**: GitHub Pages, GitHub Actions
- **Build**: Static export with Next.js

## 📝 Demo Limitations

This demo version has the following limitations compared to the full application:

- ❌ No real object detection (simulated results only)
- ❌ Cannot upload custom YOLO weights  
- ❌ No backend API integration
- ❌ Limited to predefined demo images for realistic results

## 🤝 Contributing

This is a demonstration repository. For the full application development:

1. Clone the repository
2. Follow the full setup instructions in the original README
3. Set up the FastAPI backend with YOLO models
4. Use Docker/Podman for complete functionality

## 📄 License

[Add your license information here]

---

**Note**: This demo showcases the user interface and interaction patterns of the VisionAI application. For production use with real object detection capabilities, deploy the full application with the FastAPI backend.