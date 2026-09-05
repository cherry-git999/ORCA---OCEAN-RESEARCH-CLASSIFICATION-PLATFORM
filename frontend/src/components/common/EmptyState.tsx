import React from 'react';
import { LucideIcon, ImageOff, SearchX, MapPinOff, Layers } from 'lucide-react';

interface EmptyStateProps {
  type?: 'no_scan' | 'no_detections' | 'location_unavailable' | 'segmentation_unavailable' | 'custom';
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  icon?: LucideIcon;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'no_detections',
  title,
  description,
  actionText,
  onAction,
  icon: CustomIcon,
}) => {
  const getDefaultContent = () => {
    switch (type) {
      case 'no_scan':
        return {
          icon: ImageOff,
          title: 'NO SONAR SCAN SELECTED',
          description: 'Upload a side-scan sonar image to begin automated acoustic anomaly analysis.',
          color: 'var(--sonar-cyan)',
        };
      case 'location_unavailable':
        return {
          icon: MapPinOff,
          title: 'LOCATION DATA UNAVAILABLE',
          description: 'Verified sonar navigation metadata (NMEA / USBL) has not been embedded in this acoustic file.',
          color: 'var(--status-amber)',
        };
      case 'segmentation_unavailable':
        return {
          icon: Layers,
          title: 'SEGMENTATION UNAVAILABLE',
          description: 'No verified pixel-level segmentation model is currently available for this specialist target.',
          color: 'var(--status-amber)',
        };
      case 'no_detections':
      default:
        return {
          icon: SearchX,
          title: 'NO CANDIDATE ANOMALIES FOUND',
          description: 'No candidate anomalies were detected in this scan under current confidence and geometric filtering rules.',
          color: 'var(--text-muted)',
        };
    }
  };

  const defaults = getDefaultContent();
  const Icon = CustomIcon || defaults.icon;
  const displayTitle = title || defaults.title;
  const displayDesc = description || defaults.description;

  return (
    <div className="glass-panel" style={{
      padding: '48px 24px',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '14px',
      minHeight: '260px',
    }}>
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: defaults.color,
      }}>
        <Icon size={26} />
      </div>

      <div style={{ maxWidth: '420px' }}>
        <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
          {displayTitle}
        </h4>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          {displayDesc}
        </p>
      </div>

      {actionText && onAction && (
        <button onClick={onAction} className="btn btn-secondary btn-sm" style={{ marginTop: '6px' }}>
          {actionText}
        </button>
      )}
    </div>
  );
};
