import { request } from './apiClient';
import { BackendAnalysisResponse } from '../types/api';

export async function analyzeSonarImage(
  file: File,
  target: 'pipeline' | 'human'
): Promise<BackendAnalysisResponse> {
  const formData = new FormData();
  formData.append('target', target);
  formData.append('file', file, file.name);

  return request<BackendAnalysisResponse>('/analyze', {
    method: 'POST',
    body: formData,
  });
}
