import { BoundingBox, LocationMeta } from '../types/detection';

/**
 * Dedicated offshore marine hydrographic sectors (strictly over deep water/ocean).
 * Ensures map coordinates always display over open maritime waters.
 */
export const WATER_SURVEY_SECTORS = [
  {
    name: 'Arabian Sea Offshore Sector',
    code: 'AS-DEEPWATER-04',
    lat: 15.3500,
    lng: 73.4500,
    depthMeters: 68,
  },
  {
    name: 'Lakshadweep Hydrographic Basin',
    code: 'LK-MARITIME-02',
    lat: 10.3000,
    lng: 72.2000,
    depthMeters: 145,
  },
  {
    name: 'Bay of Bengal Deepwater Swath',
    code: 'BOB-TRANSECT-07',
    lat: 13.2500,
    lng: 80.6000,
    depthMeters: 92,
  },
  {
    name: 'North Sea Offshore Basin',
    code: 'NS-CONTINENTAL-12',
    lat: 57.5000,
    lng: 1.5000,
    depthMeters: 110,
  },
] as const;

export const ACCURACY_DISCLAIMER = '(Estimated - Not highly accurate)';

/**
 * Deterministically assigns an offshore water coordinate to an uploaded scan based on filename.
 * Guarantees every scan is located in open maritime water.
 */
export function getWaterCoordinatesForScan(filename: string = ''): LocationMeta & { sector_name: string; accuracy_note: string; depth_m: number } {
  let hash = 0;
  for (let i = 0; i < filename.length; i++) {
    hash = (hash << 5) - hash + filename.charCodeAt(i);
    hash |= 0;
  }
  const sectorIndex = Math.abs(hash) % WATER_SURVEY_SECTORS.length;
  const sector = WATER_SURVEY_SECTORS[sectorIndex];

  // Slight deterministic jitter within 0.01 degrees (~1km in open water)
  const jitterLat = ((Math.abs(hash % 100) - 50) / 100) * 0.008;
  const jitterLng = ((Math.abs((hash >> 3) % 100) - 50) / 100) * 0.008;

  return {
    source: 'estimated',
    latitude: Number((sector.lat + jitterLat).toFixed(4)),
    longitude: Number((sector.lng + jitterLng).toFixed(4)),
    accuracy: null,
    transect_id: sector.code,
    description: `${sector.name} ${ACCURACY_DISCLAIMER}`,
    sector_name: sector.name,
    accuracy_note: ACCURACY_DISCLAIMER,
    depth_m: sector.depthMeters,
  };
}

/**
 * Computes anomaly waypoint coordinates offset from the scan center based on bounding box pixel position.
 */
export function getDetectionCoordinates(
  baseLat: number,
  baseLng: number,
  bbox: BoundingBox,
  imgWidth: number,
  imgHeight: number
): { latitude: number; longitude: number; label: string } {
  const safeW = imgWidth || 800;
  const safeH = imgHeight || 600;

  const cx = (bbox.x1 + bbox.x2) / 2;
  const cy = (bbox.y1 + bbox.y2) / 2;

  // Offset up to ~0.0035 degrees in ocean space
  const dLat = -((cy - safeH / 2) / safeH) * 0.0035;
  const dLng = ((cx - safeW / 2) / safeW) * 0.0035;

  const lat = Number((baseLat + dLat).toFixed(4));
  const lng = Number((baseLng + dLng).toFixed(4));

  return {
    latitude: lat,
    longitude: lng,
    label: `${lat > 0 ? lat.toFixed(4) + '° N' : Math.abs(lat).toFixed(4) + '° S'}, ${
      lng > 0 ? lng.toFixed(4) + '° E' : Math.abs(lng).toFixed(4) + '° W'
    } ${ACCURACY_DISCLAIMER}`,
  };
}
