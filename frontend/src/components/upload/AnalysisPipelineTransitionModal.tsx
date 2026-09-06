import React from 'react';
import { CheckCircle2, ArrowRight, Layers, Sparkles } from 'lucide-react';

interface AnalysisPipelineTransitionModalProps {
  isOpen: boolean;
  modelName: string;
  targetName: string;
  detectionCount: number;
  onContinue: () => void;
}

const PIPELINE_STAGES = [
  { id: 1, name: 'Image Ingestion', desc: 'Acoustic / optical file stream decoded into memory' },
  { id: 2, name: 'Image Quality Check', desc: 'Spatial resolution, color space, dynamic range verified' },
  { id: 3, name: 'Domain Identification', desc: 'Visual invariants extracted via Router V1 (τ = 0.85)' },
  { id: 4, name: 'Specialist Model Selected', desc: 'Dedicated YOLOv8 target checkpoint engaged' },
  { id: 5, name: 'Object Detection', desc: 'Inference executed with bounding box coordinate regression' },
  { id: 6, name: 'Annotation Generation', desc: 'Confidence scoring & geometric label attribution generated' },
];

export const AnalysisPipelineTransitionModal: React.FC<AnalysisPipelineTransitionModalProps> = ({
  isOpen,
  modelName,
  targetName,
  detectionCount,
  onContinue,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="analysis-pipeline-modal-backdrop"
      data-testid="analysis-pipeline-modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(3, 7, 18, 0.88)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        id="analysis-pipeline-modal-card"
        data-testid="analysis-pipeline-modal-card"
        className="glass-panel-elevated"
        style={{
          width: '100%',
          maxWidth: '540px',
          padding: '28px',
          borderRadius: 'var(--radius-lg, 16px)',
          background: 'linear-gradient(180deg, rgba(13, 24, 44, 0.98) 0%, rgba(6, 12, 24, 0.99) 100%)',
          border: '1px solid var(--border-active, #00f2fe)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 242, 254, 0.15)',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              margin: '0 auto 12px auto',
              borderRadius: '50%',
              background: 'rgba(0, 242, 254, 0.12)',
              border: '2px solid var(--sonar-cyan, #00f2fe)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--sonar-cyan, #00f2fe)',
              boxShadow: '0 0 24px rgba(0, 242, 254, 0.3)',
            }}
          >
            <Layers size={24} />
          </div>

          <h2
            style={{
              fontSize: '18px',
              fontWeight: 800,
              letterSpacing: '0.06em',
              color: 'var(--text-primary, #ffffff)',
              textTransform: 'uppercase',
              margin: '0 0 4px 0',
            }}
          >
            ANALYSIS PIPELINE
          </h2>

          <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)' }}>
            Multimodal Underwater Intelligence Workflow Executed
          </div>
        </div>

        {/* Pipeline Stage Checklist */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            borderRadius: 'var(--radius-md, 10px)',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            marginBottom: '22px',
          }}
        >
          {PIPELINE_STAGES.map((stage) => (
            <div
              key={stage.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: stage.id < 6 ? '10px' : '0',
                borderBottom: stage.id < 6 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>
                  0{stage.id}
                </span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #ffffff)' }}>
                    {stage.name}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary, #94a3b8)' }}>
                    {stage.desc}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--status-emerald, #10b981)' }}>
                <CheckCircle2 size={16} />
              </div>
            </div>
          ))}
        </div>

        {/* Summary Info Pill */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 14px',
            background: 'rgba(0, 242, 254, 0.05)',
            border: '1px solid rgba(0, 242, 254, 0.2)',
            borderRadius: 'var(--radius-sm, 8px)',
            marginBottom: '20px',
            fontSize: '12px',
          }}
        >
          <div>
            <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Specialist: </span>
            <strong style={{ color: 'var(--sonar-cyan, #00f2fe)' }}>{targetName.toUpperCase()}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Detections: </span>
            <strong className="mono" style={{ color: '#34d399' }}>{detectionCount}</strong>
          </div>
        </div>

        {/* Action Button */}
        <button
          id="continue-to-workspace-btn"
          data-testid="continue-to-workspace-btn"
          onClick={onContinue}
          className="btn btn-primary"
          style={{
            width: '100%',
            padding: '14px',
            fontSize: '14px',
            fontWeight: 700,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 18px rgba(0, 242, 254, 0.35)',
          }}
        >
          <span>Continue to Detection Workspace</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
