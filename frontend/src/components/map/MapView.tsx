import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Detection, LocationMeta } from '../../types/detection';
import { DEMO_SURVEY_TRACK } from '../../data/demoData';
import { MapPin, Navigation, Compass, AlertTriangle, ShieldCheck } from 'lucide-react';

interface MapViewProps {
  locationMeta: LocationMeta;
  locationSource: 'demo' | 'sonar_metadata';
  onLocationSourceChange: (source: 'demo' | 'sonar_metadata') => void;
  detections: Detection[];
  selectedAnomalyId: string | null;
  onSelectAnomaly: (id: string) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  locationMeta,
  locationSource,
  onLocationSourceChange,
  detections,
  selectedAnomalyId,
  onSelectAnomaly,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});

  const centerLat = locationMeta.latitude || 57.1497;
  const centerLng = locationMeta.longitude || -2.0943;

  // Initialize or update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: 12,
        zoomControl: false,
      });

      // Add zoom control at top right
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Add Dark Carto / OpenStreetMap tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      // Draw Survey Transect Track Polyline
      const trackLatLngs = DEMO_SURVEY_TRACK.map((p) => [p.lat, p.lng] as [number, number]);
      L.polyline(trackLatLngs, {
        color: '#00f2fe',
        weight: 2,
        dashArray: '6, 6',
        opacity: 0.7,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear previous anomaly markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    // Generate spread coordinates along survey track for candidate anomalies
    detections.forEach((det, idx) => {
      // Offset slightly for distinct marker placement along transect
      const latOffset = (idx - detections.length / 2) * 0.0035;
      const lngOffset = (idx - detections.length / 2) * 0.0045;
      const markerLat = centerLat + latOffset;
      const markerLng = centerLng + lngOffset;

      const isSelected = selectedAnomalyId === det.id;

      let color = '#00f2fe';
      if (det.confidence >= 0.8) color = '#10b981';
      else if (det.confidence < 0.5) color = '#f59e0b';
      if (isSelected) color = '#00f2fe';

      const customIcon = L.divIcon({
        className: 'custom-sonar-marker',
        html: `
          <div style="
            width: ${isSelected ? '32px' : '24px'};
            height: ${isSelected ? '32px' : '24px'};
            border-radius: 50%;
            background: ${isSelected ? 'rgba(0, 242, 254, 0.35)' : 'rgba(7, 14, 28, 0.85)'};
            border: 2px solid ${color};
            box-shadow: 0 0 ${isSelected ? '14px' : '8px'} ${color};
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-size: ${isSelected ? '11px' : '9px'};
            font-family: var(--font-mono);
            font-weight: 700;
            transform: translate(-50%, -50%);
            cursor: pointer;
            transition: all 0.2s ease;
          ">
            ${det.id.replace('ANM-', '')}
          </div>
        `,
        iconSize: [24, 24],
      });

      const marker = L.marker([markerLat, markerLng], { icon: customIcon }).addTo(map);

      marker.on('click', () => {
        onSelectAnomaly(det.id);
      });

      marker.bindPopup(`
        <div style="font-family: var(--font-body); padding: 4px;">
          <div style="font-weight: 700; font-size: 13px; color: #00f2fe; margin-bottom: 2px;">
            ${det.id} (${det.class_name})
          </div>
          <div style="font-size: 11px; color: #94a3b8;">
            Confidence: <strong style="color: #fff;">${Math.round(det.confidence * 100)}%</strong>
          </div>
          <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
            Lat: ${markerLat.toFixed(4)}° | Lon: ${markerLng.toFixed(4)}°
          </div>
          <div style="font-size: 9px; color: #f59e0b; margin-top: 2px; font-weight: 600;">
            [DEMO TEST COORDINATES]
          </div>
        </div>
      `);

      markersRef.current[det.id] = marker;

      if (isSelected) {
        marker.openPopup();
        map.panTo([markerLat, markerLng], { animate: true });
      }
    });
  }, [detections, selectedAnomalyId, centerLat, centerLng, onSelectAnomaly]);

  return (
    <div className="glass-panel" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Top Header & Source Selector */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-glass-heavy)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
        flexWrap: 'wrap',
        gap: '10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Navigation size={18} color="var(--sonar-cyan)" />
          <h3 style={{ fontSize: '15px', fontWeight: 600 }}>ACOUSTIC GEOSPATIAL CHART</h3>
          <span className="badge badge-amber" style={{ fontSize: '10px' }}>
            DEMO COORDINATES
          </span>
        </div>

        {/* Location Source Selector (Section 21) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Coordinate Source:
          </span>
          <div style={{
            display: 'flex',
            background: 'var(--bg-surface)',
            padding: '2px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}>
            <button
              onClick={() => onLocationSourceChange('demo')}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: 'var(--radius-xs)',
                border: 'none',
                cursor: 'pointer',
                background: locationSource === 'demo' ? 'var(--status-amber)' : 'transparent',
                color: locationSource === 'demo' ? '#040812' : 'var(--text-secondary)',
              }}
            >
              Demo / Test Location
            </button>
            <button
              onClick={() => onLocationSourceChange('sonar_metadata')}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 500,
                borderRadius: 'var(--radius-xs)',
                border: 'none',
                cursor: 'pointer',
                background: locationSource === 'sonar_metadata' ? 'var(--sonar-cyan)' : 'transparent',
                color: locationSource === 'sonar_metadata' ? '#040812' : 'var(--text-muted)',
              }}
            >
              Real Sonar Metadata
            </button>
          </div>
        </div>
      </div>

      {/* Mandatory Scientific Disclaimer Banner */}
      <div style={{
        background: 'rgba(245, 158, 11, 0.09)',
        borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '11px',
        color: '#fbbf24',
        zIndex: 10,
      }}>
        <AlertTriangle size={14} style={{ flexShrink: 0 }} />
        <span>
          {locationSource === 'demo'
            ? 'DEMO LOCATION — Not derived from sonar navigation metadata. Real GPS coordinates are not provided by the current sensor stream.'
            : 'METADATA SOURCE: Sonar navigation NMEA / USBL telemetry is currently unavailable in the raw input file.'}
        </span>
      </div>

      {/* Map Element Container */}
      <div style={{ flex: 1, minHeight: '520px', position: 'relative' }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

        {/* Floating Telemetry Box on Map */}
        <div style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          background: 'rgba(7, 14, 28, 0.9)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 14px',
          zIndex: 500,
          boxShadow: 'var(--shadow-md)',
          maxWidth: '280px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <Compass size={14} color="var(--sonar-cyan)" />
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>
              SURVEY TRANSECT TELEMETRY
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Transect Lane:</span>
              <span className="mono" style={{ color: 'var(--sonar-cyan)' }}>{locationMeta.transect_id || 'LINE-04-N'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Waypoint Lat:</span>
              <span className="mono">{centerLat.toFixed(4)}° N</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Waypoint Lon:</span>
              <span className="mono">{Math.abs(centerLng).toFixed(4)}° W</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Marker Count:</span>
              <span className="mono">{detections.length} Waypoint Pins</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
