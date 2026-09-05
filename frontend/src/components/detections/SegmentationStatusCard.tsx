import React from 'react';
import { Layers, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

export const SegmentationStatusCard: React.FC = () => {
  return (
    <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={16} color="var(--sonar-cyan)" />
          <h4 style={{ fontSize: '13px', fontWeight: 600 }}>SEMANTIC SEGMENTATION STATUS</h4>
        </div>
        <span className="badge badge-amber">CONDITIONAL</span>
      </div>

      {/* Comparison Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px',
        background: 'var(--bg-surface)',
        padding: '10px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Acoustic Bounding-Box Detection
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={15} color="var(--status-emerald)" />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#34d399' }}>OPERATIONAL</span>
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            Specialist YOLOv8n models active
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Pixel-Level Mask Segmentation
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={15} color="var(--status-amber)" />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#fbbf24' }}>CONDITIONAL</span>
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            No verified mask checkpoint
          </span>
        </div>
      </div>

      {/* Notice Banner */}
      <div style={{
        background: 'rgba(245, 158, 11, 0.08)',
        border: '1px solid rgba(245, 158, 11, 0.25)',
        borderRadius: 'var(--radius-xs)',
        padding: '8px 10px',
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-start',
      }}>
        <ShieldCheck size={14} color="var(--status-amber)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '11px', color: '#fbbf24', lineHeight: '1.4' }}>
          <strong>Strict No-Fake-Segmentation Policy:</strong> "No verified pixel-level segmentation model is currently available." The system refuses to fabricate arbitrary masks from rectangular bounding boxes.
        </div>
      </div>
    </div>
  );
};
