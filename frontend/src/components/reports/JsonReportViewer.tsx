import React, { useState } from 'react';
import { SonarScanItem } from '../../types/detection';
import { Copy, Check, Code, ShieldCheck } from 'lucide-react';

interface JsonReportViewerProps {
  scan: SonarScanItem;
}

export const JsonReportViewer: React.FC<JsonReportViewerProps> = ({ scan }) => {
  const [copied, setCopied] = useState<boolean>(false);
  const isLive = scan.mission_id === 'TRANSECT-LIVE-ANALYSIS' || scan.id.startsWith('SCAN_');

  const reportPayload = {
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
    detection_count: scan.detections.length,
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
          <h4 style={{ fontSize: '14px', fontWeight: 600 }}>
            {isLive ? 'LIVE ANALYSIS TELEMETRY (JSON REPORT)' : 'DEMO REPORT PREVIEW (JSON TELEMETRY)'}
          </h4>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isLive ? (
            <span className="badge badge-emerald" style={{ fontSize: '10px' }}>
              LIVE TELEMETRY
            </span>
          ) : (
            <span className="badge badge-amber" style={{ fontSize: '10px' }}>
              DEMO REPORT PREVIEW
            </span>
          )}
          <button onClick={handleCopy} className="btn btn-secondary btn-sm" style={{ padding: '4px 10px' }}>
            {copied ? <Check size={13} color="var(--status-emerald)" /> : <Copy size={13} />}
            <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
          </button>
        </div>
      </div>

      {/* JSON Display */}
      <div style={{
        background: '#040812',
        border: '1px solid var(--border-medium)',
        borderRadius: 'var(--radius-sm)',
        padding: '16px',
        maxHeight: '380px',
        overflowY: 'auto',
      }}>
        <pre className="mono" style={{
          fontSize: '12px',
          color: 'var(--text-primary)',
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}>
          {jsonString}
        </pre>
      </div>

      <div style={{
        marginTop: '10px',
        fontSize: '11px',
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <ShieldCheck size={13} color="var(--status-emerald)" />
        <span>
          {isLive
            ? `Telemetry is derived from active YOLOv8 inference (${scan.image.filename}). Zero synthetic demo coordinates.`
            : 'Previewing static demonstration dataset. Compatible with Phase 7/8.2 backend response schema.'}
        </span>
      </div>
    </div>
  );
};
