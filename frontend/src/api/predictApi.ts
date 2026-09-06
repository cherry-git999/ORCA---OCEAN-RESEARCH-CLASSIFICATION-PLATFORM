/**
 * Frontend API Service for /predict Endpoint.
 *
 * Implements clean, standardized communication with the FastAPI backend
 * for target-aware specialist YOLO model predictions:
 * - Pipeline: Model 1
 * - Human: Model 2
 * - Hardware: Model 3
 */

import { request } from './apiClient';
import { PredictAutoResponse, PredictResponse, PredictTarget } from '../types/api';

/**
 * Executes target-aware object detection inference on a sonar image file.
 *
 * @param file Uploaded image file (.pbm, .bpm, .png, .jpg, .jpeg, .webp, .bmp, .tif, .tiff)
 * @param target Target specialist ('pipeline' | 'human' | 'hardware')
 * @returns Standardized PredictResponse ({ model, target, detections })
 */
export async function predictImage(
  file: File,
  target: PredictTarget
): Promise<PredictResponse> {
  const formData = new FormData();
  formData.append('target', target);
  formData.append('image', file, file.name);

  return request<PredictResponse>('/predict', {
    method: 'POST',
    body: formData,
  });
}

/**
 * Executes automatic model selection and specialist object detection.
 *
 * @param file Uploaded image file
 * @returns Standardized PredictAutoResponse ({ routing, detections })
 */
export async function predictAuto(file: File): Promise<PredictAutoResponse> {
  const formData = new FormData();
  formData.append('file', file, file.name);

  return request<PredictAutoResponse>('/predict-auto', {
    method: 'POST',
    body: formData,
  });
}

