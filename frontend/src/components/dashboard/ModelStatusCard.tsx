import React from 'react';
import { ModelInfo } from '../../types/detection';
import { Cpu, CheckCircle2, ShieldCheck } from 'lucide-react';

export const OPERATIONAL_MODELS: ModelInfo[] = [
  {
    id: 'pipeline',
    name: 'YOLOv8n Pipeline Specialist',
    role: 'Subsea Pipeline & Flowline Specialist',
    target: 'Pipeline',
    architecture: 'YOLOv8n (PyTorch / Ultralytics)',
    status: 'READY',
    dataset: 'SubPipeMiniSSS (1,240 acoustic images)',
  },
  {
    id: 'human',
    name: 'YOLOv8n Human Specialist',
    role: 'Acoustic Diver & Subsurface Human Specialist',
    target: 'Human',
    architecture: 'YOLOv8n (PyTorch / Ultralytics)',
    status: 'READY',
    dataset: 'AquaScan-1K (1,050 sonar frames)',
  },
  {
    id: 'hardware',
    name: 'YOLOv8n Hardware Specialist',
    role: 'Subsurface Marine Hardware & Debris Specialist',
    target: 'Hardware',
    architecture: 'YOLOv8n (PyTorch / Ultralytics)',
    status: 'READY',
    dataset: 'ESP Hardware (cap, clip, key, niddle, scissor)',
  },
];

interface ModelStatusCardProps {
  models?: ModelInfo[];
  activeModelName?: string;
}

export const ModelStatusCard: React.FC<ModelStatusCardProps> = ({
  models = OPERATIONAL_MODELS,
  activeModelName,
}) => {
  return (
    <div className="glass-panel" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(56, 189, 248, 0.12)',
              color: 'var(--sonar-teal)',
            }}
          >
            <Cpu size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '16.5px', fontWeight: 600 }}>FROZEN SPECIALIST MODELS STATUS</h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Target-Aware PyTorch Ultralytics Checkpoints</p>
          </div>
        </div>

        <span className="badge badge-emerald">
          <CheckCircle2 size={12} />
          3/3 Models Operational
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
        {models.map((model) => {
          const isCurrentlyActive = activeModelName?.toLowerCase().includes(model.target.toLowerCase());
          return (
            <div
              key={model.id}
              style={{
                background: 'var(--bg-surface)',
                border: `1px solid ${isCurrentlyActive ? 'var(--border-active)' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: isCurrentlyActive ? 'var(--sonar-cyan-glow)' : 'none',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {model.id.toUpperCase()}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {isCurrentlyActive && (
                      <span className="badge badge-cyan" style={{ fontSize: '11px' }}>
                        ACTIVE SCAN
                      </span>
                    )}
                    <span className="badge badge-emerald">READY</span>
                  </div>
                </div>

                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {model.name}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--sonar-cyan)', marginTop: '2px', fontWeight: 500 }}>
                  Target: {model.target}
                </div>
              </div>

              <div
                style={{
                  marginTop: '14px',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Architecture:</span>
                  <span className="mono" style={{ color: 'var(--text-secondary)' }}>{model.architecture}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Dataset:</span>
                  <span className="mono" style={{ color: 'var(--text-secondary)' }}>{model.dataset}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: '14px',
          padding: '10px 12px',
          borderRadius: 'var(--radius-xs)',
          background: 'rgba(56, 189, 248, 0.05)',
          border: '1px dashed var(--border-subtle)',
          fontSize: '12.5px',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <ShieldCheck size={14} color="var(--sonar-cyan)" />
        <span>
          Target-aware routing ensures inference is delegated strictly to the validated specialist model. Model Router V1 uses multinomial logistic regression (τ = 0.85).
        </span>
      </div>
    </div>
  );
};
