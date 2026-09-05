import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'purple';
  trend?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'cyan',
  trend,
}) => {
  const getColorValues = () => {
    switch (color) {
      case 'emerald':
        return {
          accent: 'var(--status-emerald)',
          bg: 'rgba(16, 185, 129, 0.12)',
          border: 'rgba(16, 185, 129, 0.3)',
          badgeClass: 'badge-emerald',
        };
      case 'amber':
        return {
          accent: 'var(--status-amber)',
          bg: 'rgba(245, 158, 11, 0.12)',
          border: 'rgba(245, 158, 11, 0.3)',
          badgeClass: 'badge-amber',
        };
      case 'rose':
        return {
          accent: 'var(--status-rose)',
          bg: 'rgba(244, 63, 94, 0.12)',
          border: 'rgba(244, 63, 94, 0.3)',
          badgeClass: 'badge-rose',
        };
      case 'purple':
        return {
          accent: 'var(--status-purple)',
          bg: 'rgba(168, 85, 247, 0.12)',
          border: 'rgba(168, 85, 247, 0.3)',
          badgeClass: 'badge-purple',
        };
      default:
        return {
          accent: 'var(--sonar-cyan)',
          bg: 'rgba(0, 242, 254, 0.12)',
          border: 'rgba(0, 242, 254, 0.3)',
          badgeClass: 'badge-cyan',
        };
    }
  };

  const { accent, bg, border, badgeClass } = getColorValues();

  return (
    <div className="glass-panel" style={{
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Top accent line */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '2px',
        background: `linear-gradient(90deg, ${accent} 0%, transparent 100%)`,
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-secondary)',
          }}>
            {title}
          </span>
          <div className="mono" style={{
            fontSize: '28px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginTop: '4px',
            letterSpacing: '-0.02em',
          }}>
            {value}
          </div>
        </div>

        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: 'var(--radius-sm)',
          background: bg,
          border: `1px solid ${border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accent,
          flexShrink: 0,
        }}>
          <Icon size={20} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
        <span style={{ color: 'var(--text-muted)' }}>{subtitle || 'Operational Telemetry'}</span>
        {trend && (
          <span className={`badge ${badgeClass}`} style={{ fontSize: '10px' }}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
};
