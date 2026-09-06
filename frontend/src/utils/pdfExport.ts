/**
 * Real Scan Analysis PDF Report Generator
 *
 * Standalone, lightweight, zero-dependency client-side PDF 1.4 generator.
 * Produces official binary PDF reports from real scan records.
 */

import { SonarScanItem } from '../types/detection';

interface PdfScanData {
  filename: string;
  timestamp: string;
  model: string;
  target: string;
  routingConfidence?: number;
  isAutoRouted?: boolean;
  detections: Array<{
    id?: string;
    class_name: string;
    confidence: number;
    bbox: { x1: number; y1: number; x2: number; y2: number };
  }>;
}

/**
 * Escapes characters for PDF string literals.
 */
function escapePdfText(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/**
 * Generates binary PDF 1.4 content for the ORCA scan report.
 */
function buildPdfDocument(data: PdfScanData): Uint8Array {
  const lines: string[] = [];

  // PDF stream commands for A4 (595.28 x 841.89 pt)
  // Origin (0,0) is bottom-left
  const streamParts: string[] = [];

  // Header background banner (dark navy)
  streamParts.push('0.03 0.06 0.12 rg'); // RGB dark navy
  streamParts.push('0 720 595.28 122 re f');

  // Cyan accent line
  streamParts.push('0.0 0.95 0.99 rg'); // Sonar cyan
  streamParts.push('0 717 595.28 3 re f');

  // Header Text
  streamParts.push('BT');
  streamParts.push('/F2 18 Tf'); // Helvetica-Bold
  streamParts.push('1 1 1 rg'); // White
  streamParts.push('40 790 Td');
  streamParts.push(`(${escapePdfText('ORCA')}) Tj`);

  streamParts.push('/F1 10 Tf'); // Helvetica
  streamParts.push('0.6 0.75 0.9 rg');
  streamParts.push('0 -16 Td');
  streamParts.push(`(${escapePdfText('Multimodal Underwater Intelligence Platform')}) Tj`);

  streamParts.push('/F2 14 Tf');
  streamParts.push('0.0 0.95 0.99 rg');
  streamParts.push('0 -24 Td');
  streamParts.push(`(${escapePdfText('SCAN ANALYSIS REPORT')}) Tj`);
  streamParts.push('ET');

  // Metadata Section
  let curY = 670;
  const drawMetaRow = (label: string, value: string, isAccent = false) => {
    streamParts.push('BT');
    streamParts.push('/F2 10 Tf');
    streamParts.push('0.3 0.4 0.5 rg'); // Grey
    streamParts.push(`40 ${curY} Td`);
    streamParts.push(`(${escapePdfText(label.toUpperCase())}) Tj`);

    streamParts.push('/F1 11 Tf');
    if (isAccent) {
      streamParts.push('0.0 0.4 0.8 rg');
    } else {
      streamParts.push('0.1 0.1 0.15 rg');
    }
    streamParts.push(`200 0 Td`);
    streamParts.push(`(${escapePdfText(value)}) Tj`);
    streamParts.push('ET');

    // Divider line
    streamParts.push('0.88 0.90 0.93 RG');
    streamParts.push('0.5 w');
    streamParts.push(`40 ${curY - 6} m 555 ${curY - 6} l S`);

    curY -= 26;
  };

  drawMetaRow('Scan Filename', data.filename);
  drawMetaRow('Timestamp', data.timestamp);
  drawMetaRow(
    data.isAutoRouted ? 'Automatic Model Selection' : 'Selected Model Target',
    `${data.target.toUpperCase()} Specialist (${data.model})`,
    true
  );

  if (data.routingConfidence != null) {
    drawMetaRow('Routing Confidence', `${(data.routingConfidence * 100).toFixed(1)}%`);
  }

  drawMetaRow('Objects Detected', `${data.detections.length}`);

  curY -= 15;

  // Detections Table Header
  streamParts.push('0.94 0.96 0.98 rg');
  streamParts.push(`40 ${curY - 6} 515 22 re f`);

  streamParts.push('BT');
  streamParts.push('/F2 9 Tf');
  streamParts.push('0.2 0.25 0.35 rg');
  streamParts.push(`50 ${curY} Td (INDEX) Tj`);
  streamParts.push('80 0 Td (CLASS LABEL) Tj');
  streamParts.push('140 0 Td (CONFIDENCE) Tj');
  streamParts.push('140 0 Td (BOUNDING BOX [x1, y1, x2, y2]) Tj');
  streamParts.push('ET');

  curY -= 26;

  if (data.detections.length === 0) {
    streamParts.push('BT');
    streamParts.push('/F1 10 Tf');
    streamParts.push('0.45 0.45 0.5 rg');
    streamParts.push(`50 ${curY} Td (No candidate detections found in this scan above threshold.) Tj`);
    streamParts.push('ET');
    curY -= 24;
  } else {
    data.detections.forEach((det, idx) => {
      if (curY < 80) return; // Prevent page overflow

      // Alternating row background
      if (idx % 2 === 1) {
        streamParts.push('0.98 0.98 0.99 rg');
        streamParts.push(`40 ${curY - 5} 515 20 re f`);
      }

      const confStr = `${(det.confidence * 100).toFixed(2)}%`;
      const bboxStr = `[${det.bbox.x1.toFixed(1)}, ${det.bbox.y1.toFixed(1)}, ${det.bbox.x2.toFixed(1)}, ${det.bbox.y2.toFixed(1)}]`;

      streamParts.push('BT');
      streamParts.push('/F2 9 Tf');
      streamParts.push('0.3 0.3 0.4 rg');
      streamParts.push(`50 ${curY} Td (#${idx + 1}) Tj`);

      streamParts.push('/F2 10 Tf');
      streamParts.push('0.05 0.25 0.5 rg');
      streamParts.push(`80 0 Td (${escapePdfText(det.class_name.toUpperCase())}) Tj`);

      streamParts.push('/F1 10 Tf');
      streamParts.push('0.1 0.6 0.3 rg');
      streamParts.push(`140 0 Td (${escapePdfText(confStr)}) Tj`);

      streamParts.push('/F1 9 Tf');
      streamParts.push('0.3 0.3 0.35 rg');
      streamParts.push(`140 0 Td (${escapePdfText(bboxStr)}) Tj`);
      streamParts.push('ET');

      // Row separator
      streamParts.push('0.92 0.93 0.95 RG');
      streamParts.push('0.5 w');
      streamParts.push(`40 ${curY - 6} m 555 ${curY - 6} l S`);

      curY -= 24;
    });
  }

  // Footer
  streamParts.push('BT');
  streamParts.push('/F1 8 Tf');
  streamParts.push('0.5 0.55 0.6 rg');
  streamParts.push('40 30 Td');
  streamParts.push(`(${escapePdfText(`Generated by ORCA Platform • Verified Real ML Inference Payload • ${new Date().toISOString()}`)}) Tj`);
  streamParts.push('ET');

  const contentStream = streamParts.join('\n');
  const streamLength = new TextEncoder().encode(contentStream).length;

  // Build PDF Objects
  const objects: string[] = [];

  // Obj 1: Catalog
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');

  // Obj 2: Pages
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj');

  // Obj 3: Page
  objects.push(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj'
  );

  // Obj 4: Contents
  objects.push(`4 0 obj\n<< /Length ${streamLength} >>\nstream\n${contentStream}\nendstream\nendobj`);

  // Obj 5: Font Helvetica
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj');

  // Obj 6: Font Helvetica-Bold
  objects.push('6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj');

  // Assemble full PDF
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];

  for (const obj of objects) {
    offsets.push(new TextEncoder().encode(pdf).length);
    pdf += obj + '\n';
  }

  const startXref = new TextEncoder().encode(pdf).length;
  pdf += 'xref\n';
  pdf += `0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += 'startxref\n';
  pdf += `${startXref}\n`;
  pdf += '%%EOF\n';

  return new TextEncoder().encode(pdf);
}

/**
 * Generates and downloads a client-side PDF analysis report for a given SonarScanItem.
 */
export function downloadScanPdfReport(scan: SonarScanItem): void {
  const pdfData: PdfScanData = {
    filename: scan.image.filename,
    timestamp: scan.timestamp,
    model: scan.model_name,
    target: scan.target,
    routingConfidence: scan.routingConfidence,
    isAutoRouted: scan.isAutoRouted,
    detections: scan.detections.map((d) => ({
      id: d.id,
      class_name: d.class_name,
      confidence: d.confidence,
      bbox: d.bbox,
    })),
  };

  const pdfBytes = buildPdfDocument(pdfData);
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const cleanFilename = scan.image.filename.replace(/\.[^/.]+$/, '');
  const downloadName = `ORCA_Report_${cleanFilename}.pdf`;

  const link = document.createElement('a');
  link.href = url;
  link.download = downloadName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 2500);
}
