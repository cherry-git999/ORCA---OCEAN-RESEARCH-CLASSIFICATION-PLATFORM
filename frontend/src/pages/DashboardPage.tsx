import React from 'react';
import { useSonar } from '../context/SonarContext';
import { DEMO_MODELS, DEMO_MISSION_STATS } from '../data/demoData';
import { KpiCard } from '../components/dashboard/KpiCard';
import { CurrentMissionCard } from '../components/dashboard/CurrentMissionCard';
import { ModelStatusCard } from '../components/dashboard/ModelStatusCard';
import { ConfidenceChart } from '../components/dashboard/ConfidenceChart';
import { ScanHistoryTable } from '../components/history/ScanHistoryTable';
import {
  FileSearch,
  Crosshair,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Target,
  Sliders,
  MapPin,
  Layout,
  ArrowRight,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (route: 'analyze' | 'detections' | 'geospatial' | 'reports' | 'history') => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { scans, activeScan, setActiveScanId, isLiveAnalysis, lastBackendResponse } = useSonar();

  // Dynamic metrics derived strictly from live session and active scan state
  const sessionLiveScans = scans.filter((s) => s.id.startsWith('SCAN_'));
  const sessionLiveCount = sessionLiveScans.length;

  const currentDetections = activeScan ? activeScan.detections : [];
  const totalAnomalies = currentDetections.length;
  const highConfCount = currentDetections.filter((d) => d.confidence >= 0.8).length;
  const reviewCount = currentDetections.filter((d) => d.review_status === 'review_required').length;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Latest Real Analysis Telemetry Banner (Section 21) */}
      <div className="glass-panel-elevated" style={{
        padding: '16px 20px',
        border: `1px solid ${isLiveAnalysis ? 'var(--border-active)' : 'var(--border-subtle)'}`,
        background: isLiveAnalysis ? 'rgba(0, 242, 254, 0.06)' : 'var(--bg-surface)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={`badge ${isLiveAnalysis ? 'badge-emerald' : 'badge-amber'}`}>
              {isLiveAnalysis ? 'LIVE BACKEND ACTIVE' : 'NO LIVE ANALYSIS YET'}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {isLiveAnalysis ? 'Latest Real Sonar Inference Telemetry' : 'Operating in preview mode. Upload a sonar image to execute live inference.'}
            </span>
          </div>

          {isLiveAnalysis && lastBackendResponse ? (
            <div style={{ marginTop: '6px', display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Scan: </span>
                <strong className="mono" style={{ color: 'var(--text-primary)' }}>{lastBackendResponse.image.filename}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Target: </span>
                <span className="badge badge-cyan">{lastBackendResponse.target.toUpperCase()}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Model: </span>
                <span style={{ color: 'var(--sonar-teal)' }}>{lastBackendResponse.model.name}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Detections: </span>
                <strong className="mono" style={{ color: '#34d399' }}>{lastBackendResponse.analysis.detection_count}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Max Conf: </span>
                <strong className="mono" style={{ color: 'var(--sonar-cyan)' }}>
                  {lastBackendResponse.analysis.highest_confidence != null ? `${(lastBackendResponse.analysis.highest_confidence * 100).toFixed(2)}%` : 'N/A'}
                </strong>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              No live analysis yet — Ready to accept side-scan sonar imagery (.pbm, .bpm, .png, .jpg).
            </div>
          )}
        </div>

        <button
          onClick={() => onNavigate('analyze')}
          className="btn btn-primary btn-sm"
        >
          <span>Run Live Analysis</span>
          <ArrowRight size={14} />
        </button>
      </div>
      {/* 4 PS Core Pillars Showcase Banner */}
      <div className="glass-panel" style={{
        padding: '16px 20px',
        background: 'linear-gradient(135deg, rgba(7, 14, 28, 0.95) 0%, rgba(16, 31, 56, 0.8) 100%)',
        border: '1px solid var(--border-medium)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-cyan">PROBLEM STATEMENT SIH26057</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              AI-Powered Underwater Debris & Anomaly Detection
            </span>
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            FOUR CORE CAPABILITY DELIVERABLES
          </h2>
        </div>

        {/* 4 Capabilities Grid */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-xs)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <Target size={15} color="var(--sonar-cyan)" />
            <div style={{ fontSize: '11px', fontWeight: 600 }}>1. Detection & Segmentation</div>
          </div>

          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-xs)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <Sliders size={15} color="var(--sonar-teal)" />
            <div style={{ fontSize: '11px', fontWeight: 600 }}>2. Confidence & Filtering</div>
          </div>

          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-xs)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <MapPin size={15} color="var(--status-amber)" />
            <div style={{ fontSize: '11px', fontWeight: 600 }}>3. Reporting & Geotagging</div>
          </div>

          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-xs)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <Layout size={15} color="var(--status-emerald)" />
            <div style={{ fontSize: '11px', fontWeight: 600 }}>4. UI Dashboard</div>
          </div>
        </div>
      </div>

      {/* 4 KPI Cards (Derived dynamically in live mode; labeled demo in preview) */}
      <div className="grid-4">
        <KpiCard
          title={isLiveAnalysis ? "Session Live Scans" : "Scans Analyzed"}
          value={isLiveAnalysis ? sessionLiveCount : DEMO_MISSION_STATS.scansAnalyzed}
          subtitle={isLiveAnalysis ? "Live analyzed surveys this session" : "Historical mission benchmark (Demo)"}
          icon={FileSearch}
          color="cyan"
          trend={isLiveAnalysis ? `Target: ${activeScan?.target.toUpperCase() || 'LIVE'}` : "Preview dataset"}
        />
        <KpiCard
          title={isLiveAnalysis ? "Current Scan Anomalies" : "Anomalies Detected"}
          value={isLiveAnalysis ? totalAnomalies : DEMO_MISSION_STATS.anomaliesDetected}
          subtitle={isLiveAnalysis ? `Swath: ${activeScan?.image.filename || 'Active'}` : "Candidate acoustic features"}
          icon={Crosshair}
          color="cyan"
          trend={isLiveAnalysis ? (totalAnomalies === 1 ? "1 detection" : `${totalAnomalies} detections`) : "Demo baseline"}
        />
        <KpiCard
          title="High Confidence"
          value={isLiveAnalysis ? highConfCount : DEMO_MISSION_STATS.highConfidence}
          subtitle={isLiveAnalysis ? "Confidence ≥ 80% (Current Scan)" : "Confidence ≥ 80%"}
          icon={CheckCircle2}
          color="emerald"
          trend={isLiveAnalysis && totalAnomalies > 0 ? `${Math.round((highConfCount / totalAnomalies) * 100)}% ratio` : "YOLOv8 Score"}
        />
        <KpiCard
          title="Requires Review"
          value={isLiveAnalysis ? reviewCount : DEMO_MISSION_STATS.requiresReview}
          subtitle={isLiveAnalysis ? "Human triage (Current Scan)" : "Human specialist check"}
          icon={AlertCircle}
          color="amber"
          trend={isLiveAnalysis ? (reviewCount > 0 ? "Operator review" : "Validated") : "Manual triage"}
        />
      </div>

      {/* Main Section 1: Current Mission & Confidence Distribution */}
      <div className="grid-2">
        {activeScan && (
          <CurrentMissionCard
            scan={activeScan}
            onOpenWorkspace={() => onNavigate('detections')}
          />
        )}
        <ConfidenceChart
          detections={activeScan ? activeScan.detections : []}
        />
      </div>

      {/* Main Section 2: Model Status Card */}
      <ModelStatusCard
        models={DEMO_MODELS}
        activeModelName={activeScan?.model_name}
      />

      {/* Main Section 3: Recent Scans Table */}
      <ScanHistoryTable
        scans={scans}
        activeScanId={activeScan ? activeScan.id : ''}
        onSelectScan={(id) => setActiveScanId(id)}
        onOpenWorkspace={() => onNavigate('detections')}
      />
    </div>
  );
};
