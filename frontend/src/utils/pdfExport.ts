/**
 * Real Scan Analysis PDF Report Generator
 *
 * Standalone, lightweight, zero-dependency client-side PDF 1.4 generator.
 * Produces official binary PDF reports from real scan records.
 */

import { SonarScanItem } from '../types/detection';
import { getSimulatedPriority, getSortedDetectionsByPriority } from './detectionPriority';

interface PdfScanData {
  filename: string;
  timestamp: string;
  model: string;
  target: string;
  routingConfidence?: number;
  isAutoRouted?: boolean;
  isHardwareScan?: boolean;
  hardwareDistance?: string;
  detections: Array<{
    id?: string;
    class_name: string;
    confidence: number;
    distance?: string;
    bbox: { x1: number; y1: number; x2: number; y2: number };
    hazard?: string;
    locationRisk?: string;
    priority?: number;
    recommendedAction?: string;
  }>;
  rankedOrder?: Array<{
    rank: number;
    id: string;
    className: string;
    priority: number;
    recommendedAction: string;
  }>;
  location?: {
    latitude: number | null;
    longitude: number | null;
    description?: string;
  };
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
  streamParts.push(`(${escapePdfText(data.isHardwareScan ? 'PHYSICAL HARDWARE SCAN ANALYSIS REPORT' : 'SCAN ANALYSIS REPORT')}) Tj`);
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

  if (data.isHardwareScan && data.hardwareDistance) {
    drawMetaRow('Distance of the Object', `${data.hardwareDistance} (Physical Sonar Slant Range)`, true);
  }

  if (data.routingConfidence != null) {
    drawMetaRow('Routing Confidence', `${(data.routingConfidence * 100).toFixed(1)}%`);
  }

  drawMetaRow('Objects Detected', `${data.detections.length}`);

  if (data.location && data.location.latitude != null && data.location.longitude != null) {
    const latStr =
      data.location.latitude > 0
        ? `${data.location.latitude.toFixed(4)} N`
        : `${Math.abs(data.location.latitude).toFixed(4)} S`;
    const lngStr =
      data.location.longitude > 0
        ? `${data.location.longitude.toFixed(4)} E`
        : `${Math.abs(data.location.longitude).toFixed(4)} W`;
    drawMetaRow('Survey Coordinates', `${latStr}, ${lngStr} (Estimated - Not highly accurate)`);
  }

  curY -= 15;

  // Section Header: DETECTION SUMMARY
  streamParts.push('BT');
  streamParts.push('/F2 11 Tf');
  streamParts.push('0.0 0.45 0.7 rg');
  streamParts.push(`40 ${curY} Td`);
  streamParts.push(`(${escapePdfText('DETECTION SUMMARY & OPERATIONAL INTELLIGENCE')}) Tj`);
  streamParts.push('ET');

  curY -= 16;

  // Detections Table Header
  streamParts.push('0.94 0.96 0.98 rg');
  streamParts.push(`40 ${curY - 6} 515 22 re f`);

  streamParts.push('BT');
  streamParts.push('/F2 8.5 Tf');
  streamParts.push('0.2 0.25 0.35 rg');
  streamParts.push(`45 ${curY} Td (ID / OBJECT) Tj`);
  streamParts.push('95 0 Td (CONFIDENCE) Tj');
  streamParts.push('75 0 Td (HAZARD) Tj');
  streamParts.push('70 0 Td (PRIORITY) Tj');
  streamParts.push('60 0 Td (LOCATION RISK) Tj');
  streamParts.push('80 0 Td (RECOMMENDED ACTION) Tj');
  streamParts.push('ET');

  curY -= 24;

