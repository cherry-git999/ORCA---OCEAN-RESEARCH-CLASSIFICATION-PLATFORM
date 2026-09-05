import React, { useState } from 'react';
import { useSonar } from '../context/SonarContext';
import { Dropzone } from '../components/upload/Dropzone';
import { ModelRoutingCard } from '../components/upload/ModelRoutingCard';
import { PipelineStepper } from '../components/upload/PipelineStepper';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { SonarScanItem } from '../types/detection';
import { ImagePreviewResult } from '../utils/imagePreview';
import { ArrowRight, Sparkles, Loader2, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface AnalyzePageProps {
  onNavigate: (route: 'detections') => void;
}

export const AnalyzePage: React.FC<AnalyzePageProps> = ({ onNavigate }) => {
  const {
    scans,
    activeScan,
    setActiveScanId,
    executeLiveAnalysis,
    isAnalyzing,
    analysisError,
    clearAnalysisError,
    backendStatus,
  } = useSonar();

  const [selectedTarget, setSelectedTarget] = useState<'pipeline' | 'human'>('pipeline');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImagePreviewResult | null>(null);

  const handleFileSelected = (file: File, preview: ImagePreviewResult) => {
    setSelectedFile(file);
    setPreviewData(preview);
    clearAnalysisError();
  };

  const handleSelectSample = (sample: SonarScanItem) => {
    setActiveScanId(sample.id);
    setSelectedTarget(sample.target);
    setSelectedFile(null);
    setPreviewData({
      previewUrl: sample.image.preview_url,
      width: sample.image.width,
      height: sample.image.height,
      isNetpbm: false,
      formatDescription: sample.image.format,
    });
    clearAnalysisError();
  };

  const handleTriggerLiveAnalysis = async () => {
    if (!selectedFile) return;
    const success = await executeLiveAnalysis(selectedFile, selectedTarget);
    if (success) {
      onNavigate('detections');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Backend Status Notification if Offline */}
      {backendStatus === 'offline' && (
        <ErrorAlert
          variant="warning"
          title="FastAPI Backend Offline"
          message="FastAPI service at http://127.0.0.1:8000 is not reachable. Live inference requires starting the backend (see README for uvicorn command). You can still explore the dashboard foundation."
        />
      )}

      {/* Analysis Error Alert if failed */}
      {analysisError && (
        <ErrorAlert
          variant="danger"
          title="Analysis Request Failed"
          message={analysisError}
          onDismiss={clearAnalysisError}
        />
      )}

      {/* Header Info Banner */}
      <div className="glass-panel" style={{
        padding: '14px 18px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(0, 242, 254, 0.05)',
        border: '1px solid var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={18} color="var(--sonar-cyan)" />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--sonar-cyan)' }}>
              STAGE 1: REAL BACKEND INGESTION & MANUAL TARGET DISPATCH
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Upload any sonar file (.pbm, .bpm, .png, .jpg) and select the target specialist to run live YOLOv8 inference.
            </div>
          </div>
        </div>

        <button
          onClick={() => onNavigate('detections')}
          className="btn btn-secondary btn-sm"
        >
          <span>Open Detection Workspace</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Analysis In-Progress Banner */}
      {isAnalyzing && (
        <div className="glass-panel-elevated" style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          borderColor: 'var(--border-active)',
          boxShadow: 'var(--sonar-cyan-glow)',
        }}>
          <Loader2 size={24} color="var(--sonar-cyan)" className="sonar-ping" />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Executing Live Sonar Inference via /analyze...
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Dispatching to {selectedTarget === 'pipeline' ? 'Model 1 (Pipeline Specialist)' : 'Model 2 (Human Specialist)'} on PyTorch CUDA engine.
            </div>
          </div>
        </div>
      )}

      {/* Upload Dropzone & Model Routing Grid */}
      <div className="grid-2">
        <Dropzone
          onFileSelected={handleFileSelected}
          selectedFile={selectedFile}
          previewData={previewData}
          onSelectSample={handleSelectSample}
          availableSamples={scans}
          isAnalyzing={isAnalyzing}
          onTriggerAnalysis={handleTriggerLiveAnalysis}
        />

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
