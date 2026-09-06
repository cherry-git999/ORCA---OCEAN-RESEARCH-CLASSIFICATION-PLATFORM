import React, { useState, useRef, useEffect } from 'react';
import { Detection } from '../../types/detection';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Crosshair, Eye, ShieldAlert } from 'lucide-react';

interface SonarImageViewerProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  detections: Detection[];
  selectedAnomalyId: string | null;
  onSelectAnomaly: (id: string) => void;
  isRawView: boolean;
  isLiveAnalysis?: boolean;
}

export const SonarImageViewer: React.FC<SonarImageViewerProps> = ({
  imageUrl,
  imageWidth,
  imageHeight,
  detections,
  selectedAnomalyId,
  onSelectAnomaly,
  isRawView,
  isLiveAnalysis = false,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredAnomalyId, setHoveredAnomalyId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev * 1.25, 4.0));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev / 1.25, 0.4));

  const handleFit = () => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth - 32;
    const containerHeight = containerRef.current.clientHeight - 32;
    if (containerWidth > 0 && containerHeight > 0 && imageWidth > 0 && imageHeight > 0) {
      const fitZoom = Math.min(containerWidth / imageWidth, containerHeight / imageHeight, 1.0);
      setZoom(Math.max(fitZoom, 0.1));
      setPan({ x: 0, y: 0 });
    }
  };

  const focusOnAnomaly = (anomalyId: string) => {
    const det = detections.find((d) => d.id === anomalyId);
    if (!det || !containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth - 40;
    const containerHeight = containerRef.current.clientHeight - 40;
    if (containerWidth <= 0 || containerHeight <= 0) return;

    const boxWidth = Math.abs(det.bbox.x2 - det.bbox.x1);
    const boxHeight = Math.abs(det.bbox.y2 - det.bbox.y1);
    const boxCenterX = (det.bbox.x1 + det.bbox.x2) / 2;
    const boxCenterY = (det.bbox.y1 + det.bbox.y2) / 2;

    // Calculate target zoom for comfortable close inspection of detection
    const zoomX = containerWidth / Math.max(boxWidth * 2.2, 350);
    const zoomY = containerHeight / Math.max(boxHeight * 2.2, 220);
    const targetZoom = Math.min(Math.max(Math.min(zoomX, zoomY), 0.45), 2.5);

    // Pan calculation relative to center-center transformOrigin
    const panX = -(boxCenterX - imageWidth / 2) * targetZoom;
    const panY = -(boxCenterY - imageHeight / 2) * targetZoom;

    setZoom(targetZoom);
    setPan({ x: panX, y: panY });
  };

  const handleReset = () => {
    if (selectedAnomalyId) {
      focusOnAnomaly(selectedAnomalyId);
    } else {
      handleFit();
    }
  };

  useEffect(() => {
    if (selectedAnomalyId) {
      focusOnAnomaly(selectedAnomalyId);
    } else {
      handleFit();
    }
  }, [imageUrl, imageWidth, imageHeight, selectedAnomalyId]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start drag if left click and not on a bounding box button
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.88;
    setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.4), 4.0));
  };

  return (
    <div className="glass-panel" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Top Toolbar */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--bg-glass-heavy)',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Crosshair size={16} color="var(--sonar-cyan)" />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>ACOUSTIC SONAR VIEWPORT</span>
          </div>
          <span className="badge badge-cyan" style={{ fontSize: '10px' }}>
            {imageWidth} × {imageHeight} PX
          </span>
          {isRawView ? (
            <span className="badge badge-amber" style={{ fontSize: '10px' }}>
              RAW CANDIDATES ({detections.length})
            </span>
          ) : (
            <span className="badge badge-emerald" style={{ fontSize: '10px' }}>
              FILTERED DETECTIONS ({detections.length})
            </span>
          )}
        </div>

        {/* Zoom & Viewport Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: '4px' }}>
            {Math.round(zoom * 100)}%
          </span>

          {selectedAnomalyId && (
            <button
              id="btn-focus-anomaly"
              onClick={() => focusOnAnomaly(selectedAnomalyId)}
              className="btn btn-primary btn-sm"
              style={{ padding: '4px 8px', fontSize: '11px', gap: '4px' }}
              title="Focus and Center Viewport on Selected Detection"
            >
              <Crosshair size={13} />
              <span>Center Target</span>
            </button>
          )}

          <button onClick={handleZoomIn} className="btn btn-secondary btn-icon" title="Zoom In (Wheel Up)">
            <ZoomIn size={14} />
          </button>
          <button onClick={handleZoomOut} className="btn btn-secondary btn-icon" title="Zoom Out (Wheel Down)">
            <ZoomOut size={14} />
          </button>
          <button onClick={handleFit} className="btn btn-secondary btn-icon" title="Fit Entire Swath to Screen">
            <Maximize2 size={14} />
          </button>
          <button onClick={handleReset} className="btn btn-secondary btn-icon" title="Reset View / Refocus Anomaly">
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          flex: 1,
          minHeight: '380px',
          background: '#030712',
          overflow: 'hidden',
          position: 'relative',
          cursor: isDragging ? 'grabbing' : 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Sonar Scan Grid Overlay Background */}
        <div className="sonar-grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none' }} />

        {/* Scaled and Panned Canvas Container */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            position: 'relative',
            width: `${imageWidth}px`,
            height: `${imageHeight}px`,
            userSelect: 'none',
            flexShrink: 0,
          }}
        >
          {/* Underlying Sonar Image */}
          <img
            src={imageUrl}
            alt="Side-Scan Sonar Scan"
            draggable={false}
            style={{
              width: `${imageWidth}px`,
              height: `${imageHeight}px`,
              display: 'block',
              pointerEvents: 'none',
              borderRadius: '2px',
            }}
          />

          {/* SVG Bounding Box Layer */}
          <svg
            viewBox={`0 0 ${imageWidth} ${imageHeight}`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'auto',
            }}
          >
            <defs>
              <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="glow-amber" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Adaptive Visual Scale Factors for Sonar Swaths */}
            {(() => {
              const maxDim = Math.max(imageWidth, imageHeight, 640);
              const baseStroke = Math.max(3, Math.round(maxDim / 450));
              const outerStroke = baseStroke + Math.max(2, Math.round(baseStroke * 0.5));
              const fontSize = Math.max(13, Math.round(maxDim / 85));
              const cornerRadius = Math.max(2, Math.round(baseStroke * 0.8));
              const cornerCircleR = Math.max(3, Math.round(baseStroke * 0.9));
              const pillH = Math.round(fontSize * 1.55);
              const textPadX = Math.round(fontSize * 0.4);
              const textOffsetY = Math.round(fontSize * 1.1);

              return detections.map((det) => {
                const isSelected = selectedAnomalyId === det.id;
                const isHovered = hoveredAnomalyId === det.id;

                const x = Math.min(det.bbox.x1, det.bbox.x2);
                const y = Math.min(det.bbox.y1, det.bbox.y2);
                const width = Math.abs(det.bbox.x2 - det.bbox.x1);
                const height = Math.abs(det.bbox.y2 - det.bbox.y1);

                let boxColor = '#00f2fe';
                if (det.confidence >= 0.8) {
                  boxColor = '#10b981';
                } else if (det.confidence >= 0.5) {
                  boxColor = '#00f2fe';
                } else {
                  boxColor = '#f59e0b';
                }

                if (isSelected) {
                  boxColor = '#00f2fe';
                }

                const currentStroke = isSelected ? baseStroke * 1.5 : isHovered ? baseStroke * 1.25 : baseStroke;
                const labelText = `${det.id} [${det.class_name}] ${Math.round(det.confidence * 100)}%`;
                const approxPillW = Math.max(width, labelText.length * fontSize * 0.65 + textPadX * 2);

                // Position tag pill: above box if space permits, else inside top of box
                let pillY = y - pillH - currentStroke;
                if (pillY < 0) {
                  pillY = y + currentStroke + 2;
                }
                let pillX = x;
                if (pillX + approxPillW > imageWidth) {
                  pillX = Math.max(0, imageWidth - approxPillW - 2);
                }

                return (
                  <g
                    key={det.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAnomaly(det.id);
                    }}
                    onMouseEnter={() => setHoveredAnomalyId(det.id)}
                    onMouseLeave={() => setHoveredAnomalyId(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* 1. Outer High-Contrast Dark Outline for 100% Visibility on all Seabeds */}
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      fill="none"
                      stroke="rgba(0, 0, 0, 0.85)"
                      strokeWidth={outerStroke}
                      rx={cornerRadius}
                    />

                    {/* 2. Main High-Visibility Bounding Box */}
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      fill={isSelected ? 'rgba(0, 242, 254, 0.22)' : isHovered ? 'rgba(0, 242, 254, 0.12)' : 'transparent'}
                      stroke={boxColor}
                      strokeWidth={currentStroke}
                      strokeDasharray={isSelected ? 'none' : isHovered ? `${baseStroke * 2} ${baseStroke}` : 'none'}
                      filter={isSelected ? 'url(#glow-cyan)' : 'none'}
                      rx={cornerRadius}
                    />

                    {/* 3. Corner Accent Markers */}
                    <circle cx={x} cy={y} r={isSelected ? cornerCircleR * 1.4 : cornerCircleR} fill={boxColor} stroke="rgba(0,0,0,0.8)" strokeWidth={Math.max(1, baseStroke * 0.3)} />
                    <circle cx={x + width} cy={y} r={isSelected ? cornerCircleR * 1.4 : cornerCircleR} fill={boxColor} stroke="rgba(0,0,0,0.8)" strokeWidth={Math.max(1, baseStroke * 0.3)} />
                    <circle cx={x} cy={y + height} r={isSelected ? cornerCircleR * 1.4 : cornerCircleR} fill={boxColor} stroke="rgba(0,0,0,0.8)" strokeWidth={Math.max(1, baseStroke * 0.3)} />
                    <circle cx={x + width} cy={y + height} r={isSelected ? cornerCircleR * 1.4 : cornerCircleR} fill={boxColor} stroke="rgba(0,0,0,0.8)" strokeWidth={Math.max(1, baseStroke * 0.3)} />

                    {/* 4. Adaptive High-Contrast Detection Tag / Badge */}
                    <g transform={`translate(${pillX}, ${pillY})`}>
                      <rect
                        x={0}
                        y={0}
                        width={approxPillW}
                        height={pillH}
                        fill="#050c18"
                        stroke={boxColor}
                        strokeWidth={Math.max(1.5, Math.round(baseStroke * 0.5))}
                        rx={Math.max(2, cornerRadius * 0.8)}
                        opacity={isSelected || isHovered ? 0.98 : 0.92}
                      />
                      <text
                        x={textPadX}
                        y={textOffsetY}
                        fill="#f8fafc"
                        fontSize={fontSize}
                        fontFamily="var(--font-mono)"
                        fontWeight="700"
                        letterSpacing="0.02em"
                      >
                        {labelText}
                      </text>
                    </g>
                  </g>
                );
              });
            })()}
          </svg>
        </div>

        {/* Detection Watermark Overlay */}
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '14px',
          background: 'rgba(7, 14, 28, 0.88)',
          border: '1px solid rgba(0, 242, 254, 0.3)',
          borderRadius: 'var(--radius-xs)',
          padding: '6px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          pointerEvents: 'none',
        }}>
          <span className="status-dot online" />
          <span className="mono" style={{ fontSize: '10px', color: 'var(--sonar-cyan)', fontWeight: 600 }}>
            OBJECT DETECTION: {detections.length} {detections.length === 1 ? 'CANDIDATE' : 'CANDIDATES'}
          </span>
        </div>

        {/* Navigation Hint */}
        <div style={{
          position: 'absolute',
          bottom: '12px',
          right: '14px',
          fontSize: '11px',
          color: 'var(--text-muted)',
          background: 'rgba(7, 14, 28, 0.75)',
          padding: '4px 8px',
          borderRadius: 'var(--radius-xs)',
          pointerEvents: 'none',
        }}>
          Scroll to zoom • Drag to pan • Click box to select
        </div>
      </div>
    </div>
  );
};
