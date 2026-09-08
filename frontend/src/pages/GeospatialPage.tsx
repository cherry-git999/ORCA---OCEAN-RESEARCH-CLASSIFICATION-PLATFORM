import React from 'react';
import { useSonar } from '../context/SonarContext';
import { MapView } from '../components/map/MapView';
import { Crosshair, ArrowRight, Compass, ShieldCheck, MapPin } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import { getDetectionCoordinates, ACCURACY_DISCLAIMER } from '../utils/geoCoordinates';

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
  const centerLat = activeScan.location.latitude ?? 15.3500;
  const centerLng = activeScan.location.longitude ?? 73.4500;

  const selectedWaypoint = selectedDetection
    ? getDetectionCoordinates(
        centerLat,
        centerLng,
        selectedDetection.bbox,
        activeScan.image.width,
        activeScan.image.height
      )
    : null;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header Card */}
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
          <Compass size={22} color="var(--sonar-cyan)" />
          <div>
            <h3 style={{ fontSize: '16.5px', fontWeight: 600, margin: 0, letterSpacing: '0.04em' }}>
              GEOSPATIAL ANOMALY LOCALIZATION & MARITIME CHART
            </h3>
            <span className="mono" style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Scan: {activeScan.image.filename} • {activeScan.detections.length} Anomaly Waypoints Plotted
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
          gridTemplateColumns: 'minmax(0, 2fr) minmax(340px, 1.1fr)',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* Left: Interactive Marine Map View */}
        <div style={{ minHeight: '580px', height: '100%' }}>
          <MapView
            locationMeta={activeScan.location}
            detections={filteredDetections}
            selectedAnomalyId={selectedAnomalyId}
            onSelectAnomaly={(id) => setSelectedAnomalyId(id)}
            imageWidth={activeScan.image.width}
            imageHeight={activeScan.image.height}
            scanName={activeScan.image.filename}
            modelName={activeScan.model_name}
          />
        </div>

        {/* Right: Selected Anomaly Waypoint & Marine Telemetry Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {selectedDetection && selectedWaypoint ? (
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Crosshair size={16} color="var(--sonar-cyan)" />
                  <h4 style={{ fontSize: '15px', fontWeight: 600 }}>SELECTED WAYPOINT</h4>
                </div>
                <span className="badge badge-amber" style={{ fontSize: '11.5px' }}>
                  ESTIMATED
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
                <div className="mono" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedDetection.id}
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    color: 'var(--sonar-cyan)',
                    fontWeight: 600,
                    marginTop: '2px',
                    textTransform: 'uppercase',
                  }}
                >
                  Class: {selectedDetection.class_name}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Confidence:{' '}
                  <strong style={{ color: 'var(--status-emerald)' }}>
                    {Math.round(selectedDetection.confidence * 100)}%
                  </strong>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Waypoint Lat:</span>
                  <span className="mono" style={{ color: 'var(--text-primary)' }}>
                    {selectedWaypoint.latitude > 0
                      ? selectedWaypoint.latitude.toFixed(4) + '° N'
                      : Math.abs(selectedWaypoint.latitude).toFixed(4) + '° S'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Waypoint Lon:</span>
                  <span className="mono" style={{ color: 'var(--text-primary)' }}>
                    {selectedWaypoint.longitude > 0
                      ? selectedWaypoint.longitude.toFixed(4) + '° E'
                      : Math.abs(selectedWaypoint.longitude).toFixed(4) + '° W'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Accuracy Status:</span>
                  <span style={{ color: '#fbbf24', fontSize: '11.5px', fontWeight: 500 }}>
                    {ACCURACY_DISCLAIMER}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Pixel Bounds:</span>
                  <span className="mono">
                    [{selectedDetection.bbox.x1.toFixed(0)}, {selectedDetection.bbox.y1.toFixed(0)},{' '}
                    {selectedDetection.bbox.x2.toFixed(0)}, {selectedDetection.bbox.y2.toFixed(0)}]
                  </span>
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
              <MapPin size={28} color="var(--text-muted)" style={{ margin: '0 auto 10px auto' }} />
              <h4 style={{ fontSize: '14.5px', fontWeight: 600 }}>NO WAYPOINT SELECTED</h4>
              <p style={{ fontSize: '12.5px', marginTop: '4px' }}>
                Click any numbered pin on the marine map to inspect anomaly coordinates.
              </p>
            </div>
          )}

          {/* Offshore Marine Survey Environment Card */}
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <ShieldCheck size={16} color="var(--sonar-cyan)" />
              <h4 style={{ fontSize: '14.5px', fontWeight: 600 }}>OFFSHORE SURVEY TELEMETRY</h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Maritime Sector:</span>
                <span className="mono" style={{ color: 'var(--sonar-cyan)' }}>
                  {activeScan.location.description || 'Offshore Marine Grid'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Sector Center:</span>
                <span className="mono">
                  {centerLat > 0 ? centerLat.toFixed(4) + '° N' : Math.abs(centerLat).toFixed(4) + '° S'},{' '}
                  {centerLng > 0 ? centerLng.toFixed(4) + '° E' : Math.abs(centerLng).toFixed(4) + '° W'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Bathymetry Zone:</span>
                <span className="mono" style={{ color: '#38bdf8' }}>
                  Offshore Water (~68m depth)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Datum:</span>
                <span className="mono">WGS-84 Hydrographic</span>
              </div>
            </div>

            <div
              style={{
                marginTop: '12px',
                padding: '8px 10px',
                background: 'rgba(245, 158, 11, 0.08)',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                fontSize: '11.5px',
                color: '#fbbf24',
              }}
            >
              Coordinates are calculated relative to oceanic marine water reference points {ACCURACY_DISCLAIMER}.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
