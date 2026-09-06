import React from 'react';
import { useSonar } from '../context/SonarContext';
import { ExportActions } from '../components/reports/ExportActions';
import { JsonReportViewer } from '../components/reports/JsonReportViewer';
import { EmptyState } from '../components/common/EmptyState';
import { FileText, CheckCircle2, ChevronDown } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { activeScan, scans, activeScanId, setActiveScanId } = useSonar();

  if (!activeScan) {
    return (
      <div className="animate-fade-in" style={{ padding: '40px 0' }}>
        <EmptyState
          type="no_scan"
          title="NO SCAN AVAILABLE FOR REPORT"
          description="Complete a scan analysis to view and export operational PDF, CSV, and JSON mission reports."
          actionText="Analyze Scan"
          onAction={() => {
            window.location.hash = '#/analyze';
          }}
        />
      </div>
    );
  }

  const totalAnomalies = activeScan.detections.length;
  const highConf = activeScan.detections.filter((d) => d.confidence >= 0.8).length;
  const routingConfText =
    activeScan.routingConfidence != null
      ? `${(activeScan.routingConfidence * 100).toFixed(1)}%`
      : 'N/A';

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Scan Selector if multiple scans exist */}
      {scans.length > 1 && (
        <div
          className="glass-panel"
          style={{
            padding: '12px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Select Analyzed Scan for Report:
          </span>
          <select
            className="form-select mono"
            value={activeScanId}
            onChange={(e) => setActiveScanId(e.target.value)}
            style={{ padding: '6px 12px', fontSize: '12px', width: 'auto' }}
          >
            {scans.map((s) => (
              <option key={s.id} value={s.id}>
                {s.image.filename} — {s.target.toUpperCase()} ({s.detections.length} detections)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Mission Summary Card */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(0, 242, 254, 0.12)',
                color: 'var(--sonar-cyan)',
              }}
            >
              <FileText size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>ORCA SCAN ANALYSIS MISSION REPORT</h3>
              <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Scan ID: {activeScan.id} • Swath File: {activeScan.image.filename} • {activeScan.timestamp}
              </span>
            </div>
          </div>

          <span className="badge badge-emerald">
            <CheckCircle2 size={12} />
            Verified Report Ready
          </span>
        </div>

        {/* Statistical Summary Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '12px',
            background: 'var(--bg-surface)',
            padding: '16px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Specialist Model
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--sonar-cyan)', marginTop: '2px' }}>
              {activeScan.model_name}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Swath Format
            </div>
            <div className="mono" style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px' }}>
              {activeScan.image.width} × {activeScan.image.height} px
            </div>
          </div>

          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Routing Confidence
            </div>
            <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8', marginTop: '2px' }}>
              {routingConfText}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Detections
            </div>
            <div
              className="mono"
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: totalAnomalies > 0 ? 'var(--text-highlight)' : 'var(--text-muted)',
                marginTop: '2px',
              }}
            >
              {totalAnomalies} {totalAnomalies === 1 ? 'Object' : 'Objects'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              High Conf (≥80%)
            </div>
            <div className="mono" style={{ fontSize: '15px', fontWeight: 700, color: '#34d399', marginTop: '2px' }}>
              {highConf}
            </div>
          </div>
        </div>
      </div>

      {/* Export Action Controls */}
      <ExportActions scan={activeScan} />

      {/* Structured JSON Report Preview */}
      <JsonReportViewer scan={activeScan} />
    </div>
  );
};
