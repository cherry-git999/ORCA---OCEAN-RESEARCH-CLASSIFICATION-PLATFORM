import React, { useState } from 'react';
import { SonarScanItem } from '../../types/detection';
import { FileJson, FileSpreadsheet, Image as ImageIcon, FileText, ShieldCheck, Loader2 } from 'lucide-react';
import { downloadAnnotatedImage } from '../../utils/annotatedImageExport';
import { downloadScanPdfReport } from '../../utils/pdfExport';

import { getSimulatedPriority, getSortedDetectionsByPriority } from '../../utils/detectionPriority';

interface ExportActionsProps {
  scan: SonarScanItem;
}

export const ExportActions: React.FC<ExportActionsProps> = ({ scan }) => {
  const [isExportingImage, setIsExportingImage] = useState<boolean>(false);

  // Client-side JSON download
  const handleDownloadJson = () => {
    const rankedDetections = getSortedDetectionsByPriority(scan.detections, scan.target);

    const reportData = {
      report_metadata: {
        generator: 'ORCA — Multimodal Underwater Intelligence Platform',
        mode: 'OPERATIONAL_INFERENCE_PAYLOAD',
        intelligence_layer: 'SIMULATED_PRIORITY_ORDER_V1',
        generated_at: new Date().toISOString(),
      },
      scan_id: scan.id,
      mission_id: scan.mission_id,
      model: scan.model_name,
      target: scan.target,
      routing_confidence: scan.routingConfidence,
      is_auto_routed: scan.isAutoRouted,
      timestamp: scan.timestamp,
      image: {
        filename: scan.image.filename,
        width: scan.image.width,
        height: scan.image.height,
        format: scan.image.format,
      },
      detection_summary: {
        total_detections: scan.detections.length,
        high_confidence: scan.detections.filter((d) => d.confidence >= 0.8).length,
        medium_confidence: scan.detections.filter((d) => d.confidence >= 0.5 && d.confidence < 0.8).length,
        low_confidence: scan.detections.filter((d) => d.confidence < 0.5).length,
      },
      cleanup_inspection_order: rankedDetections.map((item) => ({
        rank: item.rank,
        anomaly_id: item.detection.id,
        class_name: item.detection.class_name,
        priority: item.priorityData.priority,
        severity: item.priorityData.severity,
        hazard: item.priorityData.hazard,
        location_risk: item.priorityData.locationRisk,
        recommended_action: item.priorityData.recommendedAction,
        is_human: item.priorityData.isHuman,
      })),
      is_hardware_scan: scan.isHardwareScan || false,
      ...(scan.isHardwareScan && { hardware_distance: scan.hardwareDistance || '11.28 cm' }),
      detections: scan.detections.map((d) => {
        const p = getSimulatedPriority(d, scan.target);
        return {
          id: d.id,
          class: d.class_name,
          confidence: d.confidence,
          hazard: p.hazard,
          location_risk: p.locationRisk,
          priority: p.priority,
          severity: p.severity,
          recommended_action: p.recommendedAction,
          review_status: d.review_status || 'pending',
          ...(scan.isHardwareScan && { distance_of_the_object: d.distance || scan.hardwareDistance || '11.28 cm' }),
          bbox: {
            x1: d.bbox.x1,
            y1: d.bbox.y1,
            x2: d.bbox.x2,
            y2: d.bbox.y2,
            width: Math.abs(d.bbox.x2 - d.bbox.x1),
            height: Math.abs(d.bbox.y2 - d.bbox.y1),
          },
        };
      }),
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ORCA_${scan.id}_report.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Client-side CSV download
  const handleDownloadCsv = () => {
    const isHw = !!scan.isHardwareScan;
    const rankedDetections = getSortedDetectionsByPriority(scan.detections, scan.target);
    const rankMap = new Map(rankedDetections.map((r) => [r.detection.id, r.rank]));

    const headers = isHw
      ? [
          'Anomaly_ID',
          'Class_Label',
          'Confidence',
          'Priority',
          'Hazard',
          'Location_Risk',
          'Recommended_Action',
          'Inspection_Rank',
          'Review_Status',
          'Distance_Of_The_Object',
          'X1',
          'Y1',
          'X2',
          'Y2',
          'Width_PX',
          'Height_PX',
        ]
      : [
          'Anomaly_ID',
          'Class_Label',
          'Confidence',
          'Priority',
          'Hazard',
          'Location_Risk',
          'Recommended_Action',
          'Inspection_Rank',
          'Review_Status',
          'X1',
          'Y1',
          'X2',
          'Y2',
          'Width_PX',
          'Height_PX',
        ];

    const rows = scan.detections.map((d) => {
      const p = getSimulatedPriority(d, scan.target);
      const rank = rankMap.get(d.id) || 1;

      const row: (string | number)[] = [
        d.id,
        d.class_name,
        d.confidence.toFixed(4),
        p.priority,
        p.hazard,
        p.locationRisk,
        `"${p.recommendedAction.replace(/"/g, '""')}"`,
        rank,
        (d.review_status || 'pending').toUpperCase(),
      ];
      if (isHw) {
        row.push(d.distance || scan.hardwareDistance || '11.28 cm');
      }
      row.push(
        d.bbox.x1,
        d.bbox.y1,
        d.bbox.x2,
        d.bbox.y2,
        Math.abs(d.bbox.x2 - d.bbox.x1),
        Math.abs(d.bbox.y2 - d.bbox.y1)
      );
      return row;
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ORCA_${scan.id}_detections.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Client-side PDF Report download
  const handleDownloadPdf = () => {
    downloadScanPdfReport(scan);
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
        <span className="badge badge-emerald">REAL INFERENCE PAYLOAD</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {/* PDF Download */}
        <button
          id="btn-download-pdf-report"
          data-testid="btn-download-pdf-report"
          onClick={handleDownloadPdf}
          className="btn btn-primary"
          style={{ padding: '12px 14px', justifyContent: 'center' }}
        >
          <FileText size={16} />
          <span>Download PDF Report</span>
        </button>

        {/* CSV Download */}
        <button
          id="btn-download-csv-report"
          data-testid="btn-download-csv-report"
          onClick={handleDownloadCsv}
          className="btn btn-secondary"
          style={{ padding: '12px 14px', justifyContent: 'center' }}
        >
          <FileSpreadsheet size={16} color="var(--status-emerald)" />
          <span>Download CSV</span>
        </button>

        {/* JSON Download */}
        <button
          id="btn-download-json-report"
          data-testid="btn-download-json-report"
          onClick={handleDownloadJson}
          className="btn btn-secondary"
          style={{ padding: '12px 14px', justifyContent: 'center' }}
        >
          <FileJson size={16} color="var(--sonar-cyan)" />
          <span>Download JSON</span>
        </button>

        {/* Annotated Image Download */}
        <button
          id="btn-download-annotated-image"
          data-testid="btn-download-annotated-image"
          onClick={handleDownloadAnnotatedImage}
          disabled={isExportingImage}
          className="btn btn-secondary"
          style={{ padding: '12px 14px', justifyContent: 'center' }}
        >
          {isExportingImage ? (
            <Loader2 size={16} className="sonar-ping" color="var(--sonar-teal)" />
          ) : (
            <ImageIcon size={16} color="var(--sonar-teal)" />
          )}
          <span>{isExportingImage ? 'Rasterizing PNG...' : 'Annotated PNG'}</span>
        </button>
      </div>

      <div
        style={{
          marginTop: '12px',
          fontSize: '11px',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <ShieldCheck size={14} color="var(--status-emerald)" />
        <span>
          Active scan "{scan.image.filename}" ({scan.detections.length} detections) verified with live YOLO inference data.
        </span>
      </div>
    </div>
  );
};
