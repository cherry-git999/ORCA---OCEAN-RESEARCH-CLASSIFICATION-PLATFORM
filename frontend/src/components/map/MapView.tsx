import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Detection, LocationMeta } from '../../types/detection';
import { getDetectionCoordinates, ACCURACY_DISCLAIMER } from '../../utils/geoCoordinates';
import { Compass, AlertTriangle, Navigation, Layers, Globe, Eye } from 'lucide-react';

interface MapViewProps {
  locationMeta: LocationMeta;
  detections: Detection[];
  selectedAnomalyId: string | null;
  onSelectAnomaly: (id: string) => void;
  imageWidth?: number;
  imageHeight?: number;
  scanName?: string;
  modelName?: string;
}

type BasemapType = 'ocean' | 'satellite' | 'osm';

export const MapView: React.FC<MapViewProps> = ({
  locationMeta,
  detections,
  selectedAnomalyId,
  onSelectAnomaly,
  imageWidth = 800,
  imageHeight = 600,
  scanName,
  modelName,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});
  const transectLineRef = useRef<L.Polyline | null>(null);
  const activeTileLayersRef = useRef<L.Layer[]>([]);

  const [basemapMode, setBasemapMode] = useState<BasemapType>('ocean');

  const centerLat = locationMeta.latitude ?? 15.3500;
  const centerLng = locationMeta.longitude ?? 73.4500;

  // 1. Initialize Leaflet Map Instance (Once)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: 12,
        zoomControl: true,
        attributionControl: true,
      });

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Synchronize Active Basemap Tiles (No Watermark, No API Key Required)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove existing tile layers
    activeTileLayersRef.current.forEach((layer) => {
      map.removeLayer(layer);
    });
    activeTileLayersRef.current = [];

    const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
    const cartoApiKey = import.meta.env.VITE_CARTO_API_KEY;

    if (basemapMode === 'ocean') {
      // ESRI World Ocean Basemap & Bathymetry (100% Free - No API Key Needed)
      const oceanBase = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; Esri, GEBCO, NOAA, CHS, National Geographic (Offshore Bathymetry)',
          maxNativeZoom: 13,
          maxZoom: 17,
        }
      );
      const oceanRef = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}',
        {
          maxNativeZoom: 13,
          maxZoom: 17,
        }
      );
      oceanBase.addTo(map);
      oceanRef.addTo(map);
      activeTileLayersRef.current = [oceanBase, oceanRef];
    } else if (basemapMode === 'satellite') {
      // ESRI High-Resolution World Imagery (100% Free - No API Key Needed)
      const satBase = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; Esri, Maxar, Earthstar Geographics',
          maxNativeZoom: 18,
          maxZoom: 19,
        }
      );
      satBase.addTo(map);
      activeTileLayersRef.current = [satBase];
    } else if (basemapMode === 'osm') {
      // OpenStreetMap Global Maritime Standard (100% Free - No API Key Needed)
      const osmBase = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      });
      osmBase.addTo(map);
      activeTileLayersRef.current = [osmBase];
    }
  }, [basemapMode]);

  // 3. Synchronize Center View when Coordinates Change
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([centerLat, centerLng], 12, { animate: true });
    }
  }, [centerLat, centerLng]);

  // 4. Render Transect Swath & Anomaly Waypoint Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers and transects
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};
    if (transectLineRef.current) {
      transectLineRef.current.remove();
      transectLineRef.current = null;
    }

    // Generate vessel survey transect line through open water
    const transectPoints: [number, number][] = [
      [centerLat - 0.012, centerLng - 0.012],
      [centerLat, centerLng],
      [centerLat + 0.012, centerLng + 0.012],
    ];

    transectLineRef.current = L.polyline(transectPoints, {
      color: '#00f2fe',
      weight: 2,
      dashArray: '6, 8',
      opacity: 0.85,
    }).addTo(map);

    // Plot each detected anomaly waypoint
    detections.forEach((det, idx) => {
      const way = getDetectionCoordinates(centerLat, centerLng, det.bbox, imageWidth, imageHeight);
      const markerLat = way.latitude;
      const markerLng = way.longitude;

      // Class Color Coding
      const lowerCls = det.class_name.toLowerCase();
      let color = '#00f2fe'; // Cyan default
      if (lowerCls.includes('pipeline')) {
        color = '#f59e0b'; // Amber
      } else if (lowerCls.includes('human')) {
        color = '#f43f5e'; // Rose
      } else if (['cap', 'clip', 'key', 'niddle', 'scissor'].includes(lowerCls)) {
        color = '#38bdf8'; // Sky Blue
      }

      const customIcon = L.divIcon({
        className: 'custom-sonar-marker',
        html: `
          <div style="
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: rgba(7, 14, 28, 0.92);
            border: 2px solid ${color};
            box-shadow: 0 0 12px ${color};
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-size: 11px;
            font-family: var(--font-mono, monospace);
            font-weight: 700;
            transform: translate(-50%, -50%);
            cursor: pointer;
            transition: all 0.2s ease;
          ">
            ${idx + 1}
          </div>
        `,
        iconSize: [28, 28],
      });

      const marker = L.marker([markerLat, markerLng], { icon: customIcon }).addTo(map);

      marker.bindPopup(
        `
        <div style="font-family: var(--font-body, sans-serif); padding: 4px; min-width: 220px;">
          <div style="font-weight: 700; font-size: 14px; color: ${color}; margin-bottom: 3px;">
            #${idx + 1} — ${det.class_name.toUpperCase()}
          </div>
          <div style="font-size: 12px; color: #94a3b8; margin-bottom: 2px;">
            ID: <strong style="color: #fff;">${det.id}</strong> • Conf: <strong style="color: #34d399;">${Math.round(
          det.confidence * 100
        )}%</strong>
          </div>
          ${modelName ? `<div style="font-size: 11.5px; color: #38bdf8; margin-bottom: 2px;">Model: <strong>${modelName}</strong></div>` : ''}
          ${scanName ? `<div style="font-size: 11.5px; color: #94a3b8; margin-bottom: 4px; font-family: monospace;">Scan: ${scanName}</div>` : ''}
          <div style="font-size: 11.5px; color: #cbd5e1; margin-top: 4px; font-family: monospace; background: rgba(0,0,0,0.4); padding: 5px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
            <span style="color: #94a3b8; font-size: 11px; text-transform: uppercase;">Geospatial Reference:</span><br />
            Lat: ${markerLat > 0 ? markerLat.toFixed(4) + '° N' : Math.abs(markerLat).toFixed(4) + '° S'}<br />
            Lon: ${markerLng > 0 ? markerLng.toFixed(4) + '° E' : Math.abs(markerLng).toFixed(4) + '° W'}
          </div>
          <div style="font-size: 11.5px; color: #fbbf24; margin-top: 4px; font-weight: 500;">
            ${ACCURACY_DISCLAIMER}
          </div>
        </div>
      `,
        { autoPan: true }
      );

      marker.on('click', () => {
        onSelectAnomaly(det.id);
      });

      markersRef.current[det.id] = marker;
    });
  }, [detections, centerLat, centerLng, imageWidth, imageHeight, onSelectAnomaly, scanName, modelName]);

  // 5. Synchronize Selected Anomaly Popup
  useEffect(() => {
    if (!selectedAnomalyId) return;
    const target = markersRef.current[selectedAnomalyId];
    if (target) {
      target.openPopup();
    }
  }, [selectedAnomalyId]);

  return (
    <div
      className="glass-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '560px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          padding: '12px 18px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-glass-heavy)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 10,
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Navigation size={18} color="var(--sonar-cyan)" />
          <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, letterSpacing: '0.04em' }}>
            ACOUSTIC & OPTICAL GEOSPATIAL CHART
          </h3>
        </div>

        {/* Basemap Mode Switcher & Status Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              background: 'rgba(7, 14, 28, 0.8)',
              padding: '2px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              gap: '2px',
            }}
          >
            <button
              onClick={() => setBasemapMode('ocean')}
              className={`btn btn-xs ${basemapMode === 'ocean' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '11.5px', padding: '4px 9px', borderRadius: '4px' }}
              title="ESRI Ocean & Marine Bathymetry (No API Key Required)"
            >
              <span>🌊 Ocean Bathymetry</span>
            </button>
            <button
              onClick={() => setBasemapMode('satellite')}
              className={`btn btn-xs ${basemapMode === 'satellite' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '11.5px', padding: '4px 9px', borderRadius: '4px' }}
              title="ESRI High-Resolution Satellite (No API Key Required)"
            >
              <span>🛰️ Satellite</span>
            </button>
            <button
              onClick={() => setBasemapMode('osm')}
              className={`btn btn-xs ${basemapMode === 'osm' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '11.5px', padding: '4px 9px', borderRadius: '4px' }}
              title="OpenStreetMap Marine View (No API Key Required)"
            >
              <span>🗺️ OSM</span>
            </button>
          </div>

          <span className="badge badge-cyan" style={{ fontSize: '11.5px' }}>
            OFFSHORE WATER
          </span>
        </div>
      </div>

      {/* Accuracy Disclaimer Banner */}
      <div
        style={{
          background: 'rgba(245, 158, 11, 0.08)',
          borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12.5px',
          color: '#fbbf24',
          zIndex: 10,
        }}
      >
        <AlertTriangle size={13} style={{ flexShrink: 0 }} />
        <span>
          <strong>OFFSHORE SENSOR REFERENCE:</strong> Coordinates plotted over open maritime waters{' '}
          <em>{ACCURACY_DISCLAIMER}</em>. Real hardware USBL/NMEA stream not present in raw scan.
        </span>
      </div>

      {/* Leaflet Map Canvas Container */}
      <div style={{ flex: 1, minHeight: '480px', position: 'relative' }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '480px' }} />

        {/* Floating Water Sector Telemetry Box */}
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            background: 'rgba(7, 14, 28, 0.92)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 14px',
            zIndex: 500,
            boxShadow: 'var(--shadow-md)',
            maxWidth: '320px',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <Compass size={14} color="var(--sonar-cyan)" />
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              OFFSHORE TRANSECT TELEMETRY
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Transect ID:</span>
              <span className="mono" style={{ color: 'var(--sonar-cyan)' }}>
                {locationMeta.transect_id || 'TR-OFFSHORE-04'}
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
              <span style={{ color: 'var(--text-muted)' }}>Layer Mode:</span>
              <span className="mono" style={{ color: '#38bdf8', textTransform: 'capitalize' }}>
                {basemapMode === 'ocean' ? 'ESRI Ocean Bathymetry' : basemapMode === 'satellite' ? 'ESRI Satellite' : 'OpenStreetMap'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Accuracy:</span>
              <span style={{ color: '#fbbf24', fontSize: '11px' }}>{ACCURACY_DISCLAIMER}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Target Pins:</span>
              <span className="mono" style={{ color: '#38bdf8' }}>
                {detections.length} Waypoints Plotted
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
