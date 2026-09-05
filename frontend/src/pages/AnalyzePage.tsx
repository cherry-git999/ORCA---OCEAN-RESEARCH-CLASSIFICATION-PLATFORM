import React, { useState } from 'react';
import { useSonar } from '../context/SonarContext';
import { Dropzone } from '../components/upload/Dropzone';
import { ModelRoutingCard } from '../components/upload/ModelRoutingCard';
import { PipelineStepper } from '../components/upload/PipelineStepper';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { PredictVisualizer } from '../components/detections/PredictVisualizer';
import { SonarScanItem } from '../types/detection';
import { ImagePreviewResult } from '../utils/imagePreview';
import { PredictResponse, PredictTarget } from '../types/api';
import { predictImage } from '../api/predictApi';
import { ApiError } from '../api/apiClient';
import { NavRoute } from '../components/layout/Sidebar';
import { Sparkles, Loader2, Play, CheckCircle2, RotateCcw, Box } from 'lucide-react';

interface AnalyzePageProps {
  onNavigate?: (route: NavRoute) => void;
}

export const AnalyzePage: React.FC<AnalyzePageProps> = () => {
  const { backendStatus } = useSonar();

  const [selectedTarget, setSelectedTarget] = useState<PredictTarget>('hardware');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImagePreviewResult | null>(null);

  // Live /predict state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [predictResult, setPredictResult] = useState<PredictResponse | null>(null);

  const handleFileSelected = (file: File, preview: ImagePreviewResult) => {
    setSelectedFile(file);
    setPreviewData(preview);
    setAnalysisError(null);
    setPredictResult(null);
  };

  const handleSelectSample = (sample: SonarScanItem) => {
    setSelectedTarget(sample.target as PredictTarget);
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
  };

  const handleTriggerPredict = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setPredictResult(null);

    try {
      const response = await predictImage(selectedFile, selectedTarget);
      setPredictResult(response);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 0) {
          setAnalysisError('Unable to connect to the ML backend. Please ensure FastAPI is running on port 8000.');
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

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setPredictResult(null);
    setAnalysisError(null);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Backend Status Notification if Offline */}
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
              STEP 6: TARGET-AWARE /predict LIVE INFERENCE
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Upload any sonar image (.pbm, .bpm, .png, .jpg) and select the target specialist to run live YOLO inference.
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

      {/* Analysis In-Progress Banner */}
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
              Executing Live Sonar Prediction via POST /predict...
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Dispatching to {selectedTarget.toUpperCase()} specialist model on PyTorch CUDA engine.
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
                    <span>Analyzing Image (POST /predict)...</span>
                  </>
                ) : (
                  <>
                    <Play size={18} />
                    <span>Analyze Image</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <ModelRoutingCard
          selectedTarget={selectedTarget}
          onSelectTarget={(target) => setSelectedTarget(target)}
          isAnalyzing={isAnalyzing}
        />
      </div>

      {/* 9-Stage Pipeline Stepper */}
      <PipelineStepper />
    </div>
  );
};
