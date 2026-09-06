import React, { useState } from 'react';
import { useSonar } from '../context/SonarContext';
import { Dropzone } from '../components/upload/Dropzone';
import { ModelRoutingCard } from '../components/upload/ModelRoutingCard';
import { AutoRoutingModal } from '../components/upload/AutoRoutingModal';
import { AnalysisPipelineTransitionModal } from '../components/upload/AnalysisPipelineTransitionModal';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { SonarScanItem } from '../types/detection';
import { ImagePreviewResult } from '../utils/imagePreview';
import { DetectionMode, PredictAutoResponse, PredictAutoRouting, PredictResponse, PredictTarget } from '../types/api';
import { predictAuto, predictImage } from '../api/predictApi';
import { ApiError } from '../api/apiClient';
import { NavRoute } from '../components/layout/Sidebar';
import { Sparkles, Loader2 } from 'lucide-react';
import { getWaterCoordinatesForScan } from '../utils/geoCoordinates';

interface AnalyzePageProps {
  onNavigate?: (route: NavRoute) => void;
}

export const AnalyzePage: React.FC<AnalyzePageProps> = ({ onNavigate }) => {
  const { backendStatus, addUploadedScan } = useSonar();

  // Detection mode: 'auto' (default) | 'pipeline' | 'human' | 'hardware'
  const [detectionMode, setDetectionMode] = useState<DetectionMode>('auto');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImagePreviewResult | null>(null);

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Auto-routing modals state
  const [isAutoModalOpen, setIsAutoModalOpen] = useState<boolean>(false);
  const [isPipelineTransitionOpen, setIsPipelineTransitionOpen] = useState<boolean>(false);
  const [autoRoutingData, setAutoRoutingData] = useState<PredictAutoRouting | null>(null);
  const [pendingAutoResponse, setPendingAutoResponse] = useState<PredictAutoResponse | null>(null);
  const [pendingManualResponse, setPendingManualResponse] = useState<PredictResponse | null>(null);

  // Unified trigger function for analysis
  const executeAnalysis = async (file: File, mode: DetectionMode) => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      if (mode === 'auto') {
        // AUTOMATIC MODE: POST /predict-auto
        const response = await predictAuto(file);
        setAutoRoutingData(response.routing);
        setPendingAutoResponse(response);
        setIsAutoModalOpen(true);
      } else {
        // MANUAL MODE: POST /predict with target=pipeline/human/hardware
        const response = await predictImage(file, mode as PredictTarget);
        setPendingManualResponse(response);
        // Directly show pipeline completion transition for manual mode
        setIsPipelineTransitionOpen(true);
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
    setAutoRoutingData(null);
    setPendingAutoResponse(null);
    setPendingManualResponse(null);

    // In auto mode, trigger automatic analysis for smooth operational flow
    if (detectionMode === 'auto') {
      executeAnalysis(file, 'auto');
    }
  };

  const handleTriggerPredict = () => {
    if (!selectedFile || isAnalyzing) return;
    executeAnalysis(selectedFile, detectionMode);
  };

  // User clicks [ Continue ] on Model Selection Modal -> Transition to Analysis Pipeline UI
  const handleAcknowledgeModelSelection = () => {
    setIsAutoModalOpen(false);
    setIsPipelineTransitionOpen(true);
  };

  // User clicks [ Continue to Detection Workspace ] on Analysis Pipeline UI -> Navigate to workspace
  const handleTransitionToWorkspace = () => {
    setIsPipelineTransitionOpen(false);

    if (!selectedFile || !previewData) return;

    if (pendingAutoResponse && pendingAutoResponse.routing.status === 'routed') {
      const routing = pendingAutoResponse.routing;
      const targetStr = (routing.target || routing.model || 'pipeline').toLowerCase();
      const scanId = `SCAN_${targetStr.toUpperCase()}_${Date.now().toString().slice(-4)}`;

      const scanItem: SonarScanItem = {
        id: scanId,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
        target: targetStr,
        model_name: routing.target ? `${routing.target} Detection Model` : 'Specialist Model',
        status: 'Complete',
        mission_id: `TRANSECT_${Date.now().toString().slice(-5)}`,
        image: {
          filename: selectedFile.name,
          width: previewData.width,
          height: previewData.height,
          size_kb: Math.round(selectedFile.size / 1024),
          format: selectedFile.name.split('.').pop()?.toUpperCase() || 'SCAN',
          preview_url: previewData.previewUrl,
        },
        detections: pendingAutoResponse.detections.map((d, idx) => ({
          id: `ANM-${String(idx + 1).padStart(3, '0')}`,
          class_name: d.class,
          confidence: d.confidence,
          bbox: {
            x1: d.bbox[0],
            y1: d.bbox[1],
            x2: d.bbox[2],
            y2: d.bbox[3],
          },
          model: routing.target ? `${routing.target} Specialist` : 'Specialist Model',
          review_status: d.confidence >= 0.8 ? 'confirmed' : 'pending',
        })),
        location: getWaterCoordinatesForScan(selectedFile.name),
        rawFile: selectedFile,
        routingConfidence: routing.confidence,
        isAutoRouted: true,
      };

      addUploadedScan(scanItem);

      if (onNavigate) {
        onNavigate('detections');
      }
    } else if (pendingManualResponse) {
      const targetStr = pendingManualResponse.target.toLowerCase();
      const scanId = `SCAN_${targetStr.toUpperCase()}_${Date.now().toString().slice(-4)}`;

      const scanItem: SonarScanItem = {
        id: scanId,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
        target: targetStr,
        model_name: `${pendingManualResponse.target} Detection Model`,
        status: 'Complete',
        mission_id: `TRANSECT_${Date.now().toString().slice(-5)}`,
        image: {
          filename: selectedFile.name,
          width: previewData.width,
          height: previewData.height,
          size_kb: Math.round(selectedFile.size / 1024),
          format: selectedFile.name.split('.').pop()?.toUpperCase() || 'SCAN',
          preview_url: previewData.previewUrl,
        },
        detections: pendingManualResponse.detections.map((d, idx) => ({
          id: `ANM-${String(idx + 1).padStart(3, '0')}`,
          class_name: d.class,
          confidence: d.confidence,
          bbox: {
            x1: d.bbox[0],
            y1: d.bbox[1],
            x2: d.bbox[2],
            y2: d.bbox[3],
          },
          model: `${pendingManualResponse.target} Specialist`,
          review_status: d.confidence >= 0.8 ? 'confirmed' : 'pending',
        })),
        location: getWaterCoordinatesForScan(selectedFile.name),
        rawFile: selectedFile,
        isAutoRouted: false,
      };

      addUploadedScan(scanItem);

      if (onNavigate) {
        onNavigate('detections');
      }
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

  const activeTargetName = pendingAutoResponse?.routing.target || pendingManualResponse?.target || 'Hardware';
  const activeModelName = pendingAutoResponse?.routing.model || pendingManualResponse?.model || 'Hardware';
  const activeDetectionsCount = pendingAutoResponse?.detections.length ?? pendingManualResponse?.detections.length ?? 0;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Backend Offline Alert */}
      {backendStatus === 'offline' && (
        <ErrorAlert
          variant="warning"
          title="FastAPI Backend Offline"
          message="FastAPI service at http://127.0.0.1:8000 is unreachable. Analysis requires running the backend server."
        />
      )}

      {/* Analysis Error Alert */}
      {analysisError && (
        <div id="predict-error-alert" data-testid="predict-error-alert">
          <ErrorAlert
            variant="danger"
            title="Analysis Request Failed"
            message={analysisError}
            onDismiss={() => setAnalysisError(null)}
          />
        </div>
      )}

      {/* Header Info Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(0, 242, 254, 0.05)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Sparkles size={20} color="var(--sonar-cyan)" />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--sonar-cyan)' }}>
              AUTOMATIC MODEL SELECTION + SPECIALIST YOLO INFERENCE
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {detectionMode === 'auto'
                ? 'Automatic Mode Active: Ingest any sonar or optical image — Router V1 detects domain and routes to specialist model.'
                : `Manual Override Active: Inference directed specifically to ${detectionMode.toUpperCase()} specialist model.`}
            </div>
          </div>
        </div>
      </div>

      {/* Analyzing Loader Indicator */}
      {isAnalyzing && (
        <div
          id="predict-loading-indicator"
          data-testid="predict-loading-indicator"
          className="glass-panel-elevated"
          style={{
            padding: '18px 22px',
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
                ? 'Analyzing visual invariants & selecting specialist model (POST /predict-auto)...'
                : `Executing ${detectionMode.toUpperCase()} Specialist Detection (POST /predict)...`}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Extracting color distribution, saturation variance, edge density, and acoustic backscatter signatures.
            </div>
          </div>
        </div>
      )}

      {/* Upload Dropzone & Model Routing Grid */}
      <div className="grid-2">
        <div>
          <Dropzone
            onFileSelected={handleFileSelected}
            selectedFile={selectedFile}
            previewData={previewData}
            isAnalyzing={isAnalyzing}
            onTriggerAnalysis={handleTriggerPredict}
          />
        </div>

        <ModelRoutingCard
          detectionMode={detectionMode}
          onSelectMode={(mode) => setDetectionMode(mode)}
          isAnalyzing={isAnalyzing}
        />
      </div>

      {/* 1. Model Selection Modal (Section 6) */}
      <AutoRoutingModal
        isOpen={isAutoModalOpen}
        routing={autoRoutingData}
        onViewResults={handleAcknowledgeModelSelection}
        onSelectManual={handleFallbackManual}
        onClose={() => setIsAutoModalOpen(false)}
      />

      {/* 2. UI-Only Analysis Pipeline Transition (Section 7) */}
      <AnalysisPipelineTransitionModal
        isOpen={isPipelineTransitionOpen}
        modelName={activeModelName}
        targetName={activeTargetName}
        detectionCount={activeDetectionsCount}
        onContinue={handleTransitionToWorkspace}
      />
    </div>
  );
};
