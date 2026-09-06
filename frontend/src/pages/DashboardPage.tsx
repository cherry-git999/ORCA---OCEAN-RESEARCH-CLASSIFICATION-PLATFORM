import React from 'react';
import { useSonar } from '../context/SonarContext';
import { KpiCard } from '../components/dashboard/KpiCard';
import { CurrentMissionCard } from '../components/dashboard/CurrentMissionCard';
import { ModelStatusCard, OPERATIONAL_MODELS } from '../components/dashboard/ModelStatusCard';
import { ConfidenceChart } from '../components/dashboard/ConfidenceChart';
import { ScanHistoryTable } from '../components/history/ScanHistoryTable';
import {
  FileSearch,
  Crosshair,
  CheckCircle2,
  Cpu,
  Target,
  Sliders,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (route: 'analyze' | 'detections' | 'geospatial' | 'reports' | 'history') => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { scans, activeScan, setActiveScanId, backendStatus } = useSonar();

  // Metrics derived strictly from real browser-stored scans
  const totalScans = scans.length;
  const currentDetections = activeScan ? activeScan.detections : [];
  const totalAnomalies = scans.reduce((acc, s) => acc + s.detections.length, 0);
  const highConfCount = scans.reduce(
    (acc, s) => acc + s.detections.filter((d) => d.confidence >= 0.8).length,
    0
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Platform Status Banner */}
      <div
        className="glass-panel-elevated"
        style={{
          padding: '18px 22px',
          border: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={`badge ${backendStatus === 'online' ? 'badge-emerald' : 'badge-rose'}`}>
              {backendStatus === 'online' ? 'SYSTEM OPERATIONAL' : 'BACKEND OFFLINE'}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              ORCA Multimodal Underwater Intelligence
            </span>
          </div>

          {activeScan ? (
            <div style={{ marginTop: '8px', display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Active Scan: </span>
                <strong className="mono" style={{ color: 'var(--text-primary)' }}>
                  {activeScan.image.filename}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Target: </span>
                <span className="badge badge-cyan">{activeScan.target.toUpperCase()}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Model: </span>
                <span style={{ color: 'var(--sonar-teal)' }}>{activeScan.model_name}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Detections: </span>
                <strong className="mono" style={{ color: '#34d399' }}>
                  {activeScan.detections.length}
                </strong>
              </div>
              {activeScan.routingConfidence != null && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Routing Conf: </span>
                  <strong className="mono" style={{ color: 'var(--sonar-cyan)' }}>
                    {(activeScan.routingConfidence * 100).toFixed(1)}%
                  </strong>
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              System ready. Ingest a sensor scan image (.pbm, .bpm, .png, .jpg) to execute automated specialist inference.
            </div>
          )}
        </div>

        <button
          id="dashboard-run-analysis-btn"
          data-testid="dashboard-run-analysis-btn"
          onClick={() => onNavigate('analyze')}
          className="btn btn-primary"
          style={{ padding: '10px 18px' }}
        >
          <Sparkles size={15} />
          <span>Analyze Scan</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* 4 Real KPI Cards */}
      <div className="grid-4">
        <KpiCard
          title="Scans Analyzed"
          value={totalScans}
          subtitle="Persistent browser inventory"
          icon={FileSearch}
          color="cyan"
          trend={totalScans > 0 ? `${totalScans} recorded` : 'Ready'}
        />
        <KpiCard
          title="Total Detections"
          value={totalAnomalies}
          subtitle="Identified objects across scans"
          icon={Crosshair}
          color="cyan"
          trend={activeScan ? `Current scan: ${currentDetections.length}` : 'Operational'}
        />
        <KpiCard
          title="High Confidence"
          value={highConfCount}
          subtitle="Detections with score ≥ 80%"
          icon={CheckCircle2}
          color="emerald"
          trend={totalAnomalies > 0 ? `${Math.round((highConfCount / totalAnomalies) * 100)}% ratio` : 'YOLOv8'}
        />
        <KpiCard
          title="Specialist Models"
          value="3"
          subtitle="Pipeline, Human, Hardware"
          icon={Cpu}
          color="emerald"
          trend="3/3 Ready"
        />
      </div>

      {/* Main Section 1: Active Scan & Confidence Distribution (if scans exist) */}
      {activeScan && (
        <div className="grid-2">
          <CurrentMissionCard
            scan={activeScan}
            onOpenWorkspace={() => onNavigate('detections')}
          />
          <ConfidenceChart
            detections={activeScan.detections}
          />
        </div>
      )}

      {/* Main Section 2: Model Status Card (Displays all 3 real models) */}
      <ModelStatusCard
        models={OPERATIONAL_MODELS}
        activeModelName={activeScan?.model_name}
      />

      {/* Main Section 3: Recent Scans Table */}
      <ScanHistoryTable
        scans={scans}
        activeScanId={activeScan ? activeScan.id : ''}
        onSelectScan={(id) => setActiveScanId(id)}
        onOpenWorkspace={() => onNavigate('detections')}
        onNavigateToAnalyze={() => onNavigate('analyze')}
      />
    </div>
  );
};
