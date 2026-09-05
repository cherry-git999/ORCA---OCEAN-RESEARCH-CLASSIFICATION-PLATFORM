export interface HealthResponse {
  status: string;
  service?: string;
  [key: string]: unknown;
}

export interface BackendDetectionBBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface BackendDetectionItem {
  class_id: number;
  class_name: string; // "Pipeline" or "Human"
  confidence: number;
  bbox: BackendDetectionBBox;
}

export interface BackendModelInfo {
  id: string;
  name: string;
  class_name: string;
}

export interface BackendImageInfo {
  filename: string;
  width: number;
  height: number;
}

export interface BackendInferenceInfo {
  device: string;
  imgsz: number;
  confidence_threshold: number;
  nms_iou: number;
  inference_time_ms?: number;
}

export interface BackendAnalysisData {
  detection_count: number;
  detections_found: boolean;
  highest_confidence: number | null;
  detections: BackendDetectionItem[];
}

export interface BackendAnalysisResponse {
  success: boolean;
  target: 'pipeline' | 'human';
  model: BackendModelInfo;
  image: BackendImageInfo;
  inference: BackendInferenceInfo;
  analysis: BackendAnalysisData;
  message: string;
}

export interface BackendErrorResponse {
  error?: string;
  detail?: string | { error?: string; details?: string };
  details?: string;
  filename?: string;
  supported_formats?: string[];
  [key: string]: unknown;
}
