import React from 'react';
import { Detection } from '../../types/detection';
import { BarChart3, Info } from 'lucide-react';

interface ConfidenceChartProps {
  detections: Detection[];
}

export const ConfidenceChart: React.FC<ConfidenceChartProps> = ({ detections }) => {
  const high = detections.filter((d) => d.confidence >= 0.8).length;
  const medium = detections.filter((d) => d.confidence >= 0.5 && d.confidence < 0.8).length;
  const low = detections.filter((d) => d.confidence < 0.5).length;
  const total = detections.length || 1;

  const highPct = Math.round((high / total) * 100);
  const medPct = Math.round((medium / total) * 100);
  const lowPct = Math.round((low / total) * 100);

  return (
    <div className="glass-panel" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart3 size={18} color="var(--sonar-cyan)" />
          <h3 style={{ fontSize: '15px', fontWeight: 600 }}>CONFIDENCE DISTRIBUTION</h3>
        </div>
        <span className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {detections.length} Candidates Analyzed
        </span>
      </div>

      {/* Stacked Progress Bar */}
      <div style={{
        width: '100%',
        height: '14px',
        borderRadius: '7px',
        background: 'var(--bg-surface-elevated)',
        display: 'flex',
        overflow: 'hidden',
        marginBottom: '16px',
        border: '1px solid var(--border-subtle)',
      }}>
        <div
          title={`High: ${high}`}
          style={{
            width: `${highPct}%`,
            background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
            transition: 'width 0.4s ease',
          }}
        />
        <div
          title={`Medium: ${medium}`}
          style={{
            width: `${medPct}%`,
            background: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)',
            transition: 'width 0.4s ease',
          }}
        />
        <div
          title={`Low: ${low}`}
          style={{
            width: `${lowPct}%`,
            background: 'linear-gradient(90deg, #f43f5e 0%, #fb7185 100%)',
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      {/* Legend & Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        {/* High */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#34d399', fontWeight: 600 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
            HIGH (≥ 80%)
          </div>
          <div className="mono" style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>
            {high}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{highPct}% of total</div>
        </div>

        {/* Medium */}
        <div style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#fbbf24', fontWeight: 600 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
            MEDIUM (50–79%)
          </div>
          <div className="mono" style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>
            {medium}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{medPct}% of total</div>
        </div>

        {/* Low */}
        <div style={{
          background: 'rgba(244, 63, 94, 0.08)',
          border: '1px solid rgba(244, 63, 94, 0.25)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#fb7185', fontWeight: 600 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f43f5e' }} />
            LOW (&lt; 50%)
          </div>
          <div className="mono" style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>
            {low}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{lowPct}% of total</div>
        </div>
      </div>

      <div style={{
        marginTop: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '11px',
        color: 'var(--text-muted)',
      }}>
        <Info size={13} color="var(--sonar-cyan)" />
        <span>Detection Confidence thresholds are presentation categories, not calibrated truth probabilities.</span>
      </div>
    </div>
  );
};
