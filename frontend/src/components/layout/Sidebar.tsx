import React from 'react';
import { useSonar } from '../../context/SonarContext';
import {
  LayoutDashboard,
  UploadCloud,
  Crosshair,
  Map,
  FileText,
  History,
  Radio,
  Sliders,
  ChevronRight,
  ShieldAlert,
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
  const { backendStatus, isLiveAnalysis } = useSonar();
  const navItems = [
    {
      id: 'dashboard' as NavRoute,
      label: 'Mission Overview',
      icon: LayoutDashboard,
      badge: 'PS 57',
    },
    {
      id: 'analyze' as NavRoute,
      label: 'Analyze Scan',
      icon: UploadCloud,
      badge: 'Dropzone',
    },
    {
      id: 'detections' as NavRoute,
      label: 'Detection Workspace',
      icon: Crosshair,
      badge: 'AI Core',
    },
    {
      id: 'geospatial' as NavRoute,
      label: 'Geospatial View',
      icon: Map,
      badge: 'Map',
    },
    {
      id: 'reports' as NavRoute,
      label: 'Reports',
      icon: FileText,
      badge: 'Export',
    },
    {
      id: 'history' as NavRoute,
      label: 'Scan History',
      icon: History,
      badge: 'Logs',
    },
  ];

  return (
    <aside className="app-sidebar">
      {/* Brand Header */}
      <div style={{
        padding: '20px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: 'var(--radius-sm)',
          background: 'linear-gradient(135deg, var(--sonar-cyan) 0%, var(--sonar-blue) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--sonar-cyan-glow)',
          flexShrink: 0,
        }}>
          <Radio size={22} color="#040812" className="sonar-ping" />
        </div>
        <div className="sidebar-text" style={{ overflow: 'hidden' }}>
          <h1 style={{
            fontSize: '16px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
          }}>
            AquaSentinel <span style={{ color: 'var(--sonar-cyan)', fontWeight: 800 }}>AI</span>
          </h1>
          <div style={{
            fontSize: '10px',
            color: 'var(--text-secondary)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            marginTop: '1px',
          }}>
            Marine Sonar Intelligence
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{
          padding: '0 8px 8px 8px',
          fontSize: '10px',
          fontWeight: 600,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>
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
              <ChevronRight
                size={14}
                style={{
                  opacity: isActive ? 1 : 0,
                  transform: isActive ? 'translateX(0)' : 'translateX(-4px)',
                  transition: 'all 0.2s ease',
                }}
              />
            </button>
          );
        })}
      </nav>

      {/* Bottom Status Card */}
      <div style={{
        padding: '14px',
        borderTop: '1px solid var(--border-subtle)',
        background: 'rgba(7, 14, 28, 0.6)',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '10px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className={`status-dot ${backendStatus === 'online' ? 'online' : 'danger'}`}></span>
              FastAPI Backend
            </span>
            <span className={`badge ${backendStatus === 'online' ? 'badge-emerald' : 'badge-rose'}`} style={{ fontSize: '9px', padding: '1px 5px' }}>
              {backendStatus === 'online' ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className={`status-dot ${isLiveAnalysis ? 'online' : 'warning'}`}></span>
              {isLiveAnalysis ? 'Live Pipeline' : 'Preview Mode'}
            </span>
            <span className={`badge ${isLiveAnalysis ? 'badge-cyan' : 'badge-amber'}`} style={{ fontSize: '9px', padding: '1px 5px' }}>
              {isLiveAnalysis ? 'ACTIVE' : 'DEMO'}
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
