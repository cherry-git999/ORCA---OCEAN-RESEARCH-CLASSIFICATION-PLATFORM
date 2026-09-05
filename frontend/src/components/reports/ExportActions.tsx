import React, { useState } from 'react';
import { SonarScanItem } from '../../types/detection';
import { FileJson, FileSpreadsheet, Image as ImageIcon, FileCheck, ShieldCheck, Loader2 } from 'lucide-react';
import { downloadAnnotatedImage } from '../../utils/annotatedImageExport';

interface ExportActionsProps {
  scan: SonarScanItem;
}

export const ExportActions: React.FC<ExportActionsProps> = ({ scan }) => {
  const [isExportingImage, setIsExportingImage] = useState<boolean>(false);
  const isLive = scan.mission_id === 'TRANSECT-LIVE-ANALYSIS' || scan.id.startsWith('SCAN_');

  // Client-side JSON download
  const handleDownloadJson = () => {
    const reportData = {
      report_metadata: {
        generator: 'AquaSentinel AI — Marine Sonar Intelligence',
        mode: isLive ? 'LIVE_INFERENCE_SYNTHESIS' : 'DEMO_REPORT_PREVIEW',
        generated_at: new Date().toISOString(),
      },
      scan_id: scan.id,
      mission_id: scan.mission_id,
      model: scan.model_name,
      target: scan.target,
      timestamp: scan.timestamp,
      image: {
        filename: scan.image.filename,
        width: scan.image.width,
        height: scan.image.height,
        format: scan.image.format,
      },
      location: {
        source: scan.location.source,
        latitude: scan.location.latitude,
        longitude: scan.location.longitude,
        description: scan.location.description || 'Location data unavailable (Awaiting verified sonar navigation metadata)',
      },
      detection_summary: {
        total_detections: scan.detections.length,
        high_confidence: scan.detections.filter((d) => d.confidence >= 0.8).length,
        medium_confidence: scan.detections.filter((d) => d.confidence >= 0.5 && d.confidence < 0.8).length,
        low_confidence: scan.detections.filter((d) => d.confidence < 0.5).length,
        requires_review: scan.detections.filter((d) => d.review_status === 'review_required').length,
      },
      detections: scan.detections.map((d) => ({
        id: d.id,
        class: d.class_name,
        confidence: d.confidence,
        bbox: {
          x1: d.bbox.x1,
          y1: d.bbox.y1,
          x2: d.bbox.x2,
          y2: d.bbox.y2,
          width: Math.abs(d.bbox.x2 - d.bbox.x1),
          height: Math.abs(d.bbox.y2 - d.bbox.y1),
        },
        review_status: d.review_status,
        notes: d.notes,
      })),
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scan.id}_report.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Client-side CSV download
  const handleDownloadCsv = () => {
    const headers = ['Anomaly_ID', 'Target_Class', 'Confidence', 'X1', 'Y1', 'X2', 'Y2', 'Pixel_Width', 'Pixel_Height', 'Review_Status'];
    const rows = scan.detections.map((d) => [
      d.id,
      d.class_name,
      d.confidence.toFixed(4),
      d.bbox.x1,
      d.bbox.y1,
      d.bbox.x2,
      d.bbox.y2,
      Math.abs(d.bbox.x2 - d.bbox.x1),
      Math.abs(d.bbox.y2 - d.bbox.y1),
      d.review_status,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scan.id}_detections.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Canvas-based annotated image export
  const handleDownloadAnnotatedImage = async () => {
    setIsExportingImage(true);
    try {
      await downloadAnnotatedImage(scan, scan.rawFile);
    } catch (err) {
      console.error('Annotated image export failed:', err);
      alert('Failed to generate annotated image: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsExportingImage(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600 }}>MISSION REPORT ACTIONS & EXPORT</h4>
        {isLive ? (
          <span className="badge badge-emerald">
            LIVE INFERENCE TELEMETRY
          </span>
        ) : (
          <span className="badge badge-amber">CLIENT-SIDE PREVIEW</span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <button onClick={handleDownloadCsv} className="btn btn-secondary" style={{ padding: '12px 14px' }}>
          <FileSpreadsheet size={16} color="var(--status-emerald)" />
          <span>Download CSV</span>
        </button>

        <button onClick={handleDownloadJson} className="btn btn-secondary" style={{ padding: '12px 14px' }}>
          <FileJson size={16} color="var(--sonar-cyan)" />
          <span>Download JSON</span>
        </button>

        <button
          onClick={handleDownloadAnnotatedImage}
          disabled={isExportingImage}
          className="btn btn-secondary"
          style={{ padding: '12px 14px' }}
        >
          {isExportingImage ? (
            <Loader2 size={16} className="sonar-ping" color="var(--sonar-teal)" />
          ) : (
            <ImageIcon size={16} color="var(--sonar-teal)" />
          )}
          <span>{isExportingImage ? 'Rasterizing PNG...' : 'Download Annotated Image'}</span>
        </button>

        <button onClick={handleDownloadJson} className="btn btn-primary" style={{ padding: '12px 14px' }}>
          <FileCheck size={16} />
          <span>Generate Mission Report</span>
        </button>
      </div>

      <div style={{
        marginTop: '12px',
        fontSize: '11px',
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <ShieldCheck size={14} color="var(--status-emerald)" />
        <span>
          {isLive
            ? `Active scan "${scan.id}" (${scan.detections.length} detections) synchronized with live YOLO inference.`
            : 'Reviewing demonstration dataset. Connect live analysis on Analyze page.'}
        </span>
      </div>
    </div>
  );
};
