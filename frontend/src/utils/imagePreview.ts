/**
 * Defensive Browser Preview Generator for Sonar Imagery
 * 
 * Supports:
 * 1. Standard web images (.png, .jpg, .jpeg, .webp, .bmp) via URL.createObjectURL
 * 2. Mislabeled / Netpbm sonar streams (.pbm, .bpm containing P6/P5/P4 PPM data from SubPipeMiniSSS)
 *    by inspecting magic headers and decoding directly to canvas data URLs.
 */

export interface ImagePreviewResult {
  previewUrl: string;
  width: number;
  height: number;
  isNetpbm: boolean;
  formatDescription: string;
}

export async function generateImagePreview(file: File): Promise<ImagePreviewResult> {
  const filename = file.name.toLowerCase();
  const isPotentialNetpbm = filename.endsWith('.pbm') || filename.endsWith('.bpm') || filename.endsWith('.ppm') || filename.endsWith('.pgm');

  if (isPotentialNetpbm) {
    try {
      const buffer = await file.arrayBuffer();
      const decoded = decodeNetpbmBuffer(buffer);
      if (decoded) {
        return {
          previewUrl: decoded.dataUrl,
          width: decoded.width,
          height: decoded.height,
          isNetpbm: true,
          formatDescription: `Netpbm ${decoded.magic} Sonar Stream`,
        };
      }
    } catch (e) {
      console.warn('Netpbm client preview decode error, falling back to standard loader:', e);
    }
  }

  // Standard Image Browser Preview
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      resolve({
        previewUrl: objectUrl,
        width: img.naturalWidth || 1600,
        height: img.naturalHeight || 480,
        isNetpbm: false,
        formatDescription: file.type || 'Raster Sonar Image',
      });
    };

    img.onerror = () => {
      // If browser cannot render directly (e.g. unhandled TIFF/Netpbm)
      // Provide objectUrl and default dimensions
      resolve({
        previewUrl: objectUrl,
        width: 1600,
        height: 480,
        isNetpbm: isPotentialNetpbm,
        formatDescription: 'Acoustic Binary Stream',
      });
    };

    img.src = objectUrl;
  });
}

/**
 * Defensively decodes Netpbm binary streams (P6 RGB or P5 Greyscale)
 */
function decodeNetpbmBuffer(buffer: ArrayBuffer): { dataUrl: string; width: number; height: number; magic: string } | null {
  const bytes = new Uint8Array(buffer);
  let offset = 0;

  function skipWhitespaceAndComments() {
    while (offset < bytes.length) {
      const b = bytes[offset];
      if (b === 32 || b === 9 || b === 10 || b === 13) {
        // Space, tab, LF, CR
        offset++;
      } else if (b === 35) {
        // Comment (#), skip until end of line
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

  // 1. Read Magic Header
  const magic = readToken();
  if (!['P6', 'P5', 'P4', 'P3', 'P2', 'P1'].includes(magic)) {
    return null; // Not a recognized Netpbm magic header
  }

  // 2. Read Width and Height
  const widthStr = readToken();
  const heightStr = readToken();
  const width = parseInt(widthStr, 10);
  const height = parseInt(heightStr, 10);

  if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0 || width > 16000 || height > 16000) {
    return null;
  }

  // 3. Read MaxVal for P6 / P5 / P3 / P2
  if (magic === 'P6' || magic === 'P5' || magic === 'P3' || magic === 'P2') {
    readToken(); // consume maxval (e.g. 255)
  }

  // Single whitespace after header before binary data
  if (offset < bytes.length && (bytes[offset] === 32 || bytes[offset] === 9 || bytes[offset] === 10 || bytes[offset] === 13)) {
    offset++;
  }

  // 4. Render to Canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  const totalPixels = width * height;

  if (magic === 'P6') {
    // Binary 24-bit RGB
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
    // Binary 8-bit Greyscale
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
    // Fallback simple pixel copy
    return null;
  }

  ctx.putImageData(imageData, 0, 0);
  return {
    dataUrl: canvas.toDataURL('image/png'),
    width,
    height,
    magic,
  };
}
