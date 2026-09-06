export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://127.0.0.1:8000';
export const HARDWARE_API_URL = (import.meta.env.VITE_HARDWARE_API_URL as string) || 'http://10.169.191.69:5000';

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      let errorData: unknown = null;
      let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;

      try {
        errorData = await response.json();
        if (typeof errorData === 'object' && errorData !== null) {
          const errObj = errorData as Record<string, unknown>;
          if (typeof errObj.error === 'string') {
            errorMessage = errObj.error;
          } else if (typeof errObj.detail === 'string') {
            errorMessage = errObj.detail;
          } else if (typeof errObj.detail === 'object' && errObj.detail !== null) {
            const detailObj = errObj.detail as Record<string, unknown>;
            if (typeof detailObj.error === 'string') {
              errorMessage = detailObj.error;
            }
          }
        }
      } catch {
        // Response was not JSON
      }

      throw new ApiError(errorMessage, response.status, errorData);
    }

    return (await response.json()) as T;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    // Network / offline error
    const message = err instanceof Error ? err.message : 'Backend unavailable';
    throw new ApiError(
      `Backend connection failed. Please ensure the SIH26057 FastAPI server is running on ${API_BASE_URL} (${message})`,
      0,
      null
    );
  }
}
