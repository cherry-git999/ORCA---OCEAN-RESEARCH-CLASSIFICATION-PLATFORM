import React from 'react';
import { SonarScanItem } from '../../types/detection';
import { Compass, CheckCircle2, Waves, ArrowRight, ShieldCheck } from 'lucide-react';

interface CurrentMissionCardProps {
  scan: SonarScanItem;
  onOpenWorkspace: () => void;
}

export const CurrentMissionCard: React.FC<CurrentMissionCardProps> = ({
  scan,
  onOpenWorkspace,
}) => {
  return (
    <div className="glass-panel" style={{ padding: '20px' }}>
      {/* Card Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            padding: '8px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(0, 242, 254, 0.12)',
            color: 'var(--sonar-cyan)',
          }}>
            <Compass size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '16.5px', fontWeight: 600 }}>CURRENT MISSION EXECUTION</h3>
            <span className="mono" style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Mission ID: {scan.id}
            </span>
          </div>
        </div>

        <span className="badge badge-emerald">
          <CheckCircle2 size={12} />
          Analysis Complete
        </span>
      </div>

      {/* Grid of Key Mission Details */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        background: 'var(--bg-surface)',
        padding: '14px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-subtle)',
        marginBottom: '16px',
      }}>
        <div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Survey Sector</div>
          <div style={{ fontSize: '14.5px', fontWeight: 600, marginTop: '2px' }}>{scan.mission_id}</div>
        </div>

        <div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Model</div>
          <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--sonar-cyan)', marginTop: '2px' }}>
            {scan.model_name}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Acoustic File</div>
          <div className="mono" style={{ fontSize: '13.5px', marginTop: '2px' }}>{scan.image.filename}</div>
        </div>

        <div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Candidate Count</div>
          <div className="mono" style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-highlight)', marginTop: '2px' }}>
            {scan.detections.length} Anomalies
          </div>
        </div>
      </div>

      {/* Footer / CTA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
          <Waves size={14} color="var(--sonar-teal)" />
          <span>Sidescan swath: 1600 × 480 px • Subsea backscatter validated</span>
        </div>

        <button onClick={onOpenWorkspace} className="btn btn-primary btn-sm">
          <span>Open in Workspace</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};
