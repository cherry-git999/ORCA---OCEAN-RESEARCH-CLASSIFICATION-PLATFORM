import React from 'react';
import { useSonar } from '../context/SonarContext';
import { MapView } from '../components/map/MapView';
import { Crosshair, ArrowRight, ShieldCheck, Layers, Navigation } from 'lucide-react';

interface GeospatialPageProps {
  onNavigate: (route: 'detections') => void;
}

export const GeospatialPage: React.FC<GeospatialPageProps> = ({ onNavigate }) => {
  const {
    activeScan,
    selectedAnomalyId,
    setSelectedAnomalyId,
    filteredDetections,
    locationSource,
    setLocationSource,
  } = useSonar();

  if (!activeScan) return null;

  const selectedDetection = activeScan.detections.find((d) => d.id === selectedAnomalyId);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Map + Selected Anomaly Synchronized Inspector */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 2.2fr) minmax(320px, 1fr)',
        gap: '20px',
        alignItems: 'start',
      }}>
        {/* Map View */}
        <div style={{ height: '640px' }}>
          <MapView
            locationMeta={activeScan.location}
            locationSource={locationSource}
            onLocationSourceChange={setLocationSource}
            detections={filteredDetections}
            selectedAnomalyId={selectedAnomalyId}
            onSelectAnomaly={(id) => setSelectedAnomalyId(id)}
          />
        </div>

        {/* Right Geospatial Selected Anomaly Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {selectedDetection ? (
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Crosshair size={16} color="var(--sonar-cyan)" />
                  <h4 style={{ fontSize: '14px', fontWeight: 600 }}>SELECTED WAYPOINT</h4>
                </div>
                <span className="badge badge-amber">DEMO COORD</span>
              </div>

              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                marginBottom: '14px',
              }}>
                <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedDetection.id}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--sonar-cyan)', fontWeight: 600 }}>
                  Class: {selectedDetection.class_name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Confidence: <strong style={{ color: '#fff' }}>{Math.round(selectedDetection.confidence * 100)}%</strong>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Location Source:</span>
                  <span className="mono" style={{ color: '#fbbf24' }}>Demo / Test Lat-Lon</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Pixel Dimensions:</span>
                  <span className="mono">
                    {Math.abs(selectedDetection.bbox.x2 - selectedDetection.bbox.x1)} × {Math.abs(selectedDetection.bbox.y2 - selectedDetection.bbox.y1)} px
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
                style={{ width: '100%' }}
              >
                <span>Jump to Detection Workspace</span>
                <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Navigation size={28} color="var(--text-muted)" style={{ margin: '0 auto 10px auto' }} />
              <h4 style={{ fontSize: '13px', fontWeight: 600 }}>NO WAYPOINT SELECTED</h4>
              <p style={{ fontSize: '11px', marginTop: '4px' }}>Click any acoustic marker pin on the geospatial chart to inspect its metadata.</p>
            </div>
          )}

          {/* Location Data Architecture Overview */}
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <ShieldCheck size={16} color="var(--sonar-cyan)" />
              <h4 style={{ fontSize: '13px', fontWeight: 600 }}>LOCATION DATA ARCHITECTURE</h4>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              In compliance with scientific safety standards, location coordinates are maintained as independent metadata entities rather than fabricated inside ML detection objects.
            </div>

            <div className="mono" style={{
              marginTop: '10px',
              padding: '8px',
              borderRadius: 'var(--radius-xs)',
              background: '#040812',
              border: '1px solid var(--border-subtle)',
              fontSize: '10px',
              color: 'var(--text-muted)',
            }}>
              location: &#123; source: "demo", latitude: 57.1497, longitude: -2.0943 &#125;
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
