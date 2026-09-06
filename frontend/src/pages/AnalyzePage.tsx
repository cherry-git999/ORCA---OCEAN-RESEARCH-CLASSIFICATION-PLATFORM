import React, { useState } from 'react';
import { useSonar } from '../context/SonarContext';
import { Dropzone } from '../components/upload/Dropzone';
import { ModelRoutingCard } from '../components/upload/ModelRoutingCard';
import { PipelineStepper } from '../components/upload/PipelineStepper';
import { AutoRoutingModal } from '../components/upload/AutoRoutingModal';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { PredictVisualizer } from '../components/detections/PredictVisualizer';
import { SonarScanItem } from '../types/detection';
import { ImagePreviewResult } from '../utils/imagePreview';
import { DetectionMode, PredictAutoResponse, PredictAutoRouting, PredictResponse, PredictTarget } from '../types/api';
import { predictAuto, predictImage } from '../api/predictApi';
import { ApiError } from '../api/apiClient';
import { NavRoute } from '../components/layout/Sidebar';
import { Sparkles, Loader2, Play, CheckCircle2, RotateCcw } from 'lucide-react';

interface AnalyzePageProps {
  onNavigate?: (route: NavRoute) => void;
}

export const AnalyzePage: React.FC<AnalyzePageProps> = () => {
  const { backendStatus } = useSonar();

  // Detection mode: 'auto' (default) | 'pipeline' | 'human' | 'hardware'
  const [detectionMode, setDetectionMode] = useState<DetectionMode>('auto');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImagePreviewResult | null>(null);

  // Live analysis state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [predictResult, setPredictResult] = useState<PredictResponse | null>(null);

  // Auto-routing modal state
  const [isAutoModalOpen, setIsAutoModalOpen] = useState<boolean>(false);
  const [autoRoutingData, setAutoRoutingData] = useState<PredictAutoRouting | null>(null);
  const [pendingAutoResponse, setPendingAutoResponse] = useState<PredictAutoResponse | null>(null);
  const [isAutoRouted, setIsAutoRouted] = useState<boolean>(false);
  const [routingConfidence, setRoutingConfidence] = useState<number | undefined>(undefined);

  // Unified trigger function for analysis
  const executeAnalysis = async (file: File, mode: DetectionMode) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setPredictResult(null);
    setIsAutoRouted(false);
    setRoutingConfidence(undefined);

    try {
      if (mode === 'auto') {
        // AUTOMATIC MODE: POST /predict-auto (no target field sent)
        const response = await predictAuto(file);

        if (response.routing.status === 'routed') {
          // Store response and present the Model Automatically Selected Modal BEFORE results
          setAutoRoutingData(response.routing);
          setPendingAutoResponse(response);
          setIsAutoModalOpen(true);
        } else {
          // UNCERTAIN or DEGENERATE: Open uncertain dialog with manual fallbacks (NEVER call specialist)
          setAutoRoutingData(response.routing);
          setPendingAutoResponse(response);
          setIsAutoModalOpen(true);
        }
      } else {
        // MANUAL MODE: Existing POST /predict with target=pipeline/human/hardware
        const response = await predictImage(file, mode as PredictTarget);
        setPredictResult(response);
        setIsAutoRouted(false);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 0) {
          setAnalysisError('Unable to connect to the ML backend. Please ensure the FastAPI server is running on port 8000.');
        } else if (err.status === 400) {
          setAnalysisError(err.message || 'Unable to read this image file. Please verify format.');
        } else if (err.status === 500) {
          setAnalysisError(err.message || 'Automatic analysis failed on server. Please try again.');
        } else {
          setAnalysisError(err.message || `API Error (HTTP ${err.status})`);
        }
      } else {
        setAnalysisError('An unexpected error occurred during prediction.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileSelected = (file: File, preview: ImagePreviewResult) => {
    setSelectedFile(file);
    setPreviewData(preview);
    setAnalysisError(null);
    setPredictResult(null);
    setAutoRoutingData(null);
    setPendingAutoResponse(null);

    // If in automatic mode, immediately initiate automatic analysis for smooth UX
    if (detectionMode === 'auto') {
      executeAnalysis(file, 'auto');
    }
  };

  const handleSelectSample = (sample: SonarScanItem) => {
    setDetectionMode(sample.target as DetectionMode);
    setSelectedFile(null);
    setPreviewData({
      previewUrl: sample.image.preview_url,
      width: sample.image.width,
      height: sample.image.height,
      isNetpbm: false,
      formatDescription: sample.image.format,
    });
    setAnalysisError(null);
    setPredictResult(null);
    setAutoRoutingData(null);
    setPendingAutoResponse(null);
  };

  // User manually clicks Analyze button
  const handleTriggerPredict = () => {
    if (!selectedFile || isAnalyzing) return;
    executeAnalysis(selectedFile, detectionMode);
  };

  // User clicks [ View Results ] on the Model Selected Modal
  const handleViewResults = () => {
    setIsAutoModalOpen(false);
    if (pendingAutoResponse && pendingAutoResponse.routing.status === 'routed') {
      setPredictResult({
        model: pendingAutoResponse.routing.model || 'pipeline',
        target: pendingAutoResponse.routing.target || 'Pipeline',
        detections: pendingAutoResponse.detections,
      });
      setIsAutoRouted(true);
      setRoutingConfidence(pendingAutoResponse.routing.confidence);
    }
  };

  // User chooses manual fallback from UNCERTAIN modal
  const handleFallbackManual = (target: PredictTarget) => {
    setIsAutoModalOpen(false);
    setDetectionMode(target);
    if (selectedFile) {
      executeAnalysis(selectedFile, target);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setPredictResult(null);
    setAnalysisError(null);
    setAutoRoutingData(null);
    setPendingAutoResponse(null);
    setIsAutoModalOpen(false);
    setIsAutoRouted(false);
    setRoutingConfidence(undefined);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Backend Offline Banner */}
      {backendStatus === 'offline' && (
        <ErrorAlert
          variant="warning"
          title="FastAPI Backend Offline"
          message="FastAPI service at http://127.0.0.1:8000 is not reachable. Live inference requires starting the backend."
        />
      )}

      {/* Analysis Error Alert if failed */}
      {analysisError && (
        <div id="predict-error-alert" data-testid="predict-error-alert">
          <ErrorAlert
            variant="danger"
            title="Prediction Request Failed"
            message={analysisError}
            onDismiss={() => setAnalysisError(null)}
          />
        </div>
      )}

      {/* Header Info Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(0, 242, 254, 0.05)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={18} color="var(--sonar-cyan)" />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--sonar-cyan)' }}>
              AUTOMATIC MODEL SELECTION + SPECIALIST YOLO DETECTION
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {detectionMode === 'auto'
                ? 'Automatic Mode Active: Upload any sonar/optical image (.pbm, .bpm, .png, .jpg) — model is detected automatically.'
                : `Manual Mode Active: Directing inference specifically to ${detectionMode.toUpperCase()} specialist model.`}
            </div>
          </div>
        </div>

        {predictResult && (
          <button
            onClick={handleReset}
            className="btn btn-secondary btn-sm"
            id="reset-analysis-btn"
            data-testid="reset-analysis-btn"
          >
            <RotateCcw size={14} />
            <span>New Analysis</span>
          </button>
        )}
      </div>

      {/* Analysis In-Progress Banner (Section 4 & 15) */}
      {isAnalyzing && (
        <div
          id="predict-loading-indicator"
          data-testid="predict-loading-indicator"
          className="glass-panel-elevated"
          style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            borderColor: 'var(--border-active)',
            boxShadow: 'var(--sonar-cyan-glow)',
          }}
        >
          <Loader2 size={24} color="var(--sonar-cyan)" className="sonar-ping" />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {detectionMode === 'auto'
                ? 'Analyzing image visual invariants & selecting specialist model (POST /predict-auto)...'
                : `Executing Live ${detectionMode.toUpperCase()} Specialist Prediction (POST /predict)...`}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {detectionMode === 'auto'
                ? 'Extracting color, saturation, texture, contrast, and edge density invariants.'
                : 'Dispatching to frozen specialist model on PyTorch CUDA engine.'}
            </div>
          </div>
        </div>
      )}

      {/* Prediction Visualization Result if Available */}
      {predictResult && previewData && (
        <div id="predict-results-section" data-testid="predict-results-section">
          <PredictVisualizer
            imageUrl={previewData.previewUrl}
            imageWidth={previewData.width}
            imageHeight={previewData.height}
            detections={predictResult.detections}
            model={predictResult.model}
            target={predictResult.target}
            filename={selectedFile?.name || 'sonar_scan.pbm'}
            isAutoRouted={isAutoRouted}
            routingConfidence={routingConfidence}
          />
        </div>
      )}

      {/* Upload Dropzone & Model Routing Grid */}
      <div className="grid-2">
        <div>
          <Dropzone
            onFileSelected={handleFileSelected}
            selectedFile={selectedFile}
            previewData={previewData}
            onSelectSample={handleSelectSample}
            availableSamples={[]}
            isAnalyzing={isAnalyzing}
            onTriggerAnalysis={handleTriggerPredict}
          />

          {/* Dedicated Analyze Image Action Button */}
          {selectedFile && !predictResult && (
            <div style={{ marginTop: '14px' }}>
              <button
                id="analyze-image-button"
                data-testid="analyze-image-button"
                onClick={handleTriggerPredict}
                disabled={isAnalyzing}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '14px',
                  fontWeight: 700,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 size={18} className="sonar-ping" />
                    <span>Analyzing Image...</span>
                  </>
                ) : (
                  <>
                    <Play size={18} />
                    <span>
                      {detectionMode === 'auto'
                        ? 'Run Automatic Analysis'
                        : `Analyze (${detectionMode.toUpperCase()})`}
                    </span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <ModelRoutingCard
          detectionMode={detectionMode}
          onSelectMode={(mode) => setDetectionMode(mode)}
          isAnalyzing={isAnalyzing}
        />
      </div>

      {/* Model Selection Modal (Section 5, 6, 13) */}
      <AutoRoutingModal
        isOpen={isAutoModalOpen}
        routing={autoRoutingData}
        onViewResults={handleViewResults}
        onSelectManual={handleFallbackManual}
        onClose={() => setIsAutoModalOpen(false)}
      />

      {/* 9-Stage Pipeline Stepper */}
      <PipelineStepper />
    </div>
  );
};
