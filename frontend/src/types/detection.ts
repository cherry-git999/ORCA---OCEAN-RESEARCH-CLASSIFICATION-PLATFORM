export type TargetClass = 'Pipeline' | 'Human' | 'Hardware' | string;

export type ReviewStatus = 'pending' | 'confirmed' | 'rejected' | 'review_required';

export type ConfidenceCategory = 'HIGH' | 'MEDIUM' | 'LOW';

export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Detection {
  id: string;
  class_id?: number;
  class_name: string; // "Pipeline", "Human", or Hardware classes ("cap", "clip", "key", "niddle", "scissor")
  confidence: number; // 0.0 to 1.0
  bbox: BoundingBox;
  model: string;
  review_status?: ReviewStatus;
  notes?: string;
  distance?: string; // Distance of the object from hardware sonar measurement
}

export interface ImageMeta {
  filename: string;
  width: number;
  height: number;
  size_kb: number;
  format: string;
  preview_url: string;
}

export interface LocationMeta {
  source: 'sonar_metadata' | 'unavailable' | string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  transect_id?: string;
  description?: string;
}

export interface SonarScanItem {
  id: string;
  timestamp: string;
  target: 'pipeline' | 'human' | 'hardware' | string;
  model_name: string;
  status: 'Complete' | 'Processing' | 'Pending';
  image: ImageMeta;
  detections: Detection[];
  location: LocationMeta;
  mission_id: string;
  rawFile?: File;
  routingConfidence?: number;
  isAutoRouted?: boolean;
  isHardwareScan?: boolean;
  hardwareDistance?: string;
  hardwareSonarRaw?: string;
}

export interface ModelInfo {
  id: 'model1' | 'model2' | 'model3' | string;
  name: string;
  role: string;
  target: TargetClass;
  architecture: string;
  status: 'READY' | 'OFFLINE' | 'BUSY';
  dataset: string;
}

export interface MissionStats {
  scansAnalyzed: number;
  anomaliesDetected: number;
  highConfidence: number;
  requiresReview: number;
  currentMissionId: string;
}

