import React from 'react';
import { useSonar } from '../context/SonarContext';
import { SonarImageViewer } from '../components/sonar/SonarImageViewer';
import { DetectionDetailPanel } from '../components/detections/DetectionDetailPanel';
import { FilterControlPanel } from '../components/detections/FilterControlPanel';
import { DetectionTable } from '../components/detections/DetectionTable';
import { SegmentationStatusCard } from '../components/detections/SegmentationStatusCard';
import { EmptyState } from '../components/common/EmptyState';
import { Map, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { downloadAnnotatedImage } from '../utils/annotatedImageExport';

interface DetectionWorkspacePageProps {
  onNavigate: (route: 'geospatial' | 'reports') => void;
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
    isLiveAnalysis,
  } = useSonar();

  const [isExporting, setIsExporting] = React.useState<boolean>(false);

  if (!activeScan) {
    return <EmptyState type="no_scan" />;
  }

  const selectedDetection = activeScan.detections.find((d) => d.id === selectedAnomalyId);

  const handleDownloadAnnotated = async () => {
    setIsExporting(true);
    try {
      await downloadAnnotatedImage(activeScan, activeScan.rawFile);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Quick Jump Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="mono" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
            SURVEY: {activeScan.id}
          </span>
          <span className="badge badge-cyan">{activeScan.target.toUpperCase()} SPECIALIST</span>
          {isLiveAnalysis && <span className="badge badge-emerald">LIVE INFERENCE</span>}
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Swath File: {activeScan.image.filename}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleDownloadAnnotated}
            disabled={isExporting}
            className="btn btn-secondary btn-sm"
            title="Export full-resolution annotated PNG"
          >
            {isExporting ? <Loader2 size={13} className="sonar-ping" /> : <ImageIcon size={13} color="var(--sonar-teal)" />}
            <span>{isExporting ? 'Exporting...' : 'Download Annotated PNG'}</span>
          </button>
          <button onClick={() => onNavigate('geospatial')} className="btn btn-secondary btn-sm">
            <Map size={13} />
            <span>View on Geospatial Chart</span>
          </button>
          <button onClick={() => onNavigate('reports')} className="btn btn-secondary btn-sm">
            <FileText size={13} />
            <span>Generate Report</span>
          </button>
        </div>
      </div>

      {/* Top Main Section: Sonar Viewport (Left/Center) + Anomaly Details & Segmentation (Right) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.8fr) minmax(360px, 1.2fr)',
        gap: '20px',
        alignItems: 'start',
      }}>
        {/* Left / Center: Interactive Sonar Image Viewer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ height: '480px' }}>
            <SonarImageViewer
              imageUrl={activeScan.image.preview_url}
              imageWidth={activeScan.image.width}
              imageHeight={activeScan.image.height}
              detections={filteredDetections}
              selectedAnomalyId={selectedAnomalyId}
              onSelectAnomaly={(id) => setSelectedAnomalyId(id)}
              isRawView={filters.isRawView}
              isLiveAnalysis={isLiveAnalysis}
            />
          </div>

          {/* Filtering Control Bar */}
          <FilterControlPanel
            filters={filters}
            onUpdateFilters={updateFilters}
            onResetFilters={resetFilters}
            rawCount={rawDetectionsCount}
            filteredCount={filteredDetectionsCount}
          />
        </div>

        {/* Right Panel: Anomaly Inspection Details & Segmentation Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <DetectionDetailPanel
            detection={selectedDetection}
            onUpdateReviewStatus={updateReviewStatus}
            isLiveAnalysis={isLiveAnalysis}
          />

          <SegmentationStatusCard />
        </div>
      </div>

      {/* Bottom Section: Candidate Detection Table */}
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
      />
    </div>
  );
};
