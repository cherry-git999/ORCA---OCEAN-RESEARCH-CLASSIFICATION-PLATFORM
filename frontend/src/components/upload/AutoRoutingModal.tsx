import React from 'react';
import { PredictAutoRouting, PredictTarget } from '../../types/api';
import { CheckCircle2, AlertTriangle, Sparkles, Cpu, ArrowRight, X, ShieldAlert } from 'lucide-react';

interface AutoRoutingModalProps {
  isOpen: boolean;
  routing: PredictAutoRouting | null;
  onViewResults: () => void;
  onSelectManual: (target: PredictTarget) => void;
  onClose: () => void;
}

export const AutoRoutingModal: React.FC<AutoRoutingModalProps> = ({
  isOpen,
  routing,
  onViewResults,
  onSelectManual,
  onClose,
}) => {
  if (!isOpen || !routing) return null;

  const isRouted = routing.status === 'routed';
  const confidencePercent = (routing.confidence * 100).toFixed(1);

  const getSpecialistModelName = (target: string | null) => {
    switch (target?.toLowerCase()) {
      case 'pipeline':
        return 'Pipeline Detection Model';
      case 'human':
        return 'Human Detection Model';
      case 'hardware':
        return 'Hardware Detection Model';
      default:
        return 'Specialist Detection Model';
    }
  };

  const getDomainColor = (target: string | null) => {
    switch (target?.toLowerCase()) {
      case 'pipeline':
        return 'var(--sonar-cyan, #00f2fe)';
      case 'human':
        return '#f43f5e';
      case 'hardware':
        return '#10b981';
      default:
        return 'var(--sonar-cyan, #00f2fe)';
    }
  };

  const domainColor = getDomainColor(routing.target);
  const specialistName = getSpecialistModelName(routing.target);

  return (
    <div
      id="auto-routing-modal-backdrop"
      data-testid="auto-routing-modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(3, 7, 18, 0.82)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="auto-routing-modal-card"
        data-testid="auto-routing-modal-card"
        className="glass-panel-elevated"
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '28px',
          borderRadius: 'var(--radius-lg, 16px)',
          background: 'linear-gradient(180deg, rgba(13, 22, 38, 0.95) 0%, rgba(7, 12, 22, 0.98) 100%)',
          border: isRouted ? `1px solid ${domainColor}` : '1px solid var(--warning, #f59e0b)',
          boxShadow: isRouted
            ? `0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px ${domainColor}25`
            : '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(245, 158, 11, 0.2)',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          id="close-routing-modal-btn"
          data-testid="close-routing-modal-btn"
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted, #94a3b8)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted, #94a3b8)')}
        >
          <X size={18} />
        </button>

        {isRouted ? (
          /* ========================================================= */
          /* CASE 1: ROUTED MODAL CONTENT                              */
          /* ========================================================= */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'center' }}>
            {/* Header Icon + Title */}
            <div>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  margin: '0 auto 14px auto',
                  borderRadius: '50%',
                  background: `${domainColor}18`,
                  border: `2px solid ${domainColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: domainColor,
                  boxShadow: `0 0 20px ${domainColor}40`,
                }}
              >
                <Sparkles size={28} />
              </div>
              <h2
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  color: 'var(--text-primary, #ffffff)',
                  textTransform: 'uppercase',
                  margin: '0 0 6px 0',
                }}
              >
                IMAGE ANALYSIS COMPLETE
              </h2>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14.5px',
                  fontWeight: 600,
                  color: domainColor,
                }}
              >
                <CheckCircle2 size={16} />
                <span>Model Automatically Selected</span>
              </div>
            </div>

            {/* Structured Telemetry Card */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                borderRadius: 'var(--radius-md, 10px)',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                textAlign: 'left',
              }}
            >
              {/* Selected Domain */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13.5px', color: 'var(--text-secondary, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Selected Domain
                </span>
                <span
                  id="modal-selected-domain"
                  data-testid="modal-selected-domain"
                  style={{
                    fontSize: '16.5px',
                    fontWeight: 800,
                    color: domainColor,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  {routing.target || routing.model}
                </span>
              </div>

              {/* Specialist Model */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13.5px', color: 'var(--text-secondary, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Specialist Model
                </span>
                <span
                  id="modal-specialist-model"
                  data-testid="modal-specialist-model"
                  style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary, #ffffff)' }}
                >
                  {specialistName}
                </span>
              </div>

              {/* Routing Confidence */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13.5px', color: 'var(--text-secondary, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Routing Confidence
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    id="modal-routing-confidence"
                    data-testid="modal-routing-confidence"
                    style={{
                      fontSize: '15.5px',
                      fontWeight: 800,
                      color: 'var(--text-primary, #ffffff)',
                      fontFamily: 'monospace',
                    }}
                  >
                    {confidencePercent}%
                  </span>
                  <span
                    className="badge badge-emerald"
                    style={{ fontSize: '11.5px', padding: '2px 6px' }}
                  >
                    CONFIDENT
                  </span>
                </div>
              </div>
            </div>

            {/* Detection Mechanism Explanation */}
            <p
              style={{
                fontSize: '13.5px',
                color: 'var(--text-secondary, #94a3b8)',
                margin: 0,
                lineHeight: '1.5',
              }}
            >
              Detected automatically from visual sensor invariants (color variance, saturation, acoustic texture, and contrast).
            </p>

            {/* Continue Button */}
            <button
              id="modal-continue-btn"
              data-testid="modal-continue-btn"
              onClick={onViewResults}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '15px',
                fontWeight: 700,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: domainColor,
                color: '#030712',
                border: 'none',
                boxShadow: `0 4px 16px ${domainColor}40`,
                cursor: 'pointer',
              }}
            >
              <span>Continue</span>
              <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          /* ========================================================= */
          /* CASE 2: UNCERTAIN / DEGENERATE MODAL CONTENT              */
          /* ========================================================= */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'center' }}>
            {/* Header Icon + Title */}
            <div>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  margin: '0 auto 14px auto',
                  borderRadius: '50%',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '2px solid var(--warning, #f59e0b)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--warning, #f59e0b)',
                  boxShadow: '0 0 20px rgba(245, 158, 11, 0.3)',
                }}
              >
                <AlertTriangle size={28} />
              </div>
              <h2
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  color: 'var(--text-primary, #ffffff)',
                  textTransform: 'uppercase',
                  margin: '0 0 6px 0',
                }}
              >
                IMAGE DOMAIN UNCERTAIN
              </h2>
              <div style={{ fontSize: '14.5px', color: 'var(--text-secondary, #94a3b8)' }}>
                We could not confidently determine the image type.
              </div>
            </div>

            {/* Diagnostic Information */}
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.05)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: 'var(--radius-md, 10px)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13.5px', color: 'var(--text-secondary, #94a3b8)' }}>Routing Confidence</span>
                <span
                  id="modal-uncertain-confidence"
                  data-testid="modal-uncertain-confidence"
                  style={{ fontSize: '14.5px', fontWeight: 700, color: '#f59e0b', fontFamily: 'monospace' }}
                >
                  {confidencePercent}%
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ fontSize: '13.5px', color: 'var(--text-secondary, #94a3b8)', flexShrink: 0 }}>Reason</span>
                <span
                  id="modal-uncertain-reason"
                  data-testid="modal-uncertain-reason"
                  style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary, #ffffff)', textAlign: 'right' }}
                >
                  {routing.reason === 'degenerate_image'
                    ? 'Image contains insufficient visual information for automatic routing.'
                    : 'Routing confidence below threshold (τ = 0.85).'}
                </span>
              </div>
            </div>

            {/* Manual Selection Prompt & Fallback Buttons */}
            <div>
              <div
                style={{
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: 'var(--text-secondary, #94a3b8)',
                  marginBottom: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Please select the model manually:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <button
                  type="button"
                  id="modal-fallback-pipeline-btn"
                  data-testid="modal-fallback-pipeline-btn"
                  onClick={() => onSelectManual('pipeline')}
                  className="btn btn-secondary"
                  style={{
                    padding: '12px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    borderColor: 'var(--sonar-cyan, #00f2fe)',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--sonar-cyan, #00f2fe)' }}>Pipeline</span>
                  <span style={{ fontSize: '11.5px', opacity: 0.8 }}>Model 1</span>
                </button>

                <button
                  type="button"
                  id="modal-fallback-human-btn"
                  data-testid="modal-fallback-human-btn"
                  onClick={() => onSelectManual('human')}
                  className="btn btn-secondary"
                  style={{
                    padding: '12px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    borderColor: '#f43f5e',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '14.5px', color: '#f43f5e' }}>Human</span>
                  <span style={{ fontSize: '11.5px', opacity: 0.8 }}>Model 2</span>
                </button>

                <button
                  type="button"
                  id="modal-fallback-hardware-btn"
                  data-testid="modal-fallback-hardware-btn"
                  onClick={() => onSelectManual('hardware')}
                  className="btn btn-secondary"
                  style={{
                    padding: '12px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    borderColor: '#10b981',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '14.5px', color: '#10b981' }}>Hardware</span>
                  <span style={{ fontSize: '11.5px', opacity: 0.8 }}>Model 3</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
