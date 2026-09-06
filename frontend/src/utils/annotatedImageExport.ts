/**
 * Real Annotated Image Export Engine for ORCA — Multimodal Underwater Intelligence Platform
 * 
 * Generates client-side annotated PNG images from real YOLO inferences:
 * - Loads original uploaded File (or preview URL)
 * - Renders to native-resolution HTML Canvas (with defensive Netpbm P6/P5/P4 decoding)
 * - Overlays real YOLO bounding boxes using original pixel coordinates [x1, y1, x2, y2]
 * - Draws high-contrast class labels & confidences (adaptive scaling for high-res sonar)
 * - If detections === 0: exports clean pristine original image PNG (no fabricated boxes)
 * - Exports via canvas.toBlob() -> URL.createObjectURL()
 * - NEVER downloads the original raw uploaded file.
 */

import { SonarScanItem, Detection } from '../types/detection';

/**
 * Decode binary Netpbm (P6 RGB or P5 Greyscale) directly into ImageData
 */
function decodeNetpbmToImageData(
  buffer: ArrayBuffer,
  ctx: CanvasRenderingContext2D
): { imageData: ImageData; width: number; height: number } | null {
  const bytes = new Uint8Array(buffer);
  let offset = 0;

  function skipWhitespaceAndComments() {
    while (offset < bytes.length) {
      const b = bytes[offset];
      if (b === 32 || b === 9 || b === 10 || b === 13) {
        offset++;
      } else if (b === 35) {
        // Comment '#'
        offset++;
        while (offset < bytes.length && bytes[offset] !== 10 && bytes[offset] !== 13) {
          offset++;
        }
      } else {
        break;
      }
    }
  }

  function readToken(): string {
    skipWhitespaceAndComments();
    const start = offset;
    while (offset < bytes.length) {
      const b = bytes[offset];
      if (b === 32 || b === 9 || b === 10 || b === 13 || b === 35) {
        break;
      }
      offset++;
    }
    return new TextDecoder().decode(bytes.subarray(start, offset));
  }

  const magic = readToken();
  if (!['P6', 'P5', 'P4', 'P3', 'P2', 'P1'].includes(magic)) {
    return null;
  }

  const width = parseInt(readToken(), 10);
  const height = parseInt(readToken(), 10);

  if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0 || width > 16000 || height > 16000) {
    return null;
  }

  if (magic === 'P6' || magic === 'P5' || magic === 'P3' || magic === 'P2') {
    readToken(); // maxval (e.g. 255)
  }

  if (offset < bytes.length && (bytes[offset] === 32 || bytes[offset] === 9 || bytes[offset] === 10 || bytes[offset] === 13)) {
    offset++;
  }

  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  const totalPixels = width * height;

  if (magic === 'P6') {
    let srcIdx = offset;
    let dstIdx = 0;
    for (let i = 0; i < totalPixels && srcIdx + 2 < bytes.length; i++) {
      data[dstIdx] = bytes[srcIdx];         // R
      data[dstIdx + 1] = bytes[srcIdx + 1]; // G
      data[dstIdx + 2] = bytes[srcIdx + 2]; // B
      data[dstIdx + 3] = 255;               // A
      srcIdx += 3;
      dstIdx += 4;
    }
  } else if (magic === 'P5') {
    let srcIdx = offset;
    let dstIdx = 0;
    for (let i = 0; i < totalPixels && srcIdx < bytes.length; i++) {
      const g = bytes[srcIdx];
      data[dstIdx] = g;
      data[dstIdx + 1] = g;
      data[dstIdx + 2] = g;
      data[dstIdx + 3] = 255;
      srcIdx++;
      dstIdx += 4;
    }
  } else {
    return null;
  }

  return { imageData, width, height };
}

/**
 * Loads an image from a URL into an HTMLImageElement safely without CORS taint
 */
