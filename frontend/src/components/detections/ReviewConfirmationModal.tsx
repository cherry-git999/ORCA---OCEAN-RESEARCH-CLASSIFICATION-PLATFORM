import React from 'react';
import { CheckCircle2, XCircle, Clock, ArrowRight } from 'lucide-react';
import { ReviewStatus } from '../../types/detection';

interface ReviewConfirmationModalProps {
  isOpen: boolean;
  status: ReviewStatus | null;
  targetClass: string;
  anomalyId: string;
  onConfirmOk: () => void;
}

export const ReviewConfirmationModal: React.FC<ReviewConfirmationModalProps> = ({
  isOpen,
  status,
  targetClass,
  anomalyId,
  onConfirmOk,
}) => {
  if (!isOpen || !status) return null;

  let title = 'DETECTION CONFIRMED';
  let message = `${targetClass.toUpperCase()} detection (${anomalyId}) has been confirmed.`;
  let icon = <CheckCircle2 size={32} color="var(--status-emerald, #10b981)" />;
  let badgeClass = 'badge-emerald';
  let badgeText = 'CONFIRMED';

  if (status === 'rejected') {
    title = 'DETECTION REJECTED';
    message = `${targetClass.toUpperCase()} detection (${anomalyId}) has been marked as rejected.`;
    icon = <XCircle size={32} color="var(--status-rose, #f43f5e)" />;
    badgeClass = 'badge-rose';
    badgeText = 'REJECTED';
  } else if (status === 'review_required') {
    title = 'SENT FOR EXPERT REVIEW';
    message = `${targetClass.toUpperCase()} detection (${anomalyId}) has been added to manual review.`;
    icon = <Clock size={32} color="var(--status-amber, #f59e0b)" />;
    badgeClass = 'badge-amber';
    badgeText = 'UNDER REVIEW';
  }

  return (
    <div
      id="review-confirmation-modal-backdrop"
      data-testid="review-confirmation-modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(3, 7, 18, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
        padding: '20px',
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      <div
        id="review-confirmation-modal-card"
        data-testid="review-confirmation-modal-card"
        className="glass-panel-elevated"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '26px',
          borderRadius: 'var(--radius-md, 12px)',
          background: 'linear-gradient(180deg, rgba(13, 24, 44, 0.98) 0%, rgba(6, 12, 24, 0.99) 100%)',
          border: '1px solid var(--border-medium, rgba(56, 189, 248, 0.3))',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.75)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            margin: '0 auto 16px auto',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>

        <span className={`badge ${badgeClass}`} style={{ fontSize: '11.5px', marginBottom: '10px' }}>
          {badgeText}
        </span>

        <h3
          id="review-modal-title"
          data-testid="review-modal-title"
          style={{
            fontSize: '19px',
            fontWeight: 800,
            color: 'var(--text-primary, #ffffff)',
            letterSpacing: '0.04em',
            margin: '8px 0 6px 0',
          }}
        >
          {title}
        </h3>

        <p
          id="review-modal-message"
          data-testid="review-modal-message"
          style={{
            fontSize: '14.5px',
            color: 'var(--text-secondary, #94a3b8)',
            lineHeight: '1.5',
            margin: '0 0 22px 0',
          }}
        >
          {message}
        </p>

        <button
          id="review-confirmation-ok-btn"
          data-testid="review-confirmation-ok-btn"
          onClick={onConfirmOk}
          className="btn btn-primary"
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '14.5px',
            fontWeight: 700,
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <span>OK</span>
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
};
