export interface DetectionBox {
  box: number[];
  label: string;
  confidence: number;
}

export interface DemoImage {
  id: string;
  name: string;
  url: string;
  description: string;
  detections: DetectionBox[];
}

// Sample detection data for demo mode
export const DEMO_IMAGES: DemoImage[] = [
  {
    id: "sample1",
    name: "Street Scene",
    url: "/vision-ai-app/sample-images/street-scene.svg",
    description: "Urban street scene with cars and pedestrians",
    detections: [
      { box: [100, 50, 200, 150], label: "car", confidence: 0.92 },
      { box: [250, 80, 300, 180], label: "person", confidence: 0.87 },
      { box: [350, 60, 450, 160], label: "car", confidence: 0.89 },
      { box: [500, 90, 550, 190], label: "person", confidence: 0.82 }
    ]
  },
  {
    id: "sample2", 
    name: "Living Room",
    url: "/vision-ai-app/sample-images/living-room.svg",
    description: "Modern living room with furniture",
    detections: [
      { box: [50, 100, 200, 250], label: "chair", confidence: 0.94 },
      { box: [300, 150, 500, 300], label: "couch", confidence: 0.91 },
      { box: [150, 50, 250, 120], label: "tv", confidence: 0.88 }
    ]
  },
  {
    id: "sample3",
    name: "Kitchen",
    url: "/vision-ai-app/sample-images/kitchen.svg", 
    description: "Modern kitchen with appliances",
    detections: [
      { box: [100, 80, 180, 160], label: "microwave", confidence: 0.90 },
      { box: [200, 120, 280, 200], label: "refrigerator", confidence: 0.93 },
      { box: [50, 200, 120, 280], label: "oven", confidence: 0.85 }
    ]
  }
];

export const DEMO_WEIGHTS = [
  "yolov5s.pt",
  "yolov5m.pt", 
  "yolov5l.pt",
  "yolov5x.pt"
];

// Simulate detection delay
export const simulateDetection = async (imageFile?: File): Promise<DetectionBox[]> => {
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
  
  // Return random detections for demo
  const sampleDetections = [
    { box: [120, 80, 220, 180], label: "person", confidence: 0.85 + Math.random() * 0.1 },
    { box: [300, 100, 400, 200], label: "car", confidence: 0.80 + Math.random() * 0.15 },
    { box: [50, 150, 150, 250], label: "bicycle", confidence: 0.75 + Math.random() * 0.2 }
  ];
  
  // Return a random subset
  const numDetections = Math.floor(Math.random() * 3) + 1;
  return sampleDetections.slice(0, numDetections);
};