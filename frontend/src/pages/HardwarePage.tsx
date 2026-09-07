import React, { useState, useEffect, useRef } from 'react';
import {
  HardDrive,
  UploadCloud,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  Wifi,
  WifiOff,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Check,
  Maximize2,
  Trash2,
  Sparkles,
  Info,
} from 'lucide-react';
import { HardwareCapture, HardwareConnectionState } from '../types/hardware';
import {
  getStoredHardwareCapture,
  setStoredHardwareCapture,
  clearStoredHardwareCapture,
} from '../utils/hardwareStorage';
import { checkHardwareConnectivity, fetchLatestHardwareCapture, HARDWARE_BASE_URL } from '../api/hardwareApi';
import { extractSonarDistance } from '../utils/sonarDistanceParser';
import { NavRoute } from '../components/layout/Sidebar';
import { LivePipelineCard } from '../components/hardware/LivePipelineCard';

interface HardwarePageProps {
  onNavigate?: (route: NavRoute) => void;
}

export const HardwarePage: React.FC<HardwarePageProps> = ({ onNavigate }) => {
  // 1. Persistent Hardware Capture State
  const [capture, setCapture] = useState<HardwareCapture | null>(() => getStoredHardwareCapture());

  // 2. Hardware Endpoint Connectivity State
  const [connectionState, setConnectionState] = useState<HardwareConnectionState>('waiting');
  const [isCheckingConnection, setIsCheckingConnection] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // 3. UI Controls
  const [isRawSonarExpanded, setIsRawSonarExpanded] = useState<boolean>(true);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [intakeError, setIntakeError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCheckConnection = async () => {
    setIsCheckingConnection(true);
    setConnectionState('checking');
    setConnectionError(null);

    const result = await checkHardwareConnectivity();
    setIsCheckingConnection(false);

    if (result.online) {
      setConnectionState('online');
    } else {
      setConnectionState('offline');
      setConnectionError(result.error || 'Connection timed out');
    }
  };

  const [isFetchingLatest, setIsFetchingLatest] = useState<boolean>(false);

  const handleFetchLatest = async () => {
    setIsFetchingLatest(true);
    setIntakeError(null);
    const result = await fetchLatestHardwareCapture();
    setIsFetchingLatest(false);

    if (result.success && result.capture) {
      setCapture(result.capture);
      setConnectionState('online');
    } else {
      setIntakeError(result.error || 'Failed to fetch latest hardware capture');
    }
  };

  // Check connectivity on component mount
  useEffect(() => {
    handleCheckConnection();
  }, []);

  // Sync state changes to localStorage
  useEffect(() => {
    setStoredHardwareCapture(capture);
  }, [capture]);

  // Process incoming files (accepts JPG and TXT as a pair)
  const processIncomingFiles = async (files: FileList | File[]) => {
    setIntakeError(null);
    const fileArray = Array.from(files);

    let jpgFile: File | undefined;
    let txtFile: File | undefined;

    for (const f of fileArray) {
      const lowerName = f.name.toLowerCase();
      if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || f.type.startsWith('image/jpeg')) {
        jpgFile = f;
      } else if (lowerName.endsWith('.txt') || f.type === 'text/plain') {
        txtFile = f;
      }
    }

    if (!jpgFile && !txtFile) {
      setIntakeError('Please provide hardware files: a .jpg image and/or a .txt sonar measurement file.');
      return;
    }

    const now = new Date().toISOString();

    // Read JPG if provided
    let imageItem = capture?.image || null;
    if (jpgFile) {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(jpgFile!);
      });

      // Probe image natural dimensions
      const dims = await new Promise<{ width: number; height: number }>((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => resolve({ width: 640, height: 640 });
        img.src = dataUrl;
      });

      imageItem = {
        filename: jpgFile.name,
        dataUrl,
        sizeBytes: jpgFile.size,
        dimensions: dims,
        fileType: 'JPEG',
        receivedAt: now,
      };
    }

    // Read TXT if provided
    let sonarItem = capture?.sonar || null;
    if (txtFile) {
      const rawText = await txtFile.text();
      const lineCount = rawText.split('\n').length;

      sonarItem = {
        filename: txtFile.name,
        rawText,
        sizeBytes: txtFile.size,
        lineCount,
        fileType: 'TXT Sonar Telemetry',
        receivedAt: now,
      };
    }

    const isCompletePair = !!(imageItem && sonarItem);

    const newCapture: HardwareCapture = {
      id: capture?.id || `HW-CAP-${Date.now().toString(36).toUpperCase()}`,
      captureNumber: (capture?.captureNumber || 0) + (isCompletePair ? 1 : 0),
      timestamp: now,
      image: imageItem,
      sonar: sonarItem,
      sourceEndpoint: HARDWARE_BASE_URL,
      status: isCompletePair ? 'received' : 'partial',
      analysisStatus: 'NOT_STARTED',
    };

    setCapture(newCapture);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processIncomingFiles(e.dataTransfer.files);
    }
  };

  const handleCopyRawSonar = () => {
    if (!capture?.sonar?.rawText) return;
    navigator.clipboard.writeText(capture.sonar.rawText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleClearCapture = () => {
    clearStoredHardwareCapture();
    setCapture(null);
    setIntakeError(null);
  };

  const handleAnalyzeHardwareCapture = () => {
    if (!capture || !capture.image) return;
    const extractedDistance = extractSonarDistance(capture.sonar?.rawText);
    const pendingPayload = {
      filename: capture.image.filename,
      dataUrl: capture.image.dataUrl,
      distance: extractedDistance,
      rawSonar: capture.sonar?.rawText || '',
      source: 'hardware',
    };
    sessionStorage.setItem('orca_pending_hardware_scan', JSON.stringify(pendingPayload));
    if (onNavigate) {
      onNavigate('analyze');
    } else {
      window.location.hash = '#/analyze';
    }
  };

  // Helper to load sample hardware capture for local verification
  const handleLoadSampleHardwareCapture = () => {
    const sampleJpgName = 'capture_1788727989.jpg';
    const sampleTxtName = 'capture_1788727989.txt';
    const sampleRawSonar = `Image: capture_1788727989.jpg\nDistance: 11.28 cm`;

    // Create a 1x1 base64 transparent pixel or SVG placeholder for sample image
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 640;
    sampleCanvas.height = 640;
    const ctx = sampleCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#06101e';
      ctx.fillRect(0, 0, 640, 640);
      ctx.strokeStyle = '#00f2fe';
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 20, 600, 600);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 20px monospace';
      ctx.fillText('ORCA HARDWARE LIVE FEED — [capture_1788727989.jpg]', 40, 60);
      ctx.fillStyle = '#64748b';
      ctx.font = '14px monospace';
      ctx.fillText(`Acoustic Optical Sensor • 640x640px • ${new Date().toLocaleTimeString()}`, 40, 90);
    }
    const sampleDataUrl = sampleCanvas.toDataURL('image/jpeg');

    const now = new Date().toISOString();
    setCapture({
      id: `HW-CAP-${Date.now().toString(36).toUpperCase()}`,
      captureNumber: 1,
      timestamp: now,
      image: {
        filename: sampleJpgName,
        dataUrl: sampleDataUrl,
        sizeBytes: 48210,
        dimensions: { width: 640, height: 640 },
        fileType: 'JPEG',
        receivedAt: now,
      },
      sonar: {
        filename: sampleTxtName,
        rawText: sampleRawSonar,
        sizeBytes: sampleRawSonar.length,
        lineCount: sampleRawSonar.split('\n').length,
        fileType: 'TXT Sonar Telemetry',
        receivedAt: now,
      },
      sourceEndpoint: HARDWARE_BASE_URL,
      status: 'received',
      analysisStatus: 'NOT_STARTED',
    });
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* 1. Header Section */}
      <div
        className="glass-panel"
        style={{
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(0, 242, 254, 0.1)',
              border: '1px solid var(--sonar-cyan)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--sonar-cyan)',
              boxShadow: 'var(--sonar-cyan-glow)',
            }}
          >
            <HardDrive size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  margin: 0,
                  color: 'var(--text-primary)',
                  textTransform: 'uppercase',
                }}
              >
                HARDWARE
              </h1>
              <span className="badge badge-cyan" style={{ fontSize: '10px' }}>
                PHYSICAL INTAKE
              </span>
            </div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--sonar-cyan)', margin: '2px 0 0 0' }}>
              Physical Hardware Capture & Sonar Intake
            </p>
            <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Receive and monitor image and sonar data transmitted from the connected underwater hardware system.
            </p>
          </div>
        </div>

        {/* Quick Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {capture?.image && (
            <button
              id="analyze-hardware-capture-btn-top"
              data-testid="analyze-hardware-capture-btn-top"
              onClick={handleAnalyzeHardwareCapture}
              className="btn btn-primary btn-sm"
              style={{
                background: 'linear-gradient(135deg, #00f2fe 0%, #0284c7 100%)',
                color: '#030712',
                fontWeight: 700,
                boxShadow: '0 0 16px rgba(0, 242, 254, 0.4)',
              }}
            >
              <Sparkles size={14} />
              <span>Analyze with ORCA AI →</span>
            </button>
          )}
          {capture && (
            <button onClick={handleClearCapture} className="btn btn-ghost btn-sm" style={{ color: 'var(--status-rose)' }}>
              <Trash2 size={14} />
              <span>Clear Capture</span>
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-primary btn-sm"
          >
            <UploadCloud size={15} />
            <span>Ingest Hardware Files</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".jpg,.jpeg,.txt"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                processIncomingFiles(e.target.files);
              }
            }}
          />
        </div>
      </div>

      {/* 2. Hardware Source Status Card */}
      <div
        id="hardware-source-status-card"
        data-testid="hardware-source-status-card"
        className="glass-panel"
        style={{
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          borderLeft: `4px solid ${
            connectionState === 'online'
              ? 'var(--status-emerald)'
              : connectionState === 'checking'
              ? 'var(--sonar-cyan)'
              : 'var(--status-amber)'
          }`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {connectionState === 'online' ? (
            <Wifi size={20} color="var(--status-emerald)" />
          ) : connectionState === 'checking' ? (
            <RefreshCw size={20} className="animate-spin" color="var(--sonar-cyan)" />
          ) : (
            <WifiOff size={20} color="var(--status-amber)" />
          )}

          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              HARDWARE SOURCE
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Endpoint:</span>
              <code className="mono" style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600 }}>
                {HARDWARE_BASE_URL.replace(/^https?:\/\//, '')}
              </code>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>/upload</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right', textTransform: 'uppercase' }}>
              SOURCE STATUS
            </div>
            <div style={{ marginTop: '2px' }}>
              {connectionState === 'online' ? (
                <span className="badge badge-emerald">HARDWARE ENDPOINT ONLINE</span>
              ) : connectionState === 'checking' ? (
                <span className="badge badge-cyan">CHECKING CONNECTIVITY...</span>
              ) : (
                <span className="badge badge-amber" title={connectionError || undefined}>WAITING FOR HARDWARE DATA</span>
              )}
            </div>
          </div>

          <button
            onClick={handleCheckConnection}
            disabled={isCheckingConnection}
            className="btn btn-secondary btn-sm"
            title={`Ping ${HARDWARE_BASE_URL}/`}
          >
            <RefreshCw size={13} className={isCheckingConnection ? 'animate-spin' : ''} />
            <span>Check Connectivity</span>
          </button>

          <button
            id="fetch-latest-hardware-btn"
            data-testid="fetch-latest-hardware-btn"
            onClick={handleFetchLatest}
            disabled={isFetchingLatest}
            className="btn btn-primary btn-sm"
            title={`Fetch latest capture from ${HARDWARE_BASE_URL}/latest`}
          >
            <RefreshCw size={13} className={isFetchingLatest ? 'animate-spin' : ''} />
            <span>{isFetchingLatest ? 'Fetching...' : 'Fetch Latest (GET /latest)'}</span>
          </button>
        </div>
      </div>

      {intakeError && (
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid var(--status-rose)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '12px',
            color: '#fda4af',
          }}
        >
          <AlertCircle size={16} color="var(--status-rose)" style={{ flexShrink: 0 }} />
          <span>{intakeError}</span>
        </div>
      )}

      {/* 2.5 Live Data Pipeline Flow Component */}
      <LivePipelineCard
        connectionState={connectionState}
        hasCapture={!!capture}
      />

      {/* 3. Empty State (When no hardware capture received yet) */}
      {!capture && (
        <div
          id="hardware-empty-state-panel"
          data-testid="hardware-empty-state-panel"
          className="glass-panel"
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            border: dragActive ? '2px dashed var(--sonar-cyan)' : '1px dashed var(--border-medium)',
            background: dragActive ? 'rgba(0, 242, 254, 0.05)' : 'var(--bg-glass-heavy)',
            transition: 'all 0.2s ease',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <HardDrive size={32} />
          </div>

          <div>
            <h2
              style={{
                fontSize: '16px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                color: 'var(--text-primary)',
                textTransform: 'uppercase',
                margin: '0 0 6px 0',
              }}
            >
              LATEST HARDWARE CAPTURE
            </h2>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              No hardware capture received yet.
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(0, 242, 254, 0.04)',
                border: '1px solid rgba(0, 242, 254, 0.15)',
                fontSize: '12px',
                color: 'var(--text-muted)',
              }}
            >
              <span>Waiting for:</span>
              <strong style={{ color: 'var(--sonar-cyan)' }}>JPG image</strong>
              <span>+</span>
              <strong style={{ color: '#38bdf8' }}>TXT sonar data</strong>
            </div>
          </div>

          {/* Drag & Drop Intake Target */}
          <div
            style={{
              maxWidth: '480px',
              width: '100%',
              marginTop: '10px',
              padding: '18px',
              background: 'rgba(7, 14, 28, 0.6)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Drop hardware files (<strong>.jpg</strong> + <strong>.txt</strong>) here or select from machine:
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary btn-sm"
              >
                <UploadCloud size={14} />
                <span>Select Hardware Files (.jpg / .txt)</span>
              </button>

              <button
                id="load-sample-hardware-btn"
                data-testid="load-sample-hardware-btn"
                onClick={handleLoadSampleHardwareCapture}
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--sonar-cyan)', border: '1px solid rgba(0, 242, 254, 0.3)' }}
              >
                <Sparkles size={14} />
                <span>Load Sample Hardware Pair (clip_009)</span>
              </button>
            </div>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '520px', lineHeight: '1.5' }}>
            When the physical hardware system transmits data to <code className="mono">10.169.191.69:5000/upload</code> or
            files are ingested here, the paired JPG image and raw TXT sonar data will render together as a unified capture.
          </div>
        </div>
      )}

      {/* 4. Received State: Display Unified Hardware Capture */}
      {capture && (
        <div
          id="hardware-capture-received-view"
          data-testid="hardware-capture-received-view"
          style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
        >
          {/* Top Banner: Pairing Notification */}
          <div
            className="glass-panel"
            style={{
              padding: '14px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.08) 0%, rgba(0, 242, 254, 0.06) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid var(--status-emerald)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--status-emerald)',
                }}
              >
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
                  HARDWARE CAPTURE {capture.captureNumber ? `#00${capture.captureNumber}` : `#001`}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px', fontSize: '11px' }}>
                  <span style={{ color: capture.image ? 'var(--status-emerald)' : 'var(--status-amber)' }}>
                    {capture.image ? '✓ Image received' : 'Waiting for image'}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>•</span>
                  <span style={{ color: capture.sonar ? 'var(--status-emerald)' : 'var(--status-amber)' }}>
                    {capture.sonar ? '✓ Sonar data received' : 'Waiting for sonar data'}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>•</span>
                  <span className="mono" style={{ color: 'var(--text-muted)' }}>
                    Captured: {new Date(capture.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span className="badge badge-emerald" style={{ fontSize: '11px' }}>
                CAPTURE RECEIVED
              </span>
              {capture.image && (
                <button
                  id="analyze-hardware-capture-btn"
                  data-testid="analyze-hardware-capture-btn"
                  onClick={handleAnalyzeHardwareCapture}
                  className="btn btn-primary btn-sm"
                  style={{
                    background: 'linear-gradient(135deg, #00f2fe 0%, #0284c7 100%)',
                    color: '#030712',
                    fontWeight: 700,
                    boxShadow: '0 0 14px rgba(0, 242, 254, 0.35)',
                  }}
                >
                  <Sparkles size={14} />
                  <span>Analyze Hardware Capture with ORCA AI →</span>
                </button>
              )}
            </div>
          </div>

          {/* Side-by-Side Dual Panels: JPG Image + TXT Sonar Measurement Data */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
              gap: '20px',
              alignItems: 'start',
            }}
          >
            {/* Panel 1: HARDWARE IMAGE */}
            <div
              id="hardware-image-panel"
              data-testid="hardware-image-panel"
              className="glass-panel"
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ImageIcon size={18} color="var(--sonar-cyan)" />
                  <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, letterSpacing: '0.04em' }}>
                    HARDWARE IMAGE
                  </h3>
                </div>
                <span className={`badge ${capture.image ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '10px' }}>
                  {capture.image ? 'RECEIVED' : 'WAITING FOR IMAGE'}
                </span>
              </div>

              {capture.image ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Actual JPG Preview */}
                  <div
                    style={{
                      position: 'relative',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      border: '1px solid var(--border-medium)',
                      background: '#040812',
                      minHeight: '280px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      src={capture.image.dataUrl}
                      alt={capture.image.filename}
                      style={{
                        width: '100%',
                        maxHeight: '380px',
                        objectFit: 'contain',
                        display: 'block',
                      }}
                    />

                    <button
                      onClick={() => setIsImageModalOpen(true)}
                      className="btn btn-secondary btn-xs"
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        backdropFilter: 'blur(6px)',
                        background: 'rgba(7, 14, 28, 0.85)',
                      }}
                      title="View Full-Size JPG"
                    >
                      <Maximize2 size={12} />
                      <span>Full View</span>
                    </button>
                  </div>

                  {/* Image Metadata Grid */}
                  <div
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                      fontSize: '11px',
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Filename:</span>
                      <div className="mono" style={{ color: 'var(--sonar-cyan)', fontWeight: 600, wordBreak: 'break-all' }}>
                        {capture.image.filename}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>File Type:</span>
                      <div className="mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        {capture.image.fileType}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Dimensions:</span>
                      <div className="mono" style={{ color: 'var(--text-primary)' }}>
                        {capture.image.dimensions
                          ? `${capture.image.dimensions.width} × ${capture.image.dimensions.height} px`
                          : 'Standard 640 × 640 px'}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Size:</span>
                      <div className="mono" style={{ color: 'var(--text-primary)' }}>
                        {(capture.image.sizeBytes / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Operational image input received from hardware. (No training labels required).
                  </div>
                </div>
              ) : (
                <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <ImageIcon size={32} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                  <div style={{ fontSize: '12px' }}>Waiting for .jpg image from hardware...</div>
                </div>
              )}
            </div>

            {/* Panel 2: SONAR MEASUREMENT DATA */}
            <div
              id="hardware-sonar-panel"
              data-testid="hardware-sonar-panel"
              className="glass-panel"
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} color="#38bdf8" />
                  <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, letterSpacing: '0.04em' }}>
                    SONAR MEASUREMENT DATA
                  </h3>
                </div>
                <span className={`badge ${capture.sonar ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '10px' }}>
                  {capture.sonar ? 'RECEIVED' : 'WAITING FOR TXT'}
                </span>
              </div>

              {capture.sonar ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Sonar File Metadata Card */}
                  <div
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Sonar File
                      </div>
                      <div className="mono" style={{ fontSize: '13px', color: '#38bdf8', fontWeight: 700 }}>
                        {capture.sonar.filename}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {capture.sonar.lineCount} lines • {(capture.sonar.sizeBytes / 1024).toFixed(1)} KB
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={handleCopyRawSonar}
                        className="btn btn-ghost btn-xs"
                        style={{ fontSize: '10px' }}
                      >
                        {copiedText ? <Check size={12} color="var(--status-emerald)" /> : <Copy size={12} />}
                        <span>{copiedText ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button
                        onClick={() => setIsRawSonarExpanded(!isRawSonarExpanded)}
                        className="btn btn-secondary btn-xs"
                        style={{ fontSize: '10px' }}
                      >
                        {isRawSonarExpanded ? <EyeOff size={12} /> : <Eye size={12} />}
                        <span>{isRawSonarExpanded ? 'Collapse' : 'Expand'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Sonar Distance Extraction Telemetry */}
                  {capture.sonar && (
                    <div
                      id="hardware-extracted-distance-badge"
                      style={{
                        background: 'rgba(0, 242, 254, 0.08)',
                        border: '1px solid rgba(0, 242, 254, 0.28)',
                        borderRadius: 'var(--radius-xs)',
                        padding: '10px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={14} color="var(--sonar-cyan)" />
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Extracted Sonar Object Distance:
                        </span>
                      </div>
                      <span
                        className="mono"
                        style={{
                          fontSize: '14px',
                          fontWeight: 800,
                          color: 'var(--sonar-cyan)',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {extractSonarDistance(capture.sonar.rawText) || 'No distance metric detected'}
                      </span>
                    </div>
                  )}

                  {/* Raw TXT Viewer */}
                  {isRawSonarExpanded && capture.sonar && (
                    <div
                      id="raw-sonar-data-viewer"
                      data-testid="raw-sonar-data-viewer"
                      style={{
                        background: '#040812',
                        border: '1px solid var(--border-medium)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '14px',
                        maxHeight: '320px',
                        overflowY: 'auto',
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: '11.5px',
                        lineHeight: '1.6',
                        color: '#cbd5e1',
                        whiteSpace: 'pre-wrap',
                        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6)',
                      }}
                    >
                      {capture.sonar.rawText}
                    </div>
                  )}

                  {/* Hardware Telemetry Link Banner */}
                  <div
                    style={{
                      background: 'rgba(0, 242, 254, 0.04)',
                      border: '1px solid rgba(0, 242, 254, 0.18)',
                      borderRadius: 'var(--radius-xs)',
                      padding: '10px 12px',
                      display: 'flex',
                      gap: '8px',
                      fontSize: '11px',
                      color: '#7dd3fc',
                      lineHeight: '1.4',
                    }}
                  >
                    <Info size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong>Hardware Telemetry Linked:</strong> Raw acoustic slant range extracted directly from physical hardware.
                      Forwarding this capture will include the <strong>Distance of the Object</strong> in the mission report.
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <FileText size={32} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                  <div style={{ fontSize: '12px' }}>Waiting for .txt sonar data from hardware...</div>
                </div>
              )}
            </div>
          </div>

          {/* 5. Capture Status & Analysis Status Overview */}
          <div
            className="glass-panel"
            style={{
              padding: '18px 22px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
            }}
          >
            {/* Image Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2
                size={22}
                color={capture.image ? 'var(--status-emerald)' : 'var(--text-muted)'}
              />
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  IMAGE INTAKE
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: capture.image ? '#34d399' : '#64748b' }}>
                  {capture.image ? '✓ Received' : 'Waiting for Image'}
                </div>
              </div>
            </div>

            {/* Sonar Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2
                size={22}
                color={capture.sonar ? 'var(--status-emerald)' : 'var(--text-muted)'}
              />
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  SONAR DATA INTAKE
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: capture.sonar ? '#34d399' : '#64748b' }}>
                  {capture.sonar ? '✓ Received' : 'Waiting for TXT Data'}
                </div>
              </div>
            </div>

            {/* Analysis Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sparkles size={22} color={capture.image ? 'var(--sonar-cyan)' : 'var(--status-amber)'} />
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  ANALYSIS PIPELINE
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: capture.image ? 'var(--sonar-cyan)' : '#fbbf24' }}>
                  {capture.image ? 'READY TO ANALYZE' : 'WAITING FOR IMAGE'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  {capture.image ? 'Ready to forward image + distance' : 'Requires .jpg image file'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Full-Size JPG View */}
      {isImageModalOpen && capture?.image && (
        <div
          onClick={() => setIsImageModalOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(3, 7, 18, 0.95)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-active)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="mono" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--sonar-cyan)' }}>
                {capture.image.filename}
              </div>
              <button onClick={() => setIsImageModalOpen(false)} className="btn btn-ghost btn-xs">
                Close [ESC]
              </button>
            </div>
            <img
              src={capture.image.dataUrl}
              alt={capture.image.filename}
              style={{
                maxWidth: '100%',
                maxHeight: '75vh',
                objectFit: 'contain',
                borderRadius: 'var(--radius-xs)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
