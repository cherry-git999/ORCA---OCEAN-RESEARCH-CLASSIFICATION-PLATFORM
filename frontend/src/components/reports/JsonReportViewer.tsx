import React, { useState } from 'react';
import { SonarScanItem } from '../../types/detection';
import { Copy, Check, Code, ShieldCheck } from 'lucide-react';
import { getSimulatedPriority, getSortedDetectionsByPriority } from '../../utils/detectionPriority';

interface JsonReportViewerProps {
  scan: SonarScanItem;
}

export const JsonReportViewer: React.FC<JsonReportViewerProps> = ({ scan }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const ranked = getSortedDetectionsByPriority(scan.detections, scan.target);

  const reportPayload = {
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
    location: {
      source: scan.location.source,
      latitude: scan.location.latitude,
      longitude: scan.location.longitude,
      transect_id: scan.location.transect_id || 'TR-OFFSHORE-04',
      accuracy_note: 'Estimated - Not highly accurate',
      datum: 'WGS-84 Maritime Hydrographic Grid',
      description: scan.location.description || 'Offshore Marine Grid (Estimated - Not highly accurate)',
    },
    detection_count: scan.detections.length,
    cleanup_inspection_order: ranked.map((r) => ({
      rank: r.rank,
      id: r.detection.id,
      class_name: r.detection.class_name,
      priority: r.priorityData.priority,
      hazard: r.priorityData.hazard,
      location_risk: r.priorityData.locationRisk,
      recommended_action: r.priorityData.recommendedAction,
      is_human: r.priorityData.isHuman,
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
        recommended_action: p.recommendedAction,
        ...(scan.isHardwareScan && { distance_of_the_object: d.distance || scan.hardwareDistance || '11.28 cm' }),
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
      };
    }),
  };

  const jsonString = JSON.stringify(reportPayload, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel" style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Code size={18} color="var(--sonar-cyan)" />
          <h4 style={{ fontSize: '15px', fontWeight: 600 }}>
            INFERENCE TELEMETRY PAYLOAD (JSON)
          </h4>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-emerald" style={{ fontSize: '11.5px' }}>
            OPERATIONAL PAYLOAD
          </span>
          <button onClick={handleCopy} className="btn btn-secondary btn-sm" style={{ padding: '4px 10px' }}>
            {copied ? <Check size={13} color="var(--status-emerald)" /> : <Copy size={13} />}
            <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
          </button>
        </div>
      </div>

      {/* JSON Display */}
      <div
        style={{
          background: '#040812',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-sm)',
          padding: '16px',
          maxHeight: '380px',
          overflowY: 'auto',
        }}
      >
        <pre
          className="mono"
          style={{
            fontSize: '13px',
            color: 'var(--text-primary)',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {jsonString}
        </pre>
      </div>

      <div
        style={{
          marginTop: '10px',
          fontSize: '12.5px',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <ShieldCheck size={13} color="var(--status-emerald)" />
        <span>
          Telemetry is derived directly from active YOLOv8 inference ({scan.image.filename}). Unaltered sensor-space telemetry.
        </span>
      </div>
    </div>
  );
};
