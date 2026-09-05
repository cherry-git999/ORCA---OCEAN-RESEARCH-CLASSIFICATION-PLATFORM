export type TargetClass = 'Pipeline' | 'Human';

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
  class_id: number;
  class_name: TargetClass;
  confidence: number; // 0.0 to 1.0
  bbox: BoundingBox;
  model: string;
  review_status: ReviewStatus;
  notes?: string;
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
  source: 'demo' | 'sonar_metadata' | 'unavailable';
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  transect_id?: string;
  description?: string;
}

export interface SonarScanItem {
  id: string;
  timestamp: string;
  target: 'pipeline' | 'human';
  model_name: string;
  status: 'Complete' | 'Processing' | 'Pending';
  image: ImageMeta;
  detections: Detection[];
  location: LocationMeta;
  mission_id: string;
  rawFile?: File;
}

export interface ModelInfo {
  id: 'model1' | 'model2';
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
