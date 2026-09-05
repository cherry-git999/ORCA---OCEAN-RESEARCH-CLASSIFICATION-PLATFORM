import { BackendAnalysisResponse } from '../types/api';
import { Detection, SonarScanItem, TargetClass } from '../types/detection';

export function mapBackendResponseToScanItem(
  response: BackendAnalysisResponse,
  previewUrl: string,
  fileSizeKb: number,
  rawFile?: File
): SonarScanItem {
  const scanId = `SCAN_${response.target.toUpperCase()}_${String(Date.now()).slice(-5)}`;

  const detections: Detection[] = (response.analysis.detections || []).map((d, index) => {
    // Exact mapping of bounding box in original pixel coordinates
    return {
      id: `ANM-${String(index + 1).padStart(3, '0')}`,
      class_id: d.class_id,
      class_name: d.class_name as TargetClass,
      confidence: d.confidence,
      bbox: {
        x1: d.bbox.x1,
        y1: d.bbox.y1,
        x2: d.bbox.x2,
        y2: d.bbox.y2,
      },
      model: `${response.model.class_name} Specialist`,
      review_status: d.confidence >= 0.8 ? 'confirmed' : 'review_required',
      notes: `Real YOLO detection: ${d.class_name} at (${d.bbox.x1}, ${d.bbox.y1}) to (${d.bbox.x2}, ${d.bbox.y2})`,
    };
  });

  return {
    id: scanId,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
    target: response.target,
    model_name: response.model.name,
    status: 'Complete',
    mission_id: 'TRANSECT-LIVE-ANALYSIS',
    image: {
      filename: response.image.filename,
      width: response.image.width,
      height: response.image.height,
      size_kb: fileSizeKb,
      format: response.image.filename.split('.').pop()?.toUpperCase() + ' Sonar Ingestion',
      preview_url: previewUrl,
    },
    location: {
      source: 'unavailable',
      latitude: null,
      longitude: null,
      accuracy: null,
      description: 'Location data unavailable (Awaiting verified sonar navigation metadata)',
    },
    detections,
    rawFile,
  };
}
