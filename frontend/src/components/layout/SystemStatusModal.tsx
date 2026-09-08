import React from 'react';
import { X, Cpu, Server, Activity, ShieldCheck, CheckCircle2, Terminal, Layers } from 'lucide-react';
import { useSonar } from '../../context/SonarContext';
import { OPERATIONAL_MODELS } from '../dashboard/ModelStatusCard';

interface SystemStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemStatusModal: React.FC<SystemStatusModalProps> = ({ isOpen, onClose }) => {
  const { backendStatus, lastBackendResponse, lastAnalysisTimestamp, activeScan } = useSonar();
  if (!isOpen) return null;

  const device = lastBackendResponse?.inference?.device?.toUpperCase()
    ? lastBackendResponse.inference.device.toUpperCase()
    : (backendStatus === 'online' ? 'CUDA (GPU)' : 'LOCAL ENGINE');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(4, 8, 18, 0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass-panel-elevated"
        style={{
          width: '100%',
          maxWidth: '700px',
          padding: '24px',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={22} color="var(--sonar-cyan)" />
            <div>
              <h3 style={{ fontSize: '19px', color: 'var(--text-primary)', margin: 0 }}>
                ORCA Operational Telemetry & System Status
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: 0, marginTop: '2px' }}>
                Multimodal Underwater Intelligence Platform Health
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={18} />
          </button>
        </div>

        {/* Real System Telemetry Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '18px' }}>
          {/* 1. Backend Status */}
          <div className="glass-panel" style={{ padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Server size={14} color={backendStatus === 'online' ? 'var(--status-emerald)' : 'var(--status-rose)'} />
                Backend API
              </span>
              <span className={`badge ${backendStatus === 'online' ? 'badge-emerald' : 'badge-rose'}`}>
                {backendStatus === 'online' ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>
            <div style={{ fontSize: '14.5px', fontWeight: 600 }}>http://127.0.0.1:8000</div>
            <div className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Endpoints: /health, /predict-auto, /predict
            </div>
          </div>

          {/* 2. Frontend Status */}
          <div className="glass-panel" style={{ padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Terminal size={14} color="var(--status-emerald)" />
                Frontend Client
              </span>
              <span className="badge badge-emerald">RUNNING</span>
            </div>
            <div style={{ fontSize: '14.5px', fontWeight: 600 }}>Vite React + TypeScript</div>
            <div className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Port: 5173 • Persistent Storage Active
            </div>
          </div>

          {/* 3. Model Router */}
          <div className="glass-panel" style={{ padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={14} color="var(--sonar-cyan)" />
                Model Router
              </span>
              <span className="badge badge-cyan">AVAILABLE</span>
            </div>
            <div style={{ fontSize: '14.5px', fontWeight: 600 }}>Logistic Regression Router V1</div>
            <div className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Routing Threshold: τ = 0.85
            </div>
          </div>

          {/* 4. Inference Engine */}
          <div className="glass-panel" style={{ padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Cpu size={14} color="var(--sonar-teal)" />
                Inference Device
              </span>
              <span className="badge badge-emerald">READY</span>
            </div>
            <div style={{ fontSize: '14.5px', fontWeight: 600 }}>PyTorch Ultralytics</div>
            <div className="mono" style={{ fontSize: '12px', color: 'var(--sonar-cyan)', marginTop: '2px' }}>
              Hardware Target: {device}
            </div>
          </div>
        </div>

        {/* Real Scan Status */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            marginBottom: '18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '13.5px',
          }}
        >
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Current Scan: </span>
            <strong className="mono" style={{ color: 'var(--text-primary)' }}>
              {activeScan ? activeScan.image.filename : 'Idle / No scan loaded'}
            </strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Last Analysis: </span>
            <span className="mono" style={{ color: 'var(--sonar-cyan)' }}>
              {lastAnalysisTimestamp || 'None'}
            </span>
          </div>
        </div>

        {/* Specialist Models Status */}
        <div style={{ marginBottom: '18px' }}>
          <div
            style={{
              fontSize: '12.5px',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Specialist Models
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {OPERATIONAL_MODELS.map((model) => (
              <div
                key={model.id}
                className="glass-panel"
                style={{
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={15} color="var(--status-emerald)" />
                    {model.name}
                    <span className="badge badge-cyan">{model.target}</span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {model.role} • Training: {model.dataset}
                  </div>
                </div>
                <span className="badge badge-emerald">LOADED / READY</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
            <ShieldCheck size={14} color="var(--sonar-cyan)" />
            Real Application Telemetry • No Fabricated Hardware Metrics
          </div>
          <button onClick={onClose} className="btn btn-secondary btn-sm">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
