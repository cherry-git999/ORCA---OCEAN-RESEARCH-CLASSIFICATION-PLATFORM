import React from 'react';
import { AlertTriangle, XCircle, X } from 'lucide-react';

interface ErrorAlertProps {
  title: string;
  message: string;
  onDismiss?: () => void;
  variant?: 'danger' | 'warning';
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  title,
  message,
  onDismiss,
  variant = 'danger',
}) => {
  const isDanger = variant === 'danger';
  return (
    <div style={{
      background: isDanger ? 'rgba(244, 63, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)',
      border: `1px solid ${isDanger ? 'rgba(244, 63, 94, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
      borderRadius: 'var(--radius-sm)',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: '12px',
    }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        {isDanger ? (
          <XCircle size={18} color="var(--status-rose)" style={{ flexShrink: 0, marginTop: '2px' }} />
        ) : (
          <AlertTriangle size={18} color="var(--status-amber)" style={{ flexShrink: 0, marginTop: '2px' }} />
        )}
        <div>
          <div style={{ fontSize: '14.5px', fontWeight: 600, color: isDanger ? '#fb7185' : '#fbbf24' }}>
            {title}
          </div>
          <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {message}
          </div>
        </div>
      </div>

      {onDismiss && (
        <button onClick={onDismiss} className="btn btn-ghost btn-icon" style={{ padding: '2px' }}>
          <X size={14} />
        </button>
      )}
    </div>
  );
};
