import React, { useState, useRef } from 'react';
import { Detection, ReviewStatus } from '../../types/detection';
import { Crosshair, Check, X, Clock, ShieldCheck } from 'lucide-react';
import { ReviewConfirmationModal } from './ReviewConfirmationModal';

interface DetectionDetailPanelProps {
  detection: Detection | undefined;
  onUpdateReviewStatus: (detectionId: string, status: ReviewStatus) => void;
  isLiveAnalysis?: boolean;
}

export const DetectionDetailPanel: React.FC<DetectionDetailPanelProps> = ({
  detection,
  onUpdateReviewStatus,
}) => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    status: ReviewStatus | null;
  }>({
    isOpen: false,
    status: null,
  });

  const [isHighlighted, setIsHighlighted] = useState<boolean>(false);
  const reviewCardRef = useRef<HTMLDivElement>(null);

  if (!detection) {
    return (
      <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <Crosshair size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px auto' }} />
        <h4 style={{ fontSize: '14px', fontWeight: 600 }}>NO ANOMALY SELECTED</h4>
        <p style={{ fontSize: '12px', marginTop: '4px' }}>Click a bounding box on the image or select a row in the table.</p>
      </div>
    );
  }

  const width = Math.abs(detection.bbox.x2 - detection.bbox.x1);
  const height = Math.abs(detection.bbox.y2 - detection.bbox.y1);

  const confPercent = Math.round(detection.confidence * 1000) / 10;
  let confLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  let confBadgeClass = 'badge-rose';
  let confColor = 'var(--status-rose)';

  if (detection.confidence >= 0.8) {
    confLevel = 'HIGH';
    confBadgeClass = 'badge-emerald';
    confColor = 'var(--status-emerald)';
  } else if (detection.confidence >= 0.5) {
    confLevel = 'MEDIUM';
    confBadgeClass = 'badge-cyan';
    confColor = 'var(--sonar-cyan)';
  }

  const handleAction = (status: ReviewStatus) => {
    onUpdateReviewStatus(detection.id, status);
    setModalState({
      isOpen: true,
      status,
    });
  };

  const handleModalOk = () => {
    setModalState({ isOpen: false, status: null });
    setIsHighlighted(true);
    if (reviewCardRef.current) {
      reviewCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    setTimeout(() => {
      setIsHighlighted(false);
    }, 2200);
  };

  const currentStatus = detection.review_status || 'pending';

  return (
    <>
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Crosshair size={18} color="var(--sonar-cyan)" />
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>ANOMALY DETAILS</h3>
          </div>
          <span className="badge badge-emerald" style={{ fontSize: '10px' }}>
            VERIFIED DETECTION
          </span>
        </div>

        {/* Main Metric Banner */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-sm)',
            padding: '14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Anomaly Identification
              </div>
              <div
                className="mono"
                style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}
              >
                {detection.id}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--sonar-cyan)', fontWeight: 600, marginTop: '2px' }}>
                Target Class: {detection.class_name.toUpperCase()}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span className={`badge ${confBadgeClass}`} style={{ fontSize: '11px' }}>
                {confLevel} CONFIDENCE
              </span>
              <div className="mono" style={{ fontSize: '22px', fontWeight: 800, color: confColor, marginTop: '4px' }}>
                {confPercent}%
              </div>
            </div>
          </div>

          {/* Confidence Progress Bar */}
          <div style={{ marginTop: '12px' }}>
            <div
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: 'var(--bg-surface-elevated)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${detection.confidence * 100}%`,
                  height: '100%',
                  background: confColor,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10px',
                color: 'var(--text-muted)',
                marginTop: '4px',
              }}
            >
              <span>0%</span>
              <span>Threshold: 50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* Bounding Box Metrics Grid (Native API Coordinates & Dimensions) */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Native Bounding Box Coordinates
            </div>
            <span className="badge badge-muted" style={{ fontSize: '9px' }}>
              API PIXELS [X1, Y1, X2, Y2]
            </span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
              background: 'var(--bg-surface)',
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '8px',
            }}
          >
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>X1 (Left)</div>
              <div className="mono" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--sonar-cyan)' }}>
                {detection.bbox.x1} px
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Y1 (Top)</div>
              <div className="mono" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--sonar-cyan)' }}>
                {detection.bbox.y1} px
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>X2 (Right)</div>
              <div className="mono" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--sonar-cyan)' }}>
                {detection.bbox.x2} px
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Y2 (Bottom)</div>
              <div className="mono" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--sonar-cyan)' }}>
                {detection.bbox.y2} px
              </div>
            </div>
          </div>

          {/* Calculated Pixel Geometry */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              background: 'var(--bg-surface-elevated)',
              padding: '8px 10px',
              borderRadius: 'var(--radius-xs)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Box Width: </span>
              <strong className="mono" style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                {width.toFixed(1)} px
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Box Height: </span>
              <strong className="mono" style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                {height.toFixed(1)} px
              </strong>
            </div>
          </div>
        </div>

        {/* Manual Expert Review (Repositioned Higher, Section 14, 15, 16) */}
        <div
          ref={reviewCardRef}
          id="manual-expert-review-card"
          data-testid="manual-expert-review-card"
          style={{
            background: isHighlighted ? 'rgba(0, 242, 254, 0.12)' : 'var(--bg-surface-elevated)',
            border: isHighlighted ? '1px solid var(--sonar-cyan)' : '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-sm)',
            padding: '14px',
            boxShadow: isHighlighted ? '0 0 16px rgba(0, 242, 254, 0.4)' : 'none',
            transition: 'all 0.3s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Manual Expert Review
            </span>
            <span
              id="current-detection-review-badge"
              data-testid="current-detection-review-badge"
              className={`badge ${
                currentStatus === 'confirmed'
                  ? 'badge-emerald'
                  : currentStatus === 'rejected'
                  ? 'badge-rose'
                  : currentStatus === 'review_required'
                  ? 'badge-amber'
                  : 'badge-muted'
              }`}
            >
              {currentStatus.toUpperCase().replace('_', ' ')}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <button
              id="review-action-confirm"
              data-testid="review-action-confirm"
              onClick={() => handleAction('confirmed')}
              className={`btn btn-sm ${currentStatus === 'confirmed' ? 'btn-success' : 'btn-secondary'}`}
              style={{ justifyContent: 'center' }}
            >
              <Check size={13} />
              <span>Confirm</span>
            </button>
            <button
              id="review-action-reject"
              data-testid="review-action-reject"
              onClick={() => handleAction('rejected')}
              className={`btn btn-sm ${currentStatus === 'rejected' ? 'btn-danger' : 'btn-secondary'}`}
              style={{ justifyContent: 'center' }}
            >
              <X size={13} />
              <span>Reject</span>
            </button>
            <button
              id="review-action-review"
              data-testid="review-action-review"
              onClick={() => handleAction('review_required')}
              className={`btn btn-sm ${currentStatus === 'review_required' ? 'btn-warning' : 'btn-secondary'}`}
              style={{ justifyContent: 'center' }}
            >
              <Clock size={13} />
              <span>Review</span>
            </button>
          </div>

          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
            Operator review status is tracked locally and synchronized across the platform.
          </div>
        </div>

        {/* Specialist Model Info */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Inference Model
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600 }}>{detection.model} (YOLOv8n)</div>
          </div>
          <span className="badge badge-emerald">Verified</span>
        </div>
      </div>

      {/* Confirmation Popup Modal (Section 15, 16) */}
      <ReviewConfirmationModal
        isOpen={modalState.isOpen}
        status={modalState.status}
        targetClass={detection.class_name}
        anomalyId={detection.id}
        onConfirmOk={handleModalOk}
      />
    </>
  );
};