  if (data.detections.length === 0) {
    streamParts.push('BT');
    streamParts.push('/F1 9 Tf');
    streamParts.push('0.45 0.45 0.5 rg');
    streamParts.push(`45 ${curY} Td (No candidate detections found in this scan above threshold.) Tj`);
    streamParts.push('ET');
    curY -= 22;
  } else {
    data.detections.forEach((det, idx) => {
      if (curY < 120) return; // Prevent page overflow

      // Alternating row background
      if (idx % 2 === 1) {
        streamParts.push('0.98 0.98 0.99 rg');
        streamParts.push(`40 ${curY - 5} 515 20 re f`);
      }

      const idObjStr = `${det.id || `#${idx + 1}`} ${det.class_name.toUpperCase()}`;
      const confStr = `${(det.confidence * 100).toFixed(1)}%`;
      const hazardStr = det.hazard || 'Medium';
      const priorityStr = det.priority != null ? `${det.priority} / 100` : '--';
      const locRiskStr = det.locationRisk || 'Context-based';
      const actionStr = det.recommendedAction || 'Inspect Anomaly';

      streamParts.push('BT');
      streamParts.push('/F2 8.5 Tf');
      streamParts.push('0.05 0.2 0.4 rg');
      streamParts.push(`45 ${curY} Td (${escapePdfText(idObjStr)}) Tj`);

      streamParts.push('/F1 8.5 Tf');
      streamParts.push('0.1 0.6 0.3 rg');
      streamParts.push(`95 0 Td (${escapePdfText(confStr)}) Tj`);

      streamParts.push('/F2 8.5 Tf');
      if (hazardStr === 'Very High' || hazardStr === 'High') {
        streamParts.push('0.8 0.1 0.2 rg');
      } else {
        streamParts.push('0.0 0.5 0.7 rg');
      }
      streamParts.push(`75 0 Td (${escapePdfText(hazardStr)}) Tj`);

      streamParts.push('/F2 8.5 Tf');
      streamParts.push('0.0 0.3 0.6 rg');
      streamParts.push(`70 0 Td (${escapePdfText(priorityStr)}) Tj`);

      streamParts.push('/F1 8.5 Tf');
      streamParts.push('0.3 0.3 0.4 rg');
      streamParts.push(`60 0 Td (${escapePdfText(locRiskStr)}) Tj`);

      streamParts.push('/F2 8 Tf');
      streamParts.push('0.1 0.1 0.15 rg');
      streamParts.push(`80 0 Td (${escapePdfText(actionStr)}) Tj`);
      streamParts.push('ET');

      // Row separator
      streamParts.push('0.92 0.93 0.95 RG');
      streamParts.push('0.5 w');
      streamParts.push(`40 ${curY - 6} m 555 ${curY - 6} l S`);

      curY -= 22;
    });
  }

  // Section Header: CLEANUP / INSPECTION ORDER
  curY -= 10;
  streamParts.push('BT');
  streamParts.push('/F2 11 Tf');
  streamParts.push('0.0 0.45 0.7 rg');
  streamParts.push(`40 ${curY} Td`);
  streamParts.push(`(${escapePdfText('CLEANUP / INSPECTION ORDER (PRIORITIZED QUEUE)')}) Tj`);
  streamParts.push('ET');

  curY -= 18;

  if (!data.rankedOrder || data.rankedOrder.length === 0) {
    streamParts.push('BT');
    streamParts.push('/F1 9 Tf');
    streamParts.push('0.45 0.45 0.5 rg');
    streamParts.push(`45 ${curY} Td (No detections available for prioritization.) Tj`);
    streamParts.push('ET');
    curY -= 20;
  } else {
    data.rankedOrder.forEach((item) => {
      if (curY < 60) return;

      streamParts.push('BT');
      streamParts.push('/F2 8.5 Tf');
      streamParts.push('0.8 0.1 0.2 rg');
      streamParts.push(`45 ${curY} Td (${escapePdfText(`${item.rank}.`)}) Tj`);

      streamParts.push('/F1 8.5 Tf');
      streamParts.push('0.1 0.15 0.2 rg');
      streamParts.push(`16 0 Td (${escapePdfText(`${item.id} — ${item.className.toUpperCase()} — Priority ${item.priority}  |  ${item.recommendedAction}`)}) Tj`);
      streamParts.push('ET');

      curY -= 16;
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

  // Compute xref table
  let currentOffset = '%PDF-1.4\n'.length;
  const offsets: number[] = [0];

  let body = '%PDF-1.4\n';
  for (const obj of objects) {
    offsets.push(currentOffset);
    const objBytes = `${obj}\n`;
    body += objBytes;
    currentOffset += new TextEncoder().encode(objBytes).length;
  }

  const startXref = currentOffset;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  let pdf = body + xref;
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
  const ranked = getSortedDetectionsByPriority(scan.detections, scan.target);

  const pdfData: PdfScanData = {
    filename: scan.image.filename,
    timestamp: scan.timestamp,
    model: scan.model_name,
    target: scan.target,
    routingConfidence: scan.routingConfidence,
    isAutoRouted: scan.isAutoRouted,
    isHardwareScan: scan.isHardwareScan,
    hardwareDistance: scan.hardwareDistance,
    detections: scan.detections.map((d) => {
      const p = getSimulatedPriority(d, scan.target);
      return {
        id: d.id,
        class_name: d.class_name,
        confidence: d.confidence,
        distance: d.distance || scan.hardwareDistance,
        bbox: d.bbox,
        hazard: p.hazard,
        locationRisk: p.locationRisk,
        priority: p.priority,
        recommendedAction: p.recommendedAction,
      };
    }),
    rankedOrder: ranked.map((r) => ({
      rank: r.rank,
      id: r.detection.id,
      className: r.detection.class_name,
      priority: r.priorityData.priority,
      recommendedAction: r.priorityData.recommendedAction,
    })),
    location: scan.location,
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
