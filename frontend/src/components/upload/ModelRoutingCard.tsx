import React from 'react';
import { GitBranch, ArrowDown, Cpu, Sparkles, Layers, ShieldCheck } from 'lucide-react';
import { DetectionMode, PredictTarget } from '../../types/api';

interface ModelRoutingCardProps {
  detectionMode: DetectionMode;
  onSelectMode: (mode: DetectionMode) => void;
  selectedTarget?: PredictTarget;
  onSelectTarget?: (target: PredictTarget) => void;
  isAnalyzing?: boolean;
}

export const ModelRoutingCard: React.FC<ModelRoutingCardProps> = ({
  detectionMode,
  onSelectMode,
  selectedTarget,
  onSelectTarget,
  isAnalyzing = false,
}) => {
  const currentMode = detectionMode || (selectedTarget as DetectionMode) || 'auto';

  const handleModeChange = (mode: DetectionMode) => {
    onSelectMode(mode);
    if (onSelectTarget && mode !== 'auto') {
      onSelectTarget(mode as PredictTarget);
    }
  };

  const getModeDetails = (mode: DetectionMode) => {
    switch (mode) {
      case 'auto':
        return {
          title: 'Automatic Model Selection (Router V1)',
          subtitle: 'Lightweight Multinomial Logistic Regression Router (τ = 0.85)',
          desc: 'Automatically classifies input visual invariants (color variance, saturation, acoustic texture, dynamic range) and selects the appropriate specialist model before inference.',
          badge: 'AUTOMATIC ROUTING',
          badgeColor: 'badge-purple',
          accentColor: 'var(--sonar-cyan, #00f2fe)',
        };
      case 'pipeline':
        return {
          title: 'YOLOv8n Pipeline Specialist (Model 1)',
          subtitle: 'Target: Pipeline (Class 0: Pipeline)',
          desc: 'Specialist trained specifically on Netpbm / high-contrast underwater pipeline sonograms from SubPipeMiniSSS.',
          badge: 'MANUAL TARGET',
          badgeColor: 'badge-cyan',
          accentColor: 'var(--sonar-cyan, #00f2fe)',
        };
      case 'human':
        return {
          title: 'YOLOv8n Human Specialist (Model 2)',
          subtitle: 'Target: Human (Class 0: Human)',
          desc: 'Specialist trained on diver acoustic returns and subsurface human silhouettes from AquaScan-1K.',
          badge: 'MANUAL TARGET',
          badgeColor: 'badge-rose',
          accentColor: '#f43f5e',
        };
      case 'hardware':
        return {
          title: 'YOLOv8n Hardware Specialist (Model 3)',
          subtitle: 'Target: Hardware (5 Classes: cap, clip, key, niddle, scissor)',
          desc: 'Specialist trained on underwater marine hardware artifacts from the ESP Hardware dataset.',
          badge: 'MANUAL TARGET',
          badgeColor: 'badge-emerald',
          accentColor: '#10b981',
        };
    }
  };

  const details = getModeDetails(currentMode);

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
              color: details.accentColor,
            }}
          >
            {currentMode === 'auto' ? <Sparkles size={18} /> : <GitBranch size={18} />}
          </div>
          <div>
            <h3 style={{ fontSize: '16.5px', fontWeight: 600, margin: 0 }}>DETECTION & ROUTING MODE</h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0 }}>
              {currentMode === 'auto'
                ? 'Automatic Image-Level Model Selection (No Manual Target Needed)'
                : 'Manual Specialist Model Override'}
            </p>
          </div>
        </div>

        <span className={`badge ${details.badgeColor}`}>
          {details.badge}
        </span>
      </div>

      {/* Detection Mode Selector Buttons */}
      <div style={{ marginBottom: '16px' }}>
        <div
          style={{
            fontSize: '12.5px',
            color: 'var(--text-muted)',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>Select Detection Mode:</span>
          {currentMode === 'auto' && (
            <span style={{ color: 'var(--sonar-cyan)', fontWeight: 600 }}>Default / Recommended</span>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: '8px' }}>
          {/* 1. Automatic */}
          <button
            type="button"
            id="mode-auto-btn"
            data-testid="mode-auto-btn"
            onClick={() => handleModeChange('auto')}
            disabled={isAnalyzing}
            className={`btn ${currentMode === 'auto' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '10px 8px',
              textAlign: 'center',
              height: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              borderColor: currentMode === 'auto' ? 'var(--sonar-cyan)' : undefined,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, fontSize: '13.5px' }}>
              <Sparkles size={12} />
              <span>Automatic</span>
            </div>
            <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>Auto Selector</div>
          </button>

          {/* 2. Pipeline */}
          <button
            type="button"
            id="target-pipeline-btn"
            data-testid="target-pipeline-btn"
            onClick={() => handleModeChange('pipeline')}
            disabled={isAnalyzing}
            className={`btn ${currentMode === 'pipeline' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '10px 8px', textAlign: 'center', height: 'auto', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ fontWeight: 700, fontSize: '13.5px' }}>Pipeline</div>
            <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>Model 1</div>
          </button>

          {/* 3. Human */}
          <button
            type="button"
            id="target-human-btn"
            data-testid="target-human-btn"
            onClick={() => handleModeChange('human')}
            disabled={isAnalyzing}
            className={`btn ${currentMode === 'human' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '10px 8px', textAlign: 'center', height: 'auto', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ fontWeight: 700, fontSize: '13.5px' }}>Human</div>
            <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>Model 2</div>
          </button>

          {/* 4. Hardware */}
          <button
            type="button"
            id="target-hardware-btn"
            data-testid="target-hardware-btn"
            onClick={() => handleModeChange('hardware')}
            disabled={isAnalyzing}
            className={`btn ${currentMode === 'hardware' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '10px 8px', textAlign: 'center', height: 'auto', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ fontWeight: 700, fontSize: '13.5px' }}>Hardware</div>
            <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>Model 3</div>
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
        {/* Step 1: Input target or Auto Router */}
        <div
          style={{
            width: '100%',
            maxWidth: '440px',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-xs)',
            padding: '10px 12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={14} color={details.accentColor} />
            <span style={{ fontSize: '13.5px', fontWeight: 600 }}>
              {currentMode === 'auto' ? 'Automatic Selector Mode' : `Selected Target: ${details.title}`}
            </span>
          </div>
          <span className="mono" style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
            {currentMode === 'auto' ? 'POST /predict-auto' : `POST /predict (target=${currentMode})`}
          </span>
        </div>

        {/* Step 2: Downward Arrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
          <ArrowDown size={14} />
          <span style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {currentMode === 'auto' ? 'Feature Extraction & Confidence Gating (τ = 0.85)' : 'TargetRouter Direct Dispatch'}
          </span>
        </div>

        {/* Step 3: Target Model Display */}
        <div
          style={{
            width: '100%',
            maxWidth: '440px',
            background: 'rgba(0, 242, 254, 0.04)',
            border: `1px solid ${details.accentColor}40`,
            borderRadius: 'var(--radius-xs)',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={14} color={details.accentColor} />
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {details.title}
              </span>
            </div>
            <span className="badge badge-outline" style={{ fontSize: '11.5px' }}>
              FROZEN
            </span>
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            {details.subtitle}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            {details.desc}
          </div>
        </div>
      </div>

      {/* Safety Note Footer */}
      <div
        style={{
          marginTop: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: 'var(--radius-xs)',
          fontSize: '12.5px',
          color: 'var(--text-secondary)',
        }}
      >
        <ShieldCheck size={14} color="var(--sonar-cyan)" />
        <span>
          {currentMode === 'auto'
            ? 'Automatic mode executes specialist inference only when routing confidence ≥ 85%.'
            : 'Manual mode strictly directs inference to the selected specialist model.'}
        </span>
      </div>
    </div>
  );
};
