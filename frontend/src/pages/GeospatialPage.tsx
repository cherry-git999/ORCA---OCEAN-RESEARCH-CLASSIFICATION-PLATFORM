import React from 'react';
import { useSonar } from '../context/SonarContext';
import { Crosshair, ArrowRight, ShieldCheck, Navigation } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';

interface GeospatialPageProps {
  onNavigate: (route: 'detections' | 'analyze') => void;
}

export const GeospatialPage: React.FC<GeospatialPageProps> = ({ onNavigate }) => {
  const {
    activeScan,
    selectedAnomalyId,
    setSelectedAnomalyId,
    filteredDetections,
  } = useSonar();

  if (!activeScan) {
    return (
      <div className="animate-fade-in" style={{ padding: '40px 0' }}>
        <EmptyState
          type="no_scan"
          title="NO SCAN LOADED"
          description="Upload an image to inspect anomaly localization and coordinate telemetry."
          actionText="Analyze Scan"
          onAction={() => onNavigate('analyze')}
        />
      </div>
    );
  }

  const selectedDetection = activeScan.detections.find((d) => d.id === selectedAnomalyId);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Informational Status Card */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Navigation size={20} color="var(--sonar-cyan)" />
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>
              GEOSPATIAL COORDINATE LOCALIZATION
            </h3>
            <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Scan: {activeScan.image.filename} • {activeScan.detections.length} Detections Localized
            </span>
          </div>
        </div>

        <button onClick={() => onNavigate('detections')} className="btn btn-secondary btn-sm">
          <span>Detection Workspace</span>
          <ArrowRight size={13} />
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.8fr) minmax(340px, 1.2fr)',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* Left: Pixel Coordinate Grid View */}
        <div className="glass-panel" style={{ padding: '24px', minHeight: '480px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600 }}>CALIBRATED PIXEL LOCALIZATION</h4>
            <span className="badge badge-cyan">{activeScan.image.width} × {activeScan.image.height} PX</span>
          </div>

          <div
            style={{
              flex: 1,
              background: '#040914',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-medium)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px',
            }}
          >
            <img
              src={activeScan.image.preview_url}
              alt="Scan"
              style={{ maxWidth: '100%', maxHeight: '420px', objectFit: 'contain', borderRadius: '2px' }}
            />
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            All candidate bounding boxes are mapped precisely to original sensor coordinates [x1, y1, x2, y2].
          </div>
        </div>

        {/* Right: Telemetry & Selected Waypoint Information */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {selectedDetection ? (
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Crosshair size={16} color="var(--sonar-cyan)" />
                  <h4 style={{ fontSize: '14px', fontWeight: 600 }}>SELECTED DETECTION</h4>
                </div>
                <span className="badge badge-emerald">
                  {(selectedDetection.confidence * 100).toFixed(1)}% CONF
                </span>
              </div>

              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px',
                  marginBottom: '14px',
                }}
              >
                <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedDetection.id}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--sonar-cyan)', fontWeight: 600, marginTop: '2px' }}>
                  Class: {selectedDetection.class_name.toUpperCase()}
                </div>
                <div className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Bounding Box: [{selectedDetection.bbox.x1.toFixed(1)}, {selectedDetection.bbox.y1.toFixed(1)},{' '}
                  {selectedDetection.bbox.x2.toFixed(1)}, {selectedDetection.bbox.y2.toFixed(1)}]
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Pixel Width:</span>
                  <span className="mono">
                    {Math.abs(selectedDetection.bbox.x2 - selectedDetection.bbox.x1).toFixed(1)} px
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Pixel Height:</span>
                  <span className="mono">
                    {Math.abs(selectedDetection.bbox.y2 - selectedDetection.bbox.y1).toFixed(1)} px
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Specialist Model:</span>
                  <span>{selectedDetection.model}</span>
                </div>
              </div>

              <button
                onClick={() => onNavigate('detections')}
                className="btn btn-primary btn-sm"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <span>Jump to Detection Workspace</span>
                <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Crosshair size={28} color="var(--text-muted)" style={{ margin: '0 auto 10px auto' }} />
              <h4 style={{ fontSize: '13px', fontWeight: 600 }}>NO DETECTION SELECTED</h4>
              <p style={{ fontSize: '11px', marginTop: '4px' }}>
                Select a detection in the table or workspace to inspect coordinates.
              </p>
            </div>
          )}

          {/* Scientific Verification Card */}
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <ShieldCheck size={16} color="var(--sonar-cyan)" />
              <h4 style={{ fontSize: '13px', fontWeight: 600 }}>COORDINATE INTEGRITY POLICY</h4>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              In compliance with scientific standards, GPS coordinates are never fabricated when raw sensor inputs lack NMEA 0183 or USBL navigation telemetry. Bounding box coordinates represent verified image sensor space.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
