import React, { useState } from 'react';
import { CheckCircle2, Loader2, Circle, AlertCircle, Play, RotateCcw } from 'lucide-react';

export type StageStatus = 'pending' | 'processing' | 'complete' | 'unavailable';

export interface PipelineStage {
  id: number;
  label: string;
  description: string;
  status: StageStatus;
}

const INITIAL_STAGES: PipelineStage[] = [
  { id: 1, label: 'Image Uploaded', description: 'Netpbm/Raster sonar file ingested', status: 'complete' },
  { id: 2, label: 'Image Validated', description: 'Resolution, depth, channels verified', status: 'complete' },
  { id: 3, label: 'Model Selected', description: 'Target-aware specialist model assigned', status: 'complete' },
  { id: 4, label: 'Inference', description: 'YOLOv8 acoustic bounding box detection', status: 'complete' },
  { id: 5, label: 'Confidence Filtering', description: 'Confidence threshold applied (≥50%)', status: 'complete' },
  { id: 6, label: 'Detection Analysis', description: 'Pixel bbox measurement and ranking', status: 'complete' },
  { id: 7, label: 'Location Association', description: 'Transect waypoint linkage (Demo mode)', status: 'complete' },
  { id: 8, label: 'Report Preparation', description: 'Structured JSON/CSV payload assembled', status: 'complete' },
  { id: 9, label: 'Analysis Complete', description: 'Ready for Detection Workspace review', status: 'complete' },
];

export const PipelineStepper: React.FC = () => {
  const [stages, setStages] = useState<PipelineStage[]>(INITIAL_STAGES);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const runSimulation = () => {
    setIsSimulating(true);
    // Reset all to pending
    const reset = INITIAL_STAGES.map((s) => ({ ...s, status: 'pending' as StageStatus }));
    setStages(reset);

    let step = 0;
    const interval = setInterval(() => {
      if (step < INITIAL_STAGES.length) {
        setStages((prev) =>
          prev.map((s, idx) => {
            if (idx < step) return { ...s, status: 'complete' };
            if (idx === step) return { ...s, status: 'processing' };
            return { ...s, status: 'pending' };
          })
        );
        step++;
      } else {
        setStages((prev) => prev.map((s) => ({ ...s, status: 'complete' })));
        setIsSimulating(false);
        clearInterval(interval);
      }
    }, 450);
  };

  const resetPipeline = () => {
    setStages(INITIAL_STAGES);
    setIsSimulating(false);
  };

  return (
    <div className="glass-panel" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 600 }}>ANALYSIS PIPELINE ORCHESTRATION</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>9-Stage Automated Marine Anomaly Processing</p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={runSimulation}
            disabled={isSimulating}
            className="btn btn-secondary btn-sm"
          >
            {isSimulating ? <Loader2 size={13} className="sonar-ping" /> : <Play size={13} />}
            {isSimulating ? 'Simulating...' : 'Simulate Pipeline'}
          </button>
          <button
            onClick={resetPipeline}
            disabled={isSimulating}
            className="btn btn-ghost btn-sm"
            title="Reset Stepper"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Stepper Timeline List */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
      }}>
        {stages.map((stage) => {
          let badgeColor = 'badge-muted';
          let statusText = 'Pending';
          let Icon = Circle;
          let iconColor = 'var(--text-muted)';

          if (stage.status === 'complete') {
            badgeColor = 'badge-emerald';
            statusText = 'Complete';
            Icon = CheckCircle2;
            iconColor = 'var(--status-emerald)';
          } else if (stage.status === 'processing') {
            badgeColor = 'badge-cyan';
            statusText = 'Processing...';
            Icon = Loader2;
            iconColor = 'var(--sonar-cyan)';
          } else if (stage.status === 'unavailable') {
            badgeColor = 'badge-amber';
            statusText = 'Conditional';
            Icon = AlertCircle;
            iconColor = 'var(--status-amber)';
          }

          return (
            <div
              key={stage.id}
              style={{
                background: stage.status === 'processing' ? 'rgba(0, 242, 254, 0.08)' : 'var(--bg-surface)',
                border: `1px solid ${stage.status === 'processing' ? 'var(--border-active)' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon
                    size={16}
                    color={iconColor}
                    style={{ animation: stage.status === 'processing' ? 'spin 1.5s linear infinite' : 'none' }}
                  />
                  <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    0{stage.id}
                  </span>
                </div>
                <span className={`badge ${badgeColor}`} style={{ fontSize: '9px' }}>
                  {statusText}
                </span>
              </div>

              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {stage.label}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {stage.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
