import React, { useState, useRef, useEffect } from 'react';
import { PredictDetectionItem } from '../../types/api';
import { Crosshair, Box, Sparkles, CheckCircle2, Copy } from 'lucide-react';

interface PredictVisualizerProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  detections: PredictDetectionItem[];
  model: string;
  target: string;
  filename: string;
  isAutoRouted?: boolean;
  routingConfidence?: number;
}

export const PredictVisualizer: React.FC<PredictVisualizerProps> = ({
  imageUrl,
  imageWidth,
  imageHeight,
  detections,
  model,
  target,
  filename,
  isAutoRouted = false,
  routingConfidence,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [renderedDims, setRenderedDims] = useState<{ width: number; height: number }>({
    width: imageWidth || 640,
    height: imageHeight || 640,
  });

  // Dynamically track rendered image dimensions for precise coordinate scaling
  const handleImageLoad = () => {
    if (imgRef.current) {
      setRenderedDims({
        width: imgRef.current.clientWidth,
        height: imgRef.current.clientHeight,
      });
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (imgRef.current) {
        setRenderedDims({
          width: imgRef.current.clientWidth,
          height: imgRef.current.clientHeight,
        });
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [imageUrl]);

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

  // Precise coordinate scaling calculation (Section 8)
  const origW = imageWidth > 0 ? imageWidth : (renderedDims.width || 640);
  const origH = imageHeight > 0 ? imageHeight : (renderedDims.height || 640);
  const scaleX = renderedDims.width > 0 ? renderedDims.width / origW : 1;
  const scaleY = renderedDims.height > 0 ? renderedDims.height / origH : 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Telemetry & Routing Attribution Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          borderLeft: `4px solid ${primaryColor}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              padding: '8px',
              borderRadius: 'var(--radius-xs)',
              background: 'rgba(0, 242, 254, 0.1)',
              color: primaryColor,
            }}
          >
            <Crosshair size={20} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              SPECIALIST PREDICTION RESULTS
            </div>
            <div className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {filename} ({imageWidth} × {imageHeight} px original)
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {isAutoRouted && (
            <span
              className="badge badge-purple"
              id="auto-routed-badge"
              data-testid="auto-routed-badge"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <Sparkles size={11} />
              <span>AUTO-ROUTED {routingConfidence ? `(${(routingConfidence * 100).toFixed(1)}%)` : ''}</span>
            </span>
          )}
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
            OBJECTS: {detections.length}
          </span>
        </div>
      </div>

      {/* Main Image + Scaled Bounding Box Overlay (Relative Positioning Wrapper) */}
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
        {/* Relative Positioning Image Wrapper */}
        <div
          id="detection-image-wrapper"
          data-testid="detection-image-wrapper"
          style={{
            position: 'relative',
            display: 'inline-block',
            maxWidth: '100%',
          }}
        >
          {/* Base Sonar/Optical Image */}
          <img
            ref={imgRef}
            id="prediction-sonar-image"
            data-testid="prediction-sonar-image"
            src={imageUrl}
            alt="Prediction Visual"
            onLoad={handleImageLoad}
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '540px',
              objectFit: 'contain',
              display: 'block',
            }}
          />

          {/* Absolute HTML Bounding Boxes Overlay (Scaled via scaleX and scaleY) */}
          <div
            id="scaled-bounding-box-container"
            data-testid="scaled-bounding-box-container"
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
              // Precise scale computation
              const left = Math.round(x1 * scaleX);
              const top = Math.round(y1 * scaleY);
              const width = Math.max(12, Math.round((x2 - x1) * scaleX));
              const height = Math.max(12, Math.round((y2 - y1) * scaleY));
              const isHovered = hoveredIdx === idx;
              const boxColor = isHovered ? '#ffffff' : primaryColor;

              return (
                <div
                  key={`scaled-box-${idx}`}
                  id={`overlay-box-${idx}`}
                  data-testid={`overlay-box-${idx}`}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  style={{
                    position: 'absolute',
                    left: `${left}px`,
                    top: `${top}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                    border: `2px solid ${boxColor}`,
                    backgroundColor: isHovered ? 'rgba(0, 242, 254, 0.22)' : 'rgba(0, 242, 254, 0.10)',
                    boxShadow: isHovered ? `0 0 12px ${boxColor}` : `0 0 6px ${boxColor}60`,
                    pointerEvents: 'auto',
                    cursor: 'pointer',
                    borderRadius: '2px',
                    transition: 'border-color 0.15s, background-color 0.15s',
                  }}
                >
                  {/* Floating Class + Confidence Pill */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: 0,
                      marginBottom: '2px',
                      padding: '2px 6px',
                      borderRadius: '2px',
                      backgroundColor: 'rgba(4, 9, 20, 0.92)',
                      border: `1px solid ${boxColor}`,
                      color: boxColor,
                      fontSize: '11px',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.5)',
                    }}
                  >
                    <span>{det.class.toUpperCase()}</span>
                    <span>{(det.confidence * 100).toFixed(1)}%</span>
                  </div>

                  {/* Corner Anchors */}
                  <div style={{ position: 'absolute', top: -3, left: -3, width: 6, height: 6, backgroundColor: boxColor, borderRadius: '50%' }} />
                  <div style={{ position: 'absolute', top: -3, right: -3, width: 6, height: 6, backgroundColor: boxColor, borderRadius: '50%' }} />
                  <div style={{ position: 'absolute', bottom: -3, left: -3, width: 6, height: 6, backgroundColor: boxColor, borderRadius: '50%' }} />
                  <div style={{ position: 'absolute', bottom: -3, right: -3, width: 6, height: 6, backgroundColor: boxColor, borderRadius: '50%' }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results Summary Panel (Section 9) */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Box size={18} color={primaryColor} />
            <h4 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>
              Detection Results Summary
            </h4>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {isAutoRouted && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Automatic Routing:</span>
                <span style={{ color: primaryColor, fontWeight: 700 }}>✓ {target}</span>
                {routingConfidence && (
                  <span className="mono" style={{ color: 'var(--text-secondary)' }}>
                    ({(routingConfidence * 100).toFixed(1)}%)
                  </span>
                )}
              </div>
            )}
            <div style={{ fontSize: '12px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Objects Detected: </span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{detections.length}</span>
            </div>
          </div>
        </div>

        {detections.length === 0 ? (
          <div
            id="zero-detections-message"
            data-testid="zero-detections-message"
            style={{
              padding: '24px',
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
            {detections.map((det, idx) => {
              const [x1, y1, x2, y2] = det.bbox;
              const isHovered = hoveredIdx === idx;
              return (
                <div
                  key={`det-card-${idx}`}
                  id={`detection-item-${idx}`}
                  data-testid={`detection-item-${idx}`}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '140px 120px 1fr',
                    gap: '14px',
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: isHovered ? 'rgba(0, 242, 254, 0.08)' : 'var(--bg-surface)',
                    borderRadius: 'var(--radius-sm)',
                    border: isHovered ? `1px solid ${primaryColor}` : '1px solid var(--border-subtle)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Detection Index & Class */}
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Detection #{idx + 1}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: primaryColor }}>
                      {det.class.charAt(0).toUpperCase() + det.class.slice(1)}
                    </div>
                  </div>

                  {/* Confidence */}
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Confidence
                    </div>
                    <div className="mono" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {(det.confidence * 100).toFixed(2)}%
                    </div>
                  </div>

                  {/* Bounding Box Coordinates (Original Pixel Space) */}
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Bounding Box [x1, y1, x2, y2]
                    </div>
                    <div className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      [{x1.toFixed(2)}, {y1.toFixed(2)}, {x2.toFixed(2)}, {y2.toFixed(2)}]
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