function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Do NOT set crossOrigin on blob: or data: URLs to prevent browser security errors
    if (!src.startsWith('blob:') && !src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Failed to load image element from src: ${e}`));
    img.src = src;
  });
}

/**
 * Draws the base original image onto the canvas at native resolution
 */
async function drawOriginalImageOntoCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  scan: SonarScanItem,
  rawFile?: File
): Promise<void> {
  const filename = (rawFile?.name || scan.image.filename || '').toLowerCase();
  const isNetpbm = filename.endsWith('.pbm') || filename.endsWith('.bpm') || filename.endsWith('.ppm') || filename.endsWith('.pgm');

  // Case 1: Raw File is a Netpbm binary format
  if (rawFile && isNetpbm) {
    try {
      const buffer = await rawFile.arrayBuffer();
      const decoded = decodeNetpbmToImageData(buffer, ctx);
      if (decoded) {
        canvas.width = decoded.width;
        canvas.height = decoded.height;
        ctx.putImageData(decoded.imageData, 0, 0);
        return;
      }
    } catch (err) {
      console.warn('Direct Netpbm buffer decode for canvas export failed, falling back:', err);
    }
  }

  // Case 2: Standard raster File (PNG, JPG, BMP, WebP)
  if (rawFile && typeof createImageBitmap === 'function' && !isNetpbm) {
    try {
      const bitmap = await createImageBitmap(rawFile);
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close?.();
      return;
    } catch (err) {
      console.warn('createImageBitmap failed, falling back to Image loader:', err);
    }
  }

  // Case 3: Fallback using scan.image.preview_url or rawFile blob URL
  const srcUrl = scan.image.preview_url || (rawFile ? URL.createObjectURL(rawFile) : '');
  if (!srcUrl) {
    throw new Error('No valid image preview URL or File found for canvas export');
  }

  const img = await loadImageElement(srcUrl);
  canvas.width = img.naturalWidth || scan.image.width || 1920;
  canvas.height = img.naturalHeight || scan.image.height || 1080;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}

/**
 * Overlays real YOLO bounding boxes and detection labels onto the canvas
 */
function drawDetectionAnnotations(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  detections: Detection[]
): void {
  if (!detections || detections.length === 0) {
    // Strict zero-detection requirement: do not draw any bounding box
    return;
  }

  // Adaptive scale factor: ensures boxes and labels are clearly legible on both
  // wide swath sonar (e.g. 4668x500) and high-res imagery (e.g. 1920x1080)
  const maxDim = Math.max(width, height);
  const strokeWidth = Math.max(3, Math.round(maxDim / 550));
  const fontSize = Math.max(14, Math.round(maxDim / 95));
  const cornerLength = Math.max(10, Math.round(fontSize * 0.9));

  for (const det of detections) {
    // API bounding boxes are in original image pixel coordinates
    const x1 = det.bbox.x1;
    const y1 = det.bbox.y1;
    const x2 = det.bbox.x2;
    const y2 = det.bbox.y2;

    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const w = Math.abs(x2 - x1);
    const h = Math.abs(y2 - y1);

    // Color by confidence
    let boxColor = '#00f2fe'; // Sonar cyan
    if (det.confidence >= 0.8) {
      boxColor = '#10b981'; // Emerald green
    } else if (det.confidence < 0.5) {
      boxColor = '#f59e0b'; // Amber
    }

    // 1. Draw high-contrast outer shadow / border for 100% visibility against all sonar floors
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.lineWidth = strokeWidth + 2;
    ctx.strokeRect(x, y, w, h);

    // 2. Draw main colored bounding box
    ctx.strokeStyle = boxColor;
    ctx.lineWidth = strokeWidth;
    ctx.strokeRect(x, y, w, h);

    // 3. Draw corner highlight accents
    ctx.fillStyle = boxColor;
    // Top-left
    ctx.fillRect(x - strokeWidth / 2, y - strokeWidth / 2, cornerLength, strokeWidth);
    ctx.fillRect(x - strokeWidth / 2, y - strokeWidth / 2, strokeWidth, cornerLength);
    // Top-right
    ctx.fillRect(x + w - cornerLength + strokeWidth / 2, y - strokeWidth / 2, cornerLength, strokeWidth);
    ctx.fillRect(x + w - strokeWidth / 2, y - strokeWidth / 2, strokeWidth, cornerLength);
    // Bottom-left
    ctx.fillRect(x - strokeWidth / 2, y + h - strokeWidth / 2, cornerLength, strokeWidth);
    ctx.fillRect(x - strokeWidth / 2, y + h - cornerLength + strokeWidth / 2, strokeWidth, cornerLength);
    // Bottom-right
    ctx.fillRect(x + w - cornerLength + strokeWidth / 2, y + h - strokeWidth / 2, cornerLength, strokeWidth);
    ctx.fillRect(x + w - strokeWidth / 2, y + h - cornerLength + strokeWidth / 2, strokeWidth, cornerLength);

    // 4. Draw Detection Tag Pill (Class name + Confidence)
    const confStr = `${(det.confidence * 100).toFixed(1)}%`;
    const labelText = `${det.id ? det.id + ' | ' : ''}${det.class_name} ${confStr}`;

    ctx.font = `bold ${fontSize}px "JetBrains Mono", "Courier New", monospace`;
    const textMetrics = ctx.measureText(labelText);
    const padX = Math.max(6, Math.round(fontSize * 0.4));
    const padY = Math.max(4, Math.round(fontSize * 0.25));
    const pillW = textMetrics.width + padX * 2;
    const pillH = fontSize + padY * 2;

    // Position pill above box; if too close to top edge, place inside top of box
    let pillX = x;
    let pillY = y - pillH - strokeWidth;
    if (pillY < 0) {
      pillY = y + strokeWidth + 2;
    }
    // Prevent horizontal overflow
    if (pillX + pillW > width) {
      pillX = width - pillW - 2;
    }
    if (pillX < 0) {
      pillX = 2;
    }

    // Pill background
    ctx.fillStyle = 'rgba(4, 10, 24, 0.94)';
    ctx.fillRect(pillX, pillY, pillW, pillH);

    // Pill border
    ctx.strokeStyle = boxColor;
    ctx.lineWidth = Math.max(1, Math.round(strokeWidth / 2));
    ctx.strokeRect(pillX, pillY, pillW, pillH);

    // Pill text
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, pillX + padX, pillY + pillH / 2);

    ctx.restore();
  }
}

/**
 * Generates an annotated HTMLCanvasElement
 */
export async function generateAnnotatedCanvas(
  scan: SonarScanItem,
  rawFile?: File
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = scan.image.width || 1920;
  canvas.height = scan.image.height || 1080;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to acquire 2D canvas rendering context');
  }

  // 1. Draw base image
  await drawOriginalImageOntoCanvas(canvas, ctx, scan, rawFile);

  // 2. Overlay real detections (or nothing if detections === 0)
  drawDetectionAnnotations(ctx, canvas.width, canvas.height, scan.detections);

  return canvas;
}

/**
 * Generates a newly created annotated PNG Blob from the canvas
 */
export async function generateAnnotatedImageBlob(
  scan: SonarScanItem,
  rawFile?: File
): Promise<Blob> {
  const canvas = await generateAnnotatedCanvas(scan, rawFile);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create PNG blob from canvas'));
        }
      },
      'image/png',
      1.0
    );
  });
}

/**
 * Downloads the annotated PNG image (ALWAYS a new PNG, NEVER the original file)
 */
export async function downloadAnnotatedImage(
  scan: SonarScanItem,
  rawFile?: File
): Promise<void> {
  const blob = await generateAnnotatedImageBlob(scan, rawFile);
  const blobUrl = URL.createObjectURL(blob);

  // Build clean download filename
  const baseName = (scan.image.filename || scan.id).replace(/\.[^/.]+$/, '');
  const downloadName = `${baseName}_annotated.png`;

  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = downloadName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Revoke blob URL after short delay
  setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
}
