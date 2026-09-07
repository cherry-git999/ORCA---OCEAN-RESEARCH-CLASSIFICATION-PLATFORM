import React from 'react';
import {
  Activity,
  ArrowRight,
  HardDrive,
  FileImage,
  Server,
  Cpu,
  Monitor,
  Cloud,
} from 'lucide-react';
import { useSonar } from '../../context/SonarContext';
import { HardwareConnectionState } from '../../types/hardware';

interface LivePipelineCardProps {
  connectionState?: HardwareConnectionState;
  hasCapture?: boolean;
}

export const LivePipelineCard: React.FC<LivePipelineCardProps> = ({
  connectionState = 'waiting',
  hasCapture = false,
}) => {
  const { backendStatus, activeScan } = useSonar();

  const isHardwareConnected = connectionState === 'online';
  const isApiConnected = backendStatus === 'online';
  const isDataReceived = hasCapture;
  const isAiProcessing = !!activeScan;

  return (
    <div
      id="live-data-pipeline-card"
      data-testid="live-data-pipeline-card"
      className="glass-panel"
      style={{
        padding: '16px 20px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        background: 'linear-gradient(180deg, rgba(0, 242, 254, 0.03) 0%, rgba(7, 14, 28, 0.8) 100%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-xs)',
              background: 'rgba(0, 242, 254, 0.1)',
              border: '1px solid rgba(0, 242, 254, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--sonar-cyan)',
            }}
          >
            <Activity size={15} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.04em', margin: 0, color: 'var(--text-primary)' }}>
                LIVE DATA PIPELINE
              </h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                • Real-Time Hardware Data Flow
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            className="badge mono"
            style={{
              fontSize: '10px',
              background: isHardwareConnected && isApiConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0, 242, 254, 0.1)',
              color: isHardwareConnected && isApiConnected ? 'var(--status-emerald)' : 'var(--sonar-cyan)',
              border: `1px solid ${isHardwareConnected && isApiConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(0, 242, 254, 0.3)'}`,
            }}
          >
            {isHardwareConnected && isApiConnected ? 'CONNECTED' : isApiConnected ? 'API ONLINE' : 'STANDBY'}
          </span>
        </div>
      </div>

      {/* Compact Step Flow: Single-row horizontal pipeline */}
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'space-between',
          gap: '6px',
          padding: '10px 12px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          overflowX: 'auto',
        }}
      >
        {[
          { icon: HardDrive, label: 'SONAR / HARDWARE', sub: 'Camera & Ping Sonar' },
          { icon: FileImage, label: 'IMAGE + SONAR DATA', sub: 'JPG + Distance TXT' },
          { icon: Server, label: 'FASTAPI DATA INGESTION', sub: 'POST /upload & /latest' },
          { icon: Cpu, label: 'ORCA AI ENGINE', sub: 'Specialist YOLO Routing' },
          { icon: Monitor, label: 'SHORE OPERATOR / DASHBOARD', sub: 'Tactical Console' },
        ].map((node, index, arr) => {
          const NodeIcon = node.icon;
          return (
            <React.Fragment key={node.label}>
              <div
                style={{
                  flex: '1 1 0',
                  minWidth: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: '8px 6px',
                  borderRadius: 'var(--radius-xs)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(56, 189, 248, 0.12)',
                  gap: '3px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <NodeIcon size={12} color="var(--sonar-cyan)" style={{ flexShrink: 0 }} />
                  <span className="mono" style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                    {node.label}
                  </span>
                </div>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {node.sub}
                </span>
              </div>
              {index < arr.length - 1 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--sonar-cyan)',
                    opacity: 0.65,
                    flexShrink: 0,
                    padding: '0 2px',
                  }}
                >
                  <ArrowRight size={13} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* 4 Status Indicators */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '8px',
          fontSize: '11px',
        }}
      >
        {/* Indicator 1: Hardware Connected */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isHardwareConnected ? 'var(--status-emerald)' : 'var(--status-amber)',
              boxShadow: isHardwareConnected ? '0 0 8px rgba(16, 185, 129, 0.6)' : 'none',
              flexShrink: 0,
            }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>Hardware Connected:</span>
          <span className="mono" style={{ fontWeight: 600, color: isHardwareConnected ? 'var(--status-emerald)' : 'var(--status-amber)' }}>
            {isHardwareConnected ? 'Connected' : 'Waiting'}
          </span>
        </div>

        {/* Indicator 2: API Connected */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isApiConnected ? 'var(--status-emerald)' : 'var(--status-rose)',
              boxShadow: isApiConnected ? '0 0 8px rgba(16, 185, 129, 0.6)' : 'none',
              flexShrink: 0,
            }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>API Connected:</span>
          <span className="mono" style={{ fontWeight: 600, color: isApiConnected ? 'var(--status-emerald)' : 'var(--status-rose)' }}>
            {isApiConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Indicator 3: Data Received */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isDataReceived ? 'var(--status-emerald)' : 'var(--sonar-cyan)',
              boxShadow: isDataReceived ? '0 0 8px rgba(16, 185, 129, 0.6)' : 'none',
              flexShrink: 0,
            }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>Data Received:</span>
          <span className="mono" style={{ fontWeight: 600, color: isDataReceived ? 'var(--status-emerald)' : 'var(--sonar-cyan)' }}>
            {isDataReceived ? 'Received' : 'Ready'}
          </span>
        </div>

        {/* Indicator 4: AI Processing */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isAiProcessing ? 'var(--status-emerald)' : 'var(--sonar-cyan)',
              boxShadow: isAiProcessing ? '0 0 8px rgba(16, 185, 129, 0.6)' : 'none',
              flexShrink: 0,
            }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>AI Processing:</span>
          <span className="mono" style={{ fontWeight: 600, color: isAiProcessing ? 'var(--status-emerald)' : 'var(--text-primary)' }}>
            {isAiProcessing ? 'Processing' : 'Ready'}
          </span>
        </div>
      </div>

      {/* Architecture Readiness Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          paddingTop: '8px',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '11px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Current:
          </span>
          <span className="mono" style={{ color: 'var(--sonar-cyan)', fontWeight: 600 }}>
            Local Network / FastAPI
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Cloud size={12} color="var(--sonar-blue)" />
          <span style={{ color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Deployment Ready:
          </span>
          <span className="mono" style={{ color: 'var(--text-highlight)', fontWeight: 600 }}>
            Cloud Gateway / Remote Shore Access
          </span>
        </div>
      </div>
    </div>
  );
};
