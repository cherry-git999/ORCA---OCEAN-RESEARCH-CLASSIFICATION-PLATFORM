import React from 'react';
import { GitBranch, ArrowDown, Cpu, AlertCircle, Layers } from 'lucide-react';
import { PredictTarget } from '../../types/api';

interface ModelRoutingCardProps {
  selectedTarget: PredictTarget;
  onSelectTarget: (target: PredictTarget) => void;
  isAnalyzing?: boolean;
}

export const ModelRoutingCard: React.FC<ModelRoutingCardProps> = ({
  selectedTarget,
  onSelectTarget,
  isAnalyzing = false,
}) => {
  const getModelDetails = (target: PredictTarget) => {
    switch (target) {
      case 'pipeline':
        return {
          name: 'YOLOv8n Pipeline Specialist (Model 1)',
          target: 'Pipeline',
          dataset: 'SubPipeMiniSSS (1,240 acoustic sonograms)',
          desc: 'Trained specifically on Netpbm / high-contrast underwater pipeline sonograms (0: Pipeline).',
          badgeColor: 'badge-cyan',
        };
      case 'human':
        return {
          name: 'YOLOv8n Human Specialist (Model 2)',
          target: 'Human',
          dataset: 'AquaScan-1K (1,050 sonar frames)',
          desc: 'Trained on diver acoustic returns and subsurface human silhouettes (0: Human).',
          badgeColor: 'badge-rose',
        };
      case 'hardware':
        return {
          name: 'YOLOv8n Hardware Specialist (Model 3)',
          target: 'Hardware',
          dataset: 'ESP Hardware (5-class object dataset)',
          desc: 'Trained on underwater marine hardware artifacts (0: cap, 1: clip, 2: key, 3: niddle, 4: scissor).',
          badgeColor: 'badge-emerald',
        };
    }
  };

  const modelDetails = getModelDetails(selectedTarget);

  return (
    <div className="glass-panel" style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(0, 242, 254, 0.12)',
              color: 'var(--sonar-cyan)',
            }}
          >
            <GitBranch size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600 }}>SPECIALIST MODEL ROUTING</h3>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Target-Aware Dispatch to Frozen Specialist Models</p>
          </div>
        </div>

        <span className="badge badge-cyan">
          MANUAL TARGET SELECTION
        </span>
      </div>

      {/* Target Selector Buttons (All 3 Specialist Models) */}
      <div style={{ marginBottom: '16px' }}>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Select Detection Target Specialist:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {/* 1. Pipeline */}
          <button
            type="button"
            id="target-pipeline-btn"
            data-testid="target-pipeline-btn"
            onClick={() => onSelectTarget('pipeline')}
            disabled={isAnalyzing}
            className={`btn ${selectedTarget === 'pipeline' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '10px 8px', textAlign: 'center', height: 'auto', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ fontWeight: 700, fontSize: '12px' }}>Pipeline</div>
            <div style={{ fontSize: '9px', opacity: 0.85, marginTop: '2px' }}>Model 1 (SubPipe)</div>
          </button>

          {/* 2. Human */}
          <button
            type="button"
            id="target-human-btn"
            data-testid="target-human-btn"
            onClick={() => onSelectTarget('human')}
            disabled={isAnalyzing}
            className={`btn ${selectedTarget === 'human' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '10px 8px', textAlign: 'center', height: 'auto', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ fontWeight: 700, fontSize: '12px' }}>Human</div>
            <div style={{ fontSize: '9px', opacity: 0.85, marginTop: '2px' }}>Model 2 (AquaScan)</div>
          </button>

          {/* 3. Hardware */}
          <button
            type="button"
            id="target-hardware-btn"
            data-testid="target-hardware-btn"
            onClick={() => onSelectTarget('hardware')}
            disabled={isAnalyzing}
            className={`btn ${selectedTarget === 'hardware' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '10px 8px', textAlign: 'center', height: 'auto', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ fontWeight: 700, fontSize: '12px' }}>Hardware</div>
            <div style={{ fontSize: '9px', opacity: 0.85, marginTop: '2px' }}>Model 3 (5-Class)</div>
          </button>
        </div>
      </div>

      {/* Routing Flow Visualizer */}
      <div
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        {/* Step 1: Input target */}
        <div
          style={{
            width: '100%',
            maxWidth: '440px',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-xs)',
            padding: '8px 12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              STEP 1: TARGET SELECTION
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600 }}>
              Target: <span style={{ color: 'var(--sonar-cyan)' }}>"{selectedTarget.toUpperCase()}"</span>
            </div>
          </div>
          <span className="badge badge-cyan" style={{ fontSize: '9px' }}>Assigned</span>
        </div>

        <ArrowDown size={14} color="var(--sonar-cyan)" />

        {/* Step 2: TargetRouter */}
        <div
          style={{
            width: '100%',
            maxWidth: '440px',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-active)',
            borderRadius: 'var(--radius-xs)',
            padding: '8px 12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: 'var(--sonar-cyan-glow)',
          }}
        >
          <div>
            <div style={{ fontSize: '9px', color: 'var(--sonar-cyan)', textTransform: 'uppercase', fontWeight: 600 }}>
              STEP 2: FASTAPI TARGETROUTER (POST /predict)
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600, marginTop: '2px' }}>
              ModelRegistry & ModelLoader Dispatch
            </div>
          </div>
          <Cpu size={16} color="var(--sonar-cyan)" />
        </div>

        <ArrowDown size={14} color="var(--sonar-cyan)" />

        {/* Step 3: Assigned Model */}
        <div
          style={{
            width: '100%',
            maxWidth: '440px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: 'var(--radius-xs)',
            padding: '10px 12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '9px', color: '#34d399', fontWeight: 600, textTransform: 'uppercase' }}>
              STEP 3: ACTIVE SPECIALIST MODEL
            </span>
            <span className="badge badge-emerald" style={{ fontSize: '9px' }}>Ready</span>
          </div>

          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            {modelDetails.name}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {modelDetails.desc}
          </div>
        </div>
      </div>

      {/* Notice */}
      <div
        style={{
          marginTop: '12px',
          padding: '8px 12px',
          borderRadius: 'var(--radius-xs)',
          background: 'rgba(56, 189, 248, 0.06)',
          border: '1px dashed var(--border-subtle)',
          fontSize: '11px',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <AlertCircle size={14} color="var(--sonar-cyan)" style={{ flexShrink: 0 }} />
        <span>
          <strong>Target-Aware Routing:</strong> Exactly one specialist model is loaded and invoked per request.
        </span>
      </div>
    </div>
  );
};
