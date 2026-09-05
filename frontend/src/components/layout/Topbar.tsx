import React from 'react';
import { NavRoute } from './Sidebar';
import { useSonar } from '../../context/SonarContext';
import { Cpu, ShieldAlert, Sparkles, SlidersHorizontal, Eye } from 'lucide-react';

interface TopbarProps {
  currentRoute: NavRoute;
  onOpenStatusModal: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ currentRoute, onOpenStatusModal }) => {
  const { scans, activeScanId, setActiveScanId, backendStatus, isLiveAnalysis, lastBackendResponse } = useSonar();

  const inferenceDevice = lastBackendResponse?.inference?.device?.toUpperCase() 
    ? `${lastBackendResponse.inference.device.toUpperCase()}`
    : (backendStatus === 'online' ? 'CUDA (GPU)' : 'LOCAL ENGINE');

  const getRouteDetails = () => {
    switch (currentRoute) {
      case 'dashboard':
        return {
          title: 'MARINE SONAR INTELLIGENCE',
          subtitle: 'AI-assisted underwater anomaly detection and survey analysis.',
        };
      case 'analyze':
        return {
          title: 'SONAR SCAN ANALYSIS & UPLOAD',
          subtitle: 'Dropzone ingestion, image validation, and simulated specialist model routing.',
        };
      case 'detections':
        return {
          title: 'DETECTION WORKSPACE',
          subtitle: 'Acoustic side-scan viewer, candidate bounding boxes, and manual review.',
        };
      case 'geospatial':
        return {
          title: 'GEOSPATIAL ANOMALY MAPPING',
          subtitle: 'Synchronized survey transects and acoustic anomaly coordinates.',
        };
      case 'reports':
        return {
          title: 'ANOMALY REPORTING & EXPORT',
          subtitle: 'Survey mission telemetry, detection payloads, and verifiable report generation.',
        };
      case 'history':
        return {
          title: 'SCAN INVENTORY & MISSION HISTORY',
          subtitle: 'Archived acoustic scans, specialist model inferences, and detection logs.',
        };
    }
  };

  const { title, subtitle } = getRouteDetails();

  return (
    <header className="app-topbar">
      {/* Title & Subtitle */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 700, letterSpacing: '-0.01em' }}>
            {title}
          </h2>
          <span className="badge badge-cyan" style={{ fontSize: '10px' }}>
            Phase 8.2
          </span>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          {subtitle}
        </p>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Active Scan Quick Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Active Scan:
          </span>
          <select
            className="form-select mono"
            value={activeScanId}
            onChange={(e) => setActiveScanId(e.target.value)}
            style={{ padding: '4px 8px', fontSize: '12px', width: 'auto', background: 'var(--bg-surface-elevated)' }}
          >
            {scans.map((scan) => (
              <option key={scan.id} value={scan.id}>
                {scan.id} ({scan.target.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        {/* Backend Online / Offline Health Badge */}
        <div className="glass-panel" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          borderRadius: 'var(--radius-sm)',
          border: `1px solid ${backendStatus === 'online' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`,
        }}>
          <span className={`status-dot ${backendStatus === 'online' ? 'online' : 'danger'}`} />
          <div style={{ fontSize: '11px', lineHeight: '1.2' }}>
            <span style={{ color: 'var(--text-secondary)' }}>API: </span>
            <span className="mono" style={{
              color: backendStatus === 'online' ? '#34d399' : '#fb7185',
              fontWeight: 700,
            }}>
              {backendStatus === 'online' ? 'BACKEND ONLINE' : 'BACKEND OFFLINE'}
            </span>
          </div>
        </div>

        {/* GPU / AI Engine Indicator */}
        <div className="glass-panel" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          borderRadius: 'var(--radius-sm)',
        }}>
          <Cpu size={15} color="var(--sonar-cyan)" />
          <div style={{ fontSize: '11px', lineHeight: '1.2' }}>
            <span style={{ color: 'var(--text-secondary)' }}>ENGINE: </span>
            <span className="mono" style={{ color: 'var(--sonar-cyan)', fontWeight: 600 }}>{inferenceDevice}</span>
          </div>
        </div>

        {/* Live Inference vs Preview Mode Indicator */}
        {isLiveAnalysis ? (
          <div style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: 'var(--radius-sm)',
            padding: '5px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            boxShadow: 'var(--status-emerald-glow)',
          }}>
            <span className="status-dot online" />
            <span className="mono" style={{ fontSize: '11px', fontWeight: 700, color: '#34d399', letterSpacing: '0.05em' }}>
              LIVE INFERENCE
            </span>
          </div>
        ) : (
          <div style={{
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: 'var(--radius-sm)',
            padding: '5px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            boxShadow: 'var(--status-amber-glow)',
          }}>
            <ShieldAlert size={14} color="var(--status-amber)" />
            <span className="mono" style={{ fontSize: '11px', fontWeight: 700, color: '#fbbf24', letterSpacing: '0.05em' }}>
              UI PREVIEW MODE
            </span>
          </div>
        )}

        {/* Quick System Telemetry Button */}
        <button
          onClick={onOpenStatusModal}
          className="btn btn-secondary btn-icon"
          title="System Architecture Telemetry"
        >
          <SlidersHorizontal size={15} />
        </button>
      </div>
    </header>
  );
};
