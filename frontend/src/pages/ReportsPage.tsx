import React from 'react';
import { useSonar } from '../context/SonarContext';
import { ExportActions } from '../components/reports/ExportActions';
import { JsonReportViewer } from '../components/reports/JsonReportViewer';
import { FileText, CheckCircle2, ShieldCheck } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { activeScan, scans } = useSonar();

  if (!activeScan) return null;

  const isLive = activeScan.mission_id === 'TRANSECT-LIVE-ANALYSIS' || activeScan.id.startsWith('SCAN_');
  const totalAnomalies = activeScan.detections.length;
  const highConf = activeScan.detections.filter((d) => d.confidence >= 0.8).length;
  const requiresReview = activeScan.detections.filter((d) => d.review_status === 'review_required').length;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Mission Summary Card */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(0, 242, 254, 0.12)',
              color: 'var(--sonar-cyan)',
            }}>
              <FileText size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>ACOUSTIC SURVEY MISSION REPORT SUMMARY</h3>
              <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Mission Reference: {activeScan.mission_id} • Scan ID: {activeScan.id} • Swath: {activeScan.image.filename}
              </span>
            </div>
          </div>

          <span className={`badge ${isLive ? 'badge-emerald' : 'badge-cyan'}`}>
            <CheckCircle2 size={12} />
            {isLive ? 'Live Synthesis Ready' : 'Demo Synthesis Ready'}
          </span>
        </div>

        {/* Statistical Summary Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '12px',
          background: 'var(--bg-surface)',
          padding: '16px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
        }}>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Specialist Model</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--sonar-cyan)', marginTop: '2px' }}>
              {activeScan.model_name.replace('YOLOv8n ', '')}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Swath Format</div>
            <div className="mono" style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px' }}>
              {activeScan.image.width} × {activeScan.image.height} px
            </div>
          </div>

          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Anomalies</div>
            <div className="mono" style={{
              fontSize: '16px',
              fontWeight: 700,
              color: totalAnomalies > 0 ? 'var(--text-highlight)' : 'var(--text-muted)',
              marginTop: '2px',
            }}>
              {totalAnomalies} {totalAnomalies === 1 ? 'Detection' : 'Detections'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>High Conf (≥80%)</div>
            <div className="mono" style={{ fontSize: '16px', fontWeight: 700, color: '#34d399', marginTop: '2px' }}>
              {highConf}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Requires Review</div>
            <div className="mono" style={{ fontSize: '16px', fontWeight: 700, color: '#fbbf24', marginTop: '2px' }}>
              {requiresReview}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Location Source</div>
            <div style={{ marginTop: '4px' }}>
              {activeScan.location.source === 'unavailable' ? (
                <span className="badge badge-rose" style={{ fontSize: '9px' }}>
                  GPS Unavailable
                </span>
              ) : activeScan.location.source === 'sonar_metadata' ? (
                <span className="badge badge-emerald" style={{ fontSize: '9px' }}>
                  Sonar Metadata
                </span>
              ) : (
                <span className="badge badge-amber" style={{ fontSize: '9px' }}>
                  Demo Coordinates
                </span>
              )}
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
