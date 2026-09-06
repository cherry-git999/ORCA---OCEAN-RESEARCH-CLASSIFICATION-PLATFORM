/**
 * Sonar Distance Parser & Hardware File Utilities
 *
 * Extracts real sonar distance measurements from raw hardware TXT telemetry
 * and provides dataUrl to File conversions for inference ingestion.
 */

/**
 * Parses raw TXT content from the hardware sonar system and extracts the distance measurement.
 * Handles key-value formats, standalone floats, units (m, cm, mm), and returns a clean string.
 */
export function extractSonarDistance(rawText: string = ''): string {
  if (!rawText || !rawText.trim()) {
    return 'N/A';
  }

  const cleanText = rawText.trim();
  const lines = cleanText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // 1. Line-by-line check for "Distance: <value>" or "Distance of the object: <value>"
  // E.g. "Distance: 11.28 cm" -> "11.28 cm"
  for (const line of lines) {
    const m = line.match(/^(?:distance|range|slant\s*range|distance\s*of\s*(?:the\s*)?object|sonar\s*distance)[\s:=]+(.+)$/i);
    if (m && m[1]) {
      const valStr = m[1].trim();
      if (valStr) {
        return valStr;
      }
    }
  }

  // 2. Explicit key-value pattern (e.g. SLANT_RANGE_METERS_RAW: 2.348, Distance: 2.4 m)
  const keyValRegex = /(?:slant_range_meters_raw|slant_range|distance|sonar_distance|target_distance|range|depth)[\s:=_-]+([0-9]+(?:\.[0-9]+)?)\s*(meters|meter|cm|mm|m)?/i;
  const keyValMatch = cleanText.match(keyValRegex);
  if (keyValMatch) {
    const val = parseFloat(keyValMatch[1]);
    const unit = (keyValMatch[2] || '').toLowerCase();
    if (unit === 'cm') {
      return `${val} cm`;
    }
    if (unit === 'mm') {
      return `${val} mm`;
    }
    return `${val.toFixed(2)} m`;
  }

  // 3. Number explicitly followed by meters / m / cm / mm
  const unitRegex = /([0-9]+(?:\.[0-9]+)?)\s*(meters|meter|cm|mm|m)\b/i;
  const unitMatch = cleanText.match(unitRegex);
  if (unitMatch) {
    const val = parseFloat(unitMatch[1]);
    const unit = unitMatch[2].toLowerCase();
    if (unit === 'cm') return `${val} cm`;
    if (unit === 'mm') return `${val} mm`;
    return `${val.toFixed(2)} m`;
  }

  // 4. Standalone float on a line (e.g. "2.348" or "  2.4  ")
  const floatRegex = /(?:^|\n|\r)\s*([0-9]+\.[0-9]+)\s*(?:$|\n|\r)/;
  const floatMatch = cleanText.match(floatRegex);
  if (floatMatch) {
    const val = parseFloat(floatMatch[1]);
    return `${val.toFixed(2)} m`;
  }

  // 5. Standalone integer on a line (e.g. 240 -> 2.40 m or 12)
  const intRegex = /(?:^|\n|\r)\s*([0-9]+)\s*(?:$|\n|\r)/;
  const intMatch = cleanText.match(intRegex);
  if (intMatch) {
    const val = parseInt(intMatch[1], 10);
    return `${val} m`;
  }

  // 6. Fallback: Return the first non-empty line of the TXT file (truncated if too long)
  if (lines.length > 0) {
    const firstLine = lines[0];
    return firstLine.length > 24 ? `${firstLine.slice(0, 24)}...` : firstLine;
  }

  return 'N/A';
}

/**
 * Converts a dataUrl (Base64) into a browser File object.
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new File([u8arr], filename, { type: mime });
}
