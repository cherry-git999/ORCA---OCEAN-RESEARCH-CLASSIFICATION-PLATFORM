import React from 'react';
import { NavRoute } from './Sidebar';
import { useSonar } from '../../context/SonarContext';
import { Cpu, SlidersHorizontal } from 'lucide-react';

interface TopbarProps {
  currentRoute: NavRoute;
  onOpenStatusModal: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ currentRoute, onOpenStatusModal }) => {
  const { backendStatus, lastBackendResponse } = useSonar();

  const inferenceDevice = lastBackendResponse?.inference?.device?.toUpperCase()
    ? `${lastBackendResponse.inference.device.toUpperCase()}`
    : (backendStatus === 'online' ? 'CUDA (GPU)' : 'LOCAL ENGINE');

  const getRouteDetails = () => {
    switch (currentRoute) {
      case 'dashboard':
        return {
          title: 'MISSION OVERVIEW',
          subtitle: 'Multimodal underwater intelligence, specialist model inventory, and operational metrics.',
        };
      case 'analyze':
        return {
          title: 'ANALYZE SCAN',
          subtitle: 'Ingest sensor scan image, automated domain identification, and specialist YOLO routing.',
        };
      case 'detections':
        return {
          title: 'DETECTION WORKSPACE',
          subtitle: 'Real uploaded scan viewer, candidate bounding boxes, and object attribution.',
        };
      case 'geospatial':
        return {
          title: 'GEOSPATIAL ANOMALY MAPPING',
          subtitle: 'Calibrated pixel coordinates and sensor navigation alignment.',
        };
      case 'reports':
        return {
          title: 'MISSION REPORTS & EXPORT',
          subtitle: 'PDF, CSV, JSON report synthesis and high-resolution annotated image export.',
        };
      case 'history':
        return {
          title: 'SCAN HISTORY',
          subtitle: 'Persistent browser inventory of completed scans, model selections, and detections.',
        };
    }
  };

  const { title, subtitle } = getRouteDetails();

  return (
    <header className="app-topbar">
      {/* Title & Subtitle */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '0.02em', color: 'var(--text-primary)' }}>
            {title}
          </h2>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          {subtitle}
        </p>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Backend Online / Offline Health Badge */}
        <div
          className="glass-panel"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            border: `1px solid ${backendStatus === 'online' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`,
          }}
        >
          <span className={`status-dot ${backendStatus === 'online' ? 'online' : 'danger'}`} />
          <div style={{ fontSize: '11px', lineHeight: '1.2' }}>
            <span style={{ color: 'var(--text-secondary)' }}>API: </span>
            <span
              className="mono"
              style={{
                color: backendStatus === 'online' ? '#34d399' : '#fb7185',
                fontWeight: 700,
              }}
            >
              {backendStatus === 'online' ? 'BACKEND ONLINE' : 'BACKEND OFFLINE'}
            </span>
          </div>
        </div>

        {/* GPU / AI Engine Indicator */}
        <div
          className="glass-panel"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <Cpu size={15} color="var(--sonar-cyan)" />
          <div style={{ fontSize: '11px', lineHeight: '1.2' }}>
            <span style={{ color: 'var(--text-secondary)' }}>ENGINE: </span>
            <span className="mono" style={{ color: 'var(--sonar-cyan)', fontWeight: 600 }}>
              {inferenceDevice}
            </span>
          </div>
        </div>

        {/* System Telemetry Trigger Button */}
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
