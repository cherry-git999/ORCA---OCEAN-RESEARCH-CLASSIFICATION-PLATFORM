import { HardwareCapture } from '../types/hardware';

const STORAGE_KEY = 'orca_latest_hardware_capture';

/**
 * Retrieves the latest hardware capture from localStorage.
 */
export function getStoredHardwareCapture(): HardwareCapture | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as HardwareCapture;
  } catch (err) {
    console.error('Failed to parse stored hardware capture:', err);
    return null;
  }
}

/**
 * Persists the latest hardware capture to localStorage.
 */
export function setStoredHardwareCapture(capture: HardwareCapture | null): void {
  try {
    if (!capture) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(capture));
    }
  } catch (err) {
    console.error('Failed to persist hardware capture:', err);
  }
}

/**
 * Clears the stored hardware capture.
 */
export function clearStoredHardwareCapture(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear hardware capture:', err);
  }
}
