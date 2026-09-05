import React from 'react';
import { GitBranch, ArrowDown, Cpu, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

interface ModelRoutingCardProps {
  selectedTarget: 'pipeline' | 'human';
  onSelectTarget: (target: 'pipeline' | 'human') => void;
  isAnalyzing?: boolean;
}

export const ModelRoutingCard: React.FC<ModelRoutingCardProps> = ({
  selectedTarget,
  onSelectTarget,
  isAnalyzing = false,
}) => {
  const modelDetails =
    selectedTarget === 'pipeline'
      ? {
          name: 'YOLOv8n Pipeline Specialist (Model 1)',
          target: 'Pipeline',
          dataset: 'SubPipeMiniSSS (1,240 acoustic sonograms)',
          desc: 'Trained specifically on Netpbm / high-contrast underwater pipeline sonograms.',
        }
      : {
          name: 'YOLOv8n Human Specialist (Model 2)',
          target: 'Human',
          dataset: 'AquaScan-1K (1,050 sonar frames)',
          desc: 'Trained on diver acoustic returns and subsurface human silhouettes.',
        };

  return (
    <div className="glass-panel" style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            padding: '8px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(0, 242, 254, 0.12)',
            color: 'var(--sonar-cyan)',
          }}>
            <GitBranch size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600 }}>ROUTING ARCHITECTURE (STAGE 1)</h3>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Current Routing Mode: Manual Target Selection</p>
          </div>
        </div>

        <span className="badge badge-cyan">
          MANUAL TARGET SELECTION
        </span>
      </div>

      {/* Target Selector Buttons */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Select Detection Target Specialist:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button
            type="button"
            id="target-pipeline-btn"
            data-testid="target-pipeline-btn"
            onClick={() => onSelectTarget('pipeline')}
            disabled={isAnalyzing}
            className={`btn ${selectedTarget === 'pipeline' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '12px 14px', textAlign: 'center', height: 'auto' }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px' }}>Pipeline Specialist</div>
              <div style={{ fontSize: '10px', opacity: 0.85, marginTop: '2px' }}>SubPipe MiniSSS (Model 1)</div>
            </div>
          </button>
          <button
            type="button"
            id="target-human-btn"
            data-testid="target-human-btn"
            onClick={() => onSelectTarget('human')}
            disabled={isAnalyzing}
            className={`btn ${selectedTarget === 'human' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '12px 14px', textAlign: 'center', height: 'auto' }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px' }}>Human Specialist</div>
              <div style={{ fontSize: '10px', opacity: 0.85, marginTop: '2px' }}>AquaScan-1K Diver (Model 2)</div>
            </div>
          </button>
        </div>
      </div>

      {/* Routing Flow Visualizer */}
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-subtle)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
      }}>
        {/* Step 1: Input target */}
        <div style={{
          width: '100%',
          maxWidth: '440px',
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-xs)',
          padding: '10px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              STEP 1: INGESTION & MANUAL TARGET
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>
              Target: <span style={{ color: 'var(--sonar-cyan)' }}>"{selectedTarget}"</span>
            </div>
          </div>
          <span className="badge badge-cyan">Assigned</span>
        </div>

        <ArrowDown size={16} color="var(--sonar-cyan)" />

        {/* Step 2: TargetRouter */}
        <div style={{
          width: '100%',
          maxWidth: '440px',
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-active)',
          borderRadius: 'var(--radius-xs)',
          padding: '10px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: 'var(--sonar-cyan-glow)',
        }}>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--sonar-cyan)', textTransform: 'uppercase', fontWeight: 600 }}>
              STEP 2: FASTAPI TARGET ROUTER
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>
              Direct Specialist Model Dispatch
            </div>
          </div>
          <Cpu size={18} color="var(--sonar-cyan)" />
        </div>

        <ArrowDown size={16} color="var(--sonar-cyan)" />

        {/* Step 3: Assigned Model */}
        <div style={{
          width: '100%',
          maxWidth: '440px',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          borderRadius: 'var(--radius-xs)',
          padding: '12px 14px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: '#34d399', fontWeight: 600, textTransform: 'uppercase' }}>
              STEP 3: ACTIVE INFERENCE SPECIALIST
            </span>
            <span className="badge badge-emerald">Ready</span>
          </div>

          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            {modelDetails.name}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {modelDetails.desc}
          </div>
        </div>
      </div>

      {/* Stage 1 Note as explicitly requested */}
      <div style={{
        marginTop: '12px',
        padding: '10px 12px',
        borderRadius: 'var(--radius-xs)',
        background: 'rgba(56, 189, 248, 0.06)',
        border: '1px dashed var(--border-subtle)',
        fontSize: '11px',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <AlertCircle size={14} color="var(--sonar-cyan)" style={{ flexShrink: 0 }} />
        <span>
          <strong>Stage 1 Notice:</strong> Current routing mode is manual target selection. Automatic model selection will be enabled in a future system stage.
        </span>
      </div>
    </div>
  );
};
