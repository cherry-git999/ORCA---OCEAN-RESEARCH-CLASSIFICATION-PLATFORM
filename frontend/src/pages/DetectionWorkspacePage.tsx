import React, { useState } from 'react';
import { useSonar } from '../context/SonarContext';
import { SonarImageViewer } from '../components/sonar/SonarImageViewer';
import { FilterControlPanel } from '../components/detections/FilterControlPanel';
import { DetectionDetailPanel } from '../components/detections/DetectionDetailPanel';
import { CleanupInspectionOrderCard } from '../components/detections/CleanupInspectionOrderCard';
import { DetectionTable } from '../components/detections/DetectionTable';
import { EmptyState } from '../components/common/EmptyState';
import { downloadAnnotatedImage } from '../utils/annotatedImageExport';
import {
  Crosshair,
  FileText,
  Image as ImageIcon,
  PlusCircle,
  Loader2,
  Box,
  CheckCircle2,
  Sparkles,
  Map,
} from 'lucide-react';

interface DetectionWorkspacePageProps {
  onNavigate: (route: 'analyze' | 'reports' | 'history' | 'geospatial') => void;
}

export const DetectionWorkspacePage: React.FC<DetectionWorkspacePageProps> = ({ onNavigate }) => {
  const {
    activeScan,
    selectedAnomalyId,
    setSelectedAnomalyId,
    filters,
    updateFilters,
    resetFilters,
    filteredDetections,
    rawDetectionsCount,
    filteredDetectionsCount,
    updateReviewStatus,
  } = useSonar();

  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Legitimate empty state when no scan is loaded (Section 10)
  if (!activeScan) {
    return (
      <div className="animate-fade-in" style={{ padding: '40px 0' }}>
        <EmptyState
          type="no_scan"
          title="NO SCAN LOADED"
          description="Upload a sensor image to begin automated specialist detection and analysis."
          actionText="Upload Image / New Scan"
          onAction={() => onNavigate('analyze')}
        />
      </div>
    );
  }

  const selectedDetection = activeScan.detections.find((d) => d.id === selectedAnomalyId);

  const handleDownloadAnnotated = async () => {
    setIsExporting(true);
    try {
      await downloadAnnotatedImage(activeScan, activeScan.rawFile);
    } catch (err) {
      console.error('Annotated image export failed:', err);
      alert('Export failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsExporting(false);
    }
  };

  const routingConfText =
    activeScan.routingConfidence != null
      ? `${(activeScan.routingConfidence * 100).toFixed(1)}%`
      : 'Manual Selection';

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Workspace Header Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(0, 242, 254, 0.12)',
              color: 'var(--sonar-cyan)',
            }}
          >
            <Crosshair size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>ORCA DETECTION WORKSPACE</h2>
              <span className="badge badge-cyan">{activeScan.target.toUpperCase()} SPECIALIST</span>
              {activeScan.isAutoRouted && (
                <span className="badge badge-purple" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={11} />
                  <span>AUTO-ROUTED ({routingConfText})</span>
                </span>
              )}
            </div>
            <div className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>
              Scan: {activeScan.image.filename} • {activeScan.image.width} × {activeScan.image.height} px •{' '}
              {activeScan.timestamp}
            </div>
          </div>
        </div>

        {/* Top Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            id="workspace-download-annotated-btn"
            data-testid="workspace-download-annotated-btn"
            onClick={handleDownloadAnnotated}
            disabled={isExporting}
            className="btn btn-secondary btn-sm"
          >
            {isExporting ? <Loader2 size={13} className="sonar-ping" /> : <ImageIcon size={13} color="var(--sonar-teal)" />}
            <span>{isExporting ? 'Generating PNG...' : 'Download Annotated Image'}</span>
          </button>

          <button
            id="workspace-view-geospatial-top-btn"
            data-testid="workspace-view-geospatial-top-btn"
            onClick={() => onNavigate('geospatial')}
            className="btn btn-secondary btn-sm"
          >
            <Map size={13} color="var(--sonar-cyan)" />
            <span>View Geospatial View</span>
          </button>

          <button
            id="workspace-generate-report-btn"
            data-testid="workspace-generate-report-btn"
            onClick={() => onNavigate('reports')}
            className="btn btn-secondary btn-sm"
          >
            <FileText size={13} />
            <span>Generate Report</span>
          </button>

          <button
            id="workspace-new-scan-btn"
            data-testid="workspace-new-scan-btn"
            onClick={() => onNavigate('analyze')}
            className="btn btn-primary btn-sm"
          >
            <PlusCircle size={13} />
            <span>New Scan</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Sonar Viewport (Left) + Analysis Summary & Detections (Right) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.9fr) minmax(360px, 1.1fr)',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Interactive Image Viewer & Filter Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ height: '500px' }}>
            <SonarImageViewer
              imageUrl={activeScan.image.preview_url}
              imageWidth={activeScan.image.width}
              imageHeight={activeScan.image.height}
              detections={filteredDetections}
              selectedAnomalyId={selectedAnomalyId}
              onSelectAnomaly={(id) => setSelectedAnomalyId(id)}
              isRawView={filters.isRawView}
              isLiveAnalysis={true}
            />
          </div>

          <FilterControlPanel
            filters={filters}
            onUpdateFilters={updateFilters}
            onResetFilters={resetFilters}
            rawCount={rawDetectionsCount}
            filteredCount={filteredDetectionsCount}
          />
        </div>

        {/* Right Column: Analysis Summary, Detections List & Action Block */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Analysis Summary (Section 9) */}
          <div className="glass-panel" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Box size={16} color="var(--sonar-cyan)" />
                <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>
                  Analysis Summary
                </h3>
              </div>
              <span className="badge badge-emerald">
                <CheckCircle2 size={12} />
                Inference Complete
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '10px',
                background: 'var(--bg-surface)',
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Model</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--sonar-cyan)', marginTop: '2px' }}>
                  {activeScan.model_name}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#38bdf8', marginTop: '2px' }}>
                  {activeScan.target.toUpperCase()}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Routing Confidence
                </div>
                <div className="mono" style={{ fontSize: '13px', fontWeight: 700, marginTop: '2px' }}>
                  {routingConfText}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Objects Detected
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: '15px',
                    fontWeight: 800,
                    color: activeScan.detections.length > 0 ? '#34d399' : 'var(--text-muted)',
                    marginTop: '2px',
                  }}
                >
                  {activeScan.detections.length}
                </div>
              </div>
            </div>
          </div>

          {/* Cleanup / Inspection Order (Model-Aware Priority Ranking) */}
          <CleanupInspectionOrderCard
            detections={activeScan.detections}
            selectedAnomalyId={selectedAnomalyId}
            onSelectAnomaly={(id) => setSelectedAnomalyId(id)}
            target={activeScan.target}
          />

          {/* Itemized Detections (Section 9) */}
          <div className="glass-panel" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>
                Detections ({filteredDetections.length})
              </h3>
              <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Original Pixel Coordinates
              </span>
            </div>

            {filteredDetections.length === 0 ? (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px dashed var(--border-subtle)',
                  fontSize: '12px',
                }}
              >
                No candidate detections above current filter threshold.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
                {filteredDetections.map((det, idx) => {
                  const isSelected = selectedAnomalyId === det.id;
                  const [x1, y1, x2, y2] = [det.bbox.x1, det.bbox.y1, det.bbox.x2, det.bbox.y2];

                  return (
                    <div
                      key={det.id || idx}
                      onClick={() => setSelectedAnomalyId(det.id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: isSelected ? 'rgba(0, 242, 254, 0.1)' : 'var(--bg-surface)',
                        border: isSelected ? '1px solid var(--border-active)' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="mono" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
                            #{idx + 1}
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--sonar-cyan)' }}>
                            {det.class_name.toUpperCase()}
                          </span>
                        </div>
                        <span className="mono" style={{ fontSize: '13px', fontWeight: 700, color: '#34d399' }}>
                          {(det.confidence * 100).toFixed(2)}%
                        </span>
                      </div>

                      <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Bounding Box: [{x1.toFixed(1)}, {y1.toFixed(1)}, {x2.toFixed(1)}, {y2.toFixed(1)}]
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Detection Detail Inspector */}
          {selectedDetection && (
            <DetectionDetailPanel
              detection={selectedDetection}
              onUpdateReviewStatus={updateReviewStatus}
              isLiveAnalysis={true}
              target={activeScan.target}
            />
          )}

          {/* Actions Block (Section 9) */}
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h4 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              Scan Actions
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                id="workspace-view-geospatial-bottom-btn"
                data-testid="workspace-view-geospatial-bottom-btn"
                onClick={() => onNavigate('geospatial')}
                className="btn btn-secondary"
                style={{ justifyContent: 'center' }}
              >
                <Map size={14} color="var(--sonar-cyan)" />
                <span>View Geospatial View</span>
              </button>

              <button
                onClick={handleDownloadAnnotated}
                disabled={isExporting}
                className="btn btn-secondary"
                style={{ justifyContent: 'center' }}
              >
                {isExporting ? <Loader2 size={14} className="sonar-ping" /> : <ImageIcon size={14} />}
                <span>Annotated PNG</span>
              </button>
            </div>

            <button
              onClick={() => onNavigate('reports')}
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <FileText size={14} />
              <span>Generate Report</span>
            </button>

            <button
              onClick={() => onNavigate('analyze')}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
            >
              <PlusCircle size={15} />
              <span>Analyze Another Scan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: Full Candidate Detection Table */}
      <DetectionTable
        detections={filteredDetections}
        selectedAnomalyId={selectedAnomalyId}
        onSelectAnomaly={(id) => setSelectedAnomalyId(id)}
        searchQuery={filters.searchQuery}
        onSearchChange={(q) => updateFilters({ searchQuery: q })}
        targetClassFilter={filters.targetClass}
        onTargetClassFilterChange={(cls) => updateFilters({ targetClass: cls })}
        reviewStatusFilter={filters.reviewStatus}
        onReviewStatusFilterChange={(st) => updateFilters({ reviewStatus: st })}
        target={activeScan.target}
      />
    </div>
  );
};
