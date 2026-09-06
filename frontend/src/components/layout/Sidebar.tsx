import React from 'react';
import { useSonar } from '../../context/SonarContext';
import {
  LayoutDashboard,
  UploadCloud,
  Crosshair,
  Map,
  FileText,
  History,
  Sliders,
  ChevronRight,
  Compass,
} from 'lucide-react';

export type NavRoute = 'dashboard' | 'analyze' | 'detections' | 'geospatial' | 'reports' | 'history';

interface SidebarProps {
  currentRoute: NavRoute;
  onNavigate: (route: NavRoute) => void;
  onOpenStatusModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onNavigate,
  onOpenStatusModal,
}) => {
  const { backendStatus, scans } = useSonar();

  const navItems = [
    {
      id: 'dashboard' as NavRoute,
      label: 'Mission Overview',
      icon: LayoutDashboard,
    },
    {
      id: 'analyze' as NavRoute,
      label: 'Analyze Scan',
      icon: UploadCloud,
    },
    {
      id: 'detections' as NavRoute,
      label: 'Detection Workspace',
      icon: Crosshair,
    },
    {
      id: 'geospatial' as NavRoute,
      label: 'Geospatial View',
      icon: Map,
    },
    {
      id: 'reports' as NavRoute,
      label: 'Reports',
      icon: FileText,
    },
    {
      id: 'history' as NavRoute,
      label: 'Scan History',
      icon: History,
      badge: scans.length > 0 ? `${scans.length}` : undefined,
    },
  ];

  return (
    <aside className="app-sidebar">
      {/* Brand Header */}
      <div
        style={{
          padding: '20px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(135deg, var(--sonar-cyan) 0%, var(--sonar-blue) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--sonar-cyan-glow)',
            flexShrink: 0,
          }}
        >
          <Compass size={24} color="#040812" />
        </div>
        <div className="sidebar-text" style={{ overflow: 'hidden' }}>
          <h1
            style={{
              fontSize: '18px',
              fontWeight: 800,
              letterSpacing: '0.04em',
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              margin: 0,
            }}
          >
            ORCA
          </h1>
          <div
            style={{
              fontSize: '9.5px',
              color: 'var(--text-secondary)',
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              marginTop: '2px',
              fontWeight: 600,
            }}
          >
            Multimodal Underwater Intelligence Platform
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div
          style={{
            padding: '0 8px 8px 8px',
            fontSize: '10px',
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Operations & Intelligence
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              data-testid={`nav-${item.id}`}
              onClick={() => onNavigate(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: isActive ? 'var(--border-active)' : 'transparent',
                background: isActive ? 'rgba(0, 242, 254, 0.08)' : 'transparent',
                color: isActive ? 'var(--sonar-cyan)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                textAlign: 'left',
                width: '100%',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon size={18} color={isActive ? 'var(--sonar-cyan)' : 'currentColor'} />
                <span className="sidebar-text" style={{ fontSize: '13px', fontWeight: isActive ? 600 : 500 }}>
                  {item.label}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {item.badge && (
                  <span className="badge badge-muted mono" style={{ fontSize: '9px', padding: '1px 5px' }}>
                    {item.badge}
                  </span>
                )}
                <ChevronRight
                  size={14}
                  style={{
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? 'translateX(0)' : 'translateX(-4px)',
                    transition: 'all 0.2s ease',
                  }}
                />
              </div>
            </button>
          );
        })}
      </nav>

      {/* Bottom Operational Status Card */}
      <div
        style={{
          padding: '14px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'rgba(7, 14, 28, 0.6)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '10px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className={`status-dot ${backendStatus === 'online' ? 'online' : 'danger'}`}></span>
              FastAPI Engine
            </span>
            <span
              className={`badge ${backendStatus === 'online' ? 'badge-emerald' : 'badge-rose'}`}
              style={{ fontSize: '9px', padding: '1px 5px' }}
            >
              {backendStatus === 'online' ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          <button
            onClick={onOpenStatusModal}
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', marginTop: '4px', fontSize: '11px', padding: '5px' }}
          >
            <Sliders size={12} />
            System Telemetry
          </button>
        </div>
      </div>
    </aside>
  );
};
