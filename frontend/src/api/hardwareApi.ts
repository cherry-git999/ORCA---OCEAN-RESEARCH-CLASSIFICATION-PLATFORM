import { HARDWARE_API_URL } from './apiClient';
import { HardwareCapture } from '../types/hardware';

/**
 * Clean normalized base URL, stripping trailing /latest, /upload, or slashes.
 * e.g., "http://10.169.191.69:5000/latest" -> "http://10.169.191.69:5000"
 */
export const HARDWARE_BASE_URL = HARDWARE_API_URL
  .replace(/\/latest\/?$/i, '')
  .replace(/\/upload\/?$/i, '')
  .replace(/\/+$/, '');

/**
 * Checks connectivity to the physical hardware laptop endpoint.
 * Uses a 3-second timeout to prevent blocking the UI.
 */
export async function checkHardwareConnectivity(): Promise<{
  online: boolean;
  endpoint: string;
  error?: string;
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    // Attempt pinging the base endpoint or /latest
    const response = await fetch(`${HARDWARE_BASE_URL}/`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json, text/plain, */*',
      },
    });
    clearTimeout(timeoutId);

    return {
      online: response.ok || response.status === 405 || response.status === 404,
      endpoint: HARDWARE_BASE_URL,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : 'Unreachable';
    return {
      online: false,
      endpoint: HARDWARE_BASE_URL,
      error: msg,
    };
  }
}

/**
 * Fetches the latest hardware capture (JPG image + TXT sonar data)
 * from the hardware laptop endpoint (GET /latest).
 */
export async function fetchLatestHardwareCapture(): Promise<{
  success: boolean;
  capture?: HardwareCapture;
  error?: string;
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(`${HARDWARE_BASE_URL}/latest`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        success: false,
        error: `Hardware laptop returned HTTP ${response.status}: ${errText || response.statusText}`,
      };
    }

    const data = await response.json();
    const now = new Date().toISOString();

    // Extract image data (supports base64, dataUrl, or image object)
    let imageDataUrl = '';
    let imageFilename = 'hardware_capture.jpg';
    let imageSizeBytes = 0;

    if (typeof data.image === 'object' && data.image !== null) {
      imageDataUrl = data.image.dataUrl || data.image.base64 || '';
      imageFilename = data.image.filename || imageFilename;
      imageSizeBytes = data.image.size_bytes || data.image.sizeBytes || 0;
    } else if (typeof data.image_base64 === 'string') {
      imageDataUrl = data.image_base64;
      imageFilename = data.image_filename || imageFilename;
    } else if (typeof data.image_url === 'string') {
      imageDataUrl = data.image_url.startsWith('http')
        ? data.image_url
        : `${HARDWARE_BASE_URL}${data.image_url.startsWith('/') ? '' : '/'}${data.image_url}`;
    }

    if (imageDataUrl && !imageDataUrl.startsWith('data:')) {
      imageDataUrl = `data:image/jpeg;base64,${imageDataUrl}`;
    }

    // Extract sonar text data
    let sonarText = '';
    let sonarFilename = 'sonar_telemetry.txt';
    let sonarSizeBytes = 0;

    if (typeof data.sonar === 'object' && data.sonar !== null) {
      sonarText = data.sonar.rawText || data.sonar.content || data.sonar.text || '';
      sonarFilename = data.sonar.filename || sonarFilename;
      sonarSizeBytes = data.sonar.size_bytes || data.sonar.sizeBytes || 0;
    } else if (typeof data.sonar_text === 'string') {
      sonarText = data.sonar_text;
      sonarFilename = data.sonar_filename || sonarFilename;
    } else if (typeof data.sonar_content === 'string') {
      sonarText = data.sonar_content;
      sonarFilename = data.sonar_filename || sonarFilename;
    }

    if (!imageDataUrl && !sonarText) {
      return {
        success: false,
        error: 'Hardware endpoint returned JSON without recognizable image or sonar payload.',
      };
    }

    // Probe dimensions if image exists
    let dims: { width: number; height: number } | undefined;
    if (imageDataUrl) {
      dims = await new Promise<{ width: number; height: number }>((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => resolve({ width: 640, height: 640 });
        img.src = imageDataUrl;
      });
    }

    const capture: HardwareCapture = {
      id: data.id || `HW-CAP-${Date.now().toString(36).toUpperCase()}`,
      captureNumber: data.capture_number || 1,
      timestamp: data.timestamp || now,
      image: imageDataUrl
        ? {
            filename: imageFilename,
            dataUrl: imageDataUrl,
            sizeBytes: imageSizeBytes || imageDataUrl.length * 0.75,
            dimensions: dims,
            fileType: 'JPEG',
            receivedAt: now,
          }
        : null,
      sonar: sonarText
        ? {
            filename: sonarFilename,
            rawText: sonarText,
            sizeBytes: sonarSizeBytes || sonarText.length,
            lineCount: sonarText.split('\n').length,
            fileType: 'TXT Sonar Telemetry',
            receivedAt: now,
          }
        : null,
      sourceEndpoint: HARDWARE_BASE_URL,
      status: imageDataUrl && sonarText ? 'received' : 'partial',
      analysisStatus: 'NOT_STARTED',
    };

    return {
      success: true,
      capture,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : 'Network error';
    return {
      success: false,
      error: `Failed to fetch from ${HARDWARE_BASE_URL}/latest: ${msg}`,
    };
  }
}

/**
 * Uploads/transmits a hardware capture pair (JPG image + TXT sonar data)
 * to the hardware endpoint (/upload).
 */
export async function transmitHardwareCapture(
  imageFile: File,
  sonarFile: File
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('sonar', sonarFile);

  try {
    const response = await fetch(`${HARDWARE_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        success: false,
        error: `Hardware endpoint responded with status ${response.status}: ${errText}`,
      };
    }

    const data = await response.json().catch(() => ({ status: 'received' }));
    return {
      success: true,
      data,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return {
      success: false,
      error: `Failed to transmit to hardware endpoint: ${msg}`,
    };
  }
}
