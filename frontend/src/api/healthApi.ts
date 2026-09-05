import { request } from './apiClient';
import { HealthResponse } from '../types/api';

export async function checkBackendHealth(): Promise<{ isHealthy: boolean; status: string; service?: string }> {
  try {
    const data = await request<HealthResponse>('/health');
    // Verify HTTP 200 succeeded and status field indicates ok
    const isHealthy = Boolean(data && typeof data.status === 'string' && data.status.toLowerCase() === 'ok');
    return {
      isHealthy,
      status: data.status || 'unknown',
      service: data.service,
    };
  } catch {
    return {
      isHealthy: false,
      status: 'offline',
    };
  }
}
