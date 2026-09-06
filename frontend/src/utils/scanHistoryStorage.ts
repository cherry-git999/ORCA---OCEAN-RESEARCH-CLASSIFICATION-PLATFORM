/**
 * Real Scan History Local Storage Persistence Service
 *
 * Persists analyzed scans in the browser's localStorage.
 * Pure client-side persistence service using browser localStorage.
 * Handles quota limitations, duplicates, and thumbnail compression.
 */

export interface StoredDetectionItem {
  id: string;
  class_id?: number;
  class_name: string;
  confidence: number;
  bbox: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
}

export interface StoredScanRecord {
  id: string;
  timestamp: string;
  filename: string;
  model: string;
  target: string;
  routingConfidence?: number;
  isAutoRouted?: boolean;
  detections: StoredDetectionItem[];
  imageData?: string;
  width: number;
  height: number;
  size_kb?: number;
  mission_id?: string;
}

const STORAGE_KEY = 'orca_scan_history_v1';
const MAX_STORED_SCANS = 50;

/**
 * Retrieves all stored scan records from browser localStorage.
 * Returns empty array if none found or if storage unavailable.
 */
export function getScanHistory(): StoredScanRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (err) {
    console.warn('[ORCA Storage] Failed to read scan history from localStorage:', err);
    return [];
  }
}

/**
 * Retrieves a single scan by ID.
 */
export function getScan(id: string): StoredScanRecord | undefined {
  const all = getScanHistory();
  return all.find((s) => s.id === id);
}

/**
 * Saves a new scan or updates an existing scan in localStorage.
 * Handles storage quota limits by dropping heavy imageData if necessary.
 */
export function saveScan(scan: StoredScanRecord): void {
  try {
    const existing = getScanHistory();
    // Filter out duplicates with the same ID
    const next = [scan, ...existing.filter((s) => s.id !== scan.id)].slice(0, MAX_STORED_SCANS);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (quotaErr) {
      console.warn('[ORCA Storage] Quota exceeded with image data, retrying without heavy payloads:', quotaErr);
      // Strip imageData to conserve localStorage space
      const lightweight = next.map((item, idx) => {
        // Keep imageData only for the newest scan if possible, strip older ones
        if (idx === 0 && item.imageData && item.imageData.length < 500000) {
          return item;
        }
        const { imageData, ...rest } = item;
        return rest;
      });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lightweight));
      } catch (innerErr) {
        // As a last resort, strip all images completely
        const noImages = next.map(({ imageData, ...rest }) => rest);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(noImages));
      }
    }
  } catch (err) {
    console.error('[ORCA Storage] Unable to save scan record:', err);
  }
}

/**
 * Deletes a single scan by ID.
 */
export function deleteScan(id: string): void {
  try {
    const all = getScanHistory();
    const filtered = all.filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('[ORCA Storage] Failed to delete scan:', err);
  }
}

/**
 * Clears all scan history from localStorage.
 */
export function clearScanHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('[ORCA Storage] Failed to clear scan history:', err);
  }
}
