import React, { useState } from 'react';
import { PredictDetectionItem } from '../../types/api';
import { Eye, ShieldAlert, CheckCircle2, Crosshair, Box } from 'lucide-react';

interface PredictVisualizerProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  detections: PredictDetectionItem[];
  model: string;
  target: string;
  filename: string;
}

export const PredictVisualizer: React.FC<PredictVisualizerProps> = ({
  imageUrl,
  imageWidth,
  imageHeight,
  detections,
  model,
  target,
  filename,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const getTargetColor = (targetName: string) => {
    switch (targetName.toLowerCase()) {
      case 'pipeline':
        return 'var(--sonar-cyan, #00f2fe)';
      case 'human':
        return '#f43f5e';
      case 'hardware':
        return '#10b981';
      default:
        return 'var(--sonar-cyan, #00f2fe)';
    }
  };

  const primaryColor = getTargetColor(target);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Telemetry Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              padding: '6px',
              borderRadius: 'var(--radius-xs)',
              background: 'rgba(0, 242, 254, 0.1)',
              color: primaryColor,
            }}
          >
            <Crosshair size={18} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              SPECIALIST PREDICTION RESULTS
            </div>
            <div className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {filename} ({imageWidth} × {imageHeight} px)
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="badge badge-cyan" id="result-model-badge" data-testid="result-model-badge">
            MODEL: {model.toUpperCase()}
          </span>
          <span className="badge badge-purple" id="result-target-badge" data-testid="result-target-badge">
            TARGET: {target.toUpperCase()}
          </span>
          <span
            className={`badge ${detections.length > 0 ? 'badge-emerald' : 'badge-muted'}`}
            id="result-count-badge"
            data-testid="result-count-badge"
          >
            DETECTIONS: {detections.length}
          </span>
        </div>
      </div>

      {/* Main Image + Bounding Box Canvas Overlay */}
      <div
        className="glass-panel-elevated"
        style={{
          position: 'relative',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          background: '#040914',
          border: '1px solid var(--border-medium)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '260px',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {/* Base Sonar Image */}
          <img
            id="prediction-sonar-image"
            data-testid="prediction-sonar-image"
            src={imageUrl}
            alt="Prediction Sonar Visual"
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '520px',
              objectFit: 'contain',
              display: 'block',
            }}
          />

          {/* SVG Vector Bounding Box Overlay (Scales with 100% precision) */}
          <svg
            id="prediction-bbox-overlay"
            data-testid="prediction-bbox-overlay"
            viewBox={`0 0 ${imageWidth || 640} ${imageHeight || 640}`}
            preserveAspectRatio="xMidYMid meet"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
            }}
          >
            {detections.map((det, idx) => {
              const [x1, y1, x2, y2] = det.bbox;
              const w = Math.max(0, x2 - x1);
              const h = Math.max(0, y2 - y1);
              const isHovered = hoveredIdx === idx;
              const strokeColor = isHovered ? '#ffffff' : primaryColor;
              const strokeWidth = Math.max(2, Math.round(imageWidth / 400));
              const fontSize = Math.max(14, Math.round(imageWidth / 45));

              return (
                <g
                  key={`bbox-${idx}`}
                  style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* Bounding Box Rectangle */}
                  <rect
                    x={x1}
                    y={y1}
                    width={w}
                    height={h}
                    fill={isHovered ? 'rgba(0, 242, 254, 0.25)' : 'rgba(0, 242, 254, 0.12)'}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={isHovered ? 'none' : 'none'}
                    rx={4}
                  />

                  {/* Corner Targets */}
                  <circle cx={x1} cy={y1} r={strokeWidth * 1.5} fill={strokeColor} />
                  <circle cx={x2} cy={y1} r={strokeWidth * 1.5} fill={strokeColor} />
                  <circle cx={x1} cy={y2} r={strokeWidth * 1.5} fill={strokeColor} />
                  <circle cx={x2} cy={y2} r={strokeWidth * 1.5} fill={strokeColor} />

                  {/* Label Pill Header */}
                  <rect
                    x={x1}
                    y={Math.max(0, y1 - fontSize - 8)}
                    width={Math.max(w, 140)}
                    height={fontSize + 6}
                    fill="rgba(4, 9, 20, 0.88)"
                    stroke={strokeColor}
                    strokeWidth={1}
                    rx={2}
                  />
                  <text
                    x={x1 + 6}
                    y={Math.max(fontSize, y1 - 4)}
                    fill={strokeColor}
                    fontSize={fontSize}
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {det.class} {(det.confidence * 100).toFixed(1)}%
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Structured Results Card & Table */}
      <div className="glass-panel" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Box size={16} color="var(--sonar-cyan)" />
          <h4 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>
            Extracted Detection Telemetry
          </h4>
        </div>

        {detections.length === 0 ? (
          <div
            id="zero-detections-message"
            data-testid="zero-detections-message"
            style={{
              padding: '16px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-sm)',
              border: '1px dashed var(--border-subtle)',
              fontSize: '13px',
            }}
          >
            No objects detected above the confidence threshold (conf ≥ 0.25).
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {detections.map((det, idx) => (
              <div
                key={`det-card-${idx}`}
                id={`detection-item-${idx}`}
                data-testid={`detection-item-${idx}`}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 100px 1fr',
                  gap: '12px',
                  alignItems: 'center',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-xs)',
                  background: hoveredIdx === idx ? 'rgba(0, 242, 254, 0.08)' : 'var(--bg-surface)',
                  border: `1px solid ${hoveredIdx === idx ? primaryColor : 'var(--border-subtle)'}`,
                  transition: 'all 0.15s ease',
                }}
              >
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Class
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: primaryColor, marginTop: '2px' }}>
                    {det.class}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Confidence
                  </div>
                  <div className="mono" style={{ fontSize: '13px', fontWeight: 600, color: '#34d399', marginTop: '2px' }}>
                    {(det.confidence * 100).toFixed(2)}%
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Bounding Box [x1, y1, x2, y2]
                  </div>
                  <div className="mono" style={{ fontSize: '12px', color: 'var(--text-primary)', marginTop: '2px' }}>
                    [{det.bbox[0].toFixed(2)}, {det.bbox[1].toFixed(2)}, {det.bbox[2].toFixed(2)}, {det.bbox[3].toFixed(2)}]
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
