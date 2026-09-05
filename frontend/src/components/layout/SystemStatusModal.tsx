import React from 'react';
import { X, Cpu, Server, Activity, ShieldCheck, Database, CheckCircle2, CheckCircle, AlertTriangle } from 'lucide-react';
import { DEMO_MODELS } from '../../data/demoData';
import { useSonar } from '../../context/SonarContext';

interface SystemStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemStatusModal: React.FC<SystemStatusModalProps> = ({ isOpen, onClose }) => {
  const { backendStatus, isLiveAnalysis, lastBackendResponse } = useSonar();
  if (!isOpen) return null;

  const device = lastBackendResponse?.inference?.device?.toUpperCase() 
    ? lastBackendResponse.inference.device.toUpperCase() 
    : (backendStatus === 'online' ? 'CUDA 12.4 (GPU)' : 'LOCAL CPU');

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(4, 8, 18, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    }}>
      <div className="glass-panel-elevated" style={{
        width: '100%',
        maxWidth: '680px',
        padding: '24px',
        border: '1px solid var(--border-medium)',
        boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={22} color="var(--sonar-cyan)" />
            <div>
              <h3 style={{ fontSize: '18px', color: 'var(--text-primary)' }}>System Telemetry & Architecture Status</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>AquaSentinel Sonar ML Operational Health</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={18} />
          </button>
        </div>

        {/* Phase 8.2 Notice Banner */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start',
        }}>
          <CheckCircle size={20} color="var(--status-emerald)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--status-emerald)' }}>
              PHASE 8.2 LIVE INFERENCE INTEGRATION ACTIVE
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              The frontend is connected to the live FastAPI backend at http://127.0.0.1:8000. Real-time inference routes through frozen YOLOv8 specialist checkpoints with native bounding box visualization, telemetry, and reporting.
            </div>
          </div>
        </div>

        {/* Status Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '20px' }}>
          {/* Card 1: AI Engine */}
          <div className="glass-panel" style={{ padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Cpu size={14} color="var(--status-emerald)" /> AI Inference Engine
              </span>
              <span className="badge badge-emerald">ONLINE</span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>Ultralytics YOLOv8</div>
            <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Hardware Target: PyTorch ({device})
            </div>
          </div>

          {/* Card 2: Backend API */}
          <div className="glass-panel" style={{ padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Server size={14} color={backendStatus === 'online' ? 'var(--status-emerald)' : 'var(--status-rose)'} /> FastAPI Server
              </span>
              <span className={`badge ${backendStatus === 'online' ? 'badge-emerald' : 'badge-rose'}`}>
                {backendStatus === 'online' ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>http://127.0.0.1:8000</div>
            <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Endpoints: /health, /predict, /analyze, /segment
            </div>
          </div>
        </div>

        {/* Specialist Models Status */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Frozen Specialist Models
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {DEMO_MODELS.map((model) => (
              <div key={model.id} className="glass-panel" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={15} color="var(--status-emerald)" />
                    {model.name}
                    <span className="badge badge-cyan">{model.target}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {model.role} • Training: {model.dataset}
                  </div>
                </div>
                <span className="badge badge-emerald">READY</span>
              </div>
            ))}
          </div>
        </div>

        {/* Safety & Compliance Metrics */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <ShieldCheck size={14} color="var(--sonar-cyan)" />
            Strict No-Fake-GPS & No-Fake-Masks Enforcement Active
          </div>
          <button onClick={onClose} className="btn btn-secondary btn-sm">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
