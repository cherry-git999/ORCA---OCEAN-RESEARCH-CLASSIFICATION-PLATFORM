import React, { useState, useRef } from 'react';
import {
  FlaskConical,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FolderArchive,
  Layers,
  Sparkles,
  ArrowRight,
  ArrowDown,
  Play,
  RotateCcw,
  Check,
  ShieldCheck,
  Activity,
  Info,
} from 'lucide-react';
import { NavRoute } from '../components/layout/Sidebar';

interface DatasetLabPageProps {
  onNavigate?: (route: NavRoute) => void;
}

interface DatasetMetadata {
  name: string;
  imageCount: number;
  annotationCount: number;
  classesCount: number;
  classesList: string[];
  format: string;
  status: string;
  fileSize?: string;
}

type SimulationPhase = 'idle' | 'validating' | 'preprocessing' | 'adapting' | 'evaluating' | 'completed';

export const DatasetLabPage: React.FC<DatasetLabPageProps> = ({ onNavigate: _onNavigate }) => {
  // Dataset Upload / Selection State
  const [selectedDataset, setSelectedDataset] = useState<DatasetMetadata | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Workflow Simulation State
  const [simulationPhase, setSimulationPhase] = useState<SimulationPhase>('idle');
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [validatedChecks, setValidatedChecks] = useState<string[]>([]);
  const [selectedBaseModel, setSelectedBaseModel] = useState<string>('New Specialist');

  // Simulated Candidate Model Evaluation Scores
  const candidateMetrics = {
    precision: '88.4%',
    recall: '84.2%',
    map50: '86.7%',
    map50_95: '61.5%',
  };

  // Sample Dataset Definition
  const sampleDataset: DatasetMetadata = {
    name: 'Marine_Debris_v1',
    imageCount: 1250,
    annotationCount: 1180,
    classesCount: 3,
    classesList: ['Plastic_Debris', 'Submerged_Net', 'Metal_Canister'],
    format: 'YOLO (Normalized .txt)',
    status: 'READY FOR VALIDATION',
    fileSize: '42.8 MB',
  };

  const validationChecks = [
    { id: 'pairing', label: 'Image / label pairing' },
    { id: 'corrupted', label: 'Corrupted images verification' },
    { id: 'empty', label: 'Empty labels filter' },
    { id: 'bboxes', label: 'Invalid bounding boxes check' },
    { id: 'classids', label: 'Class IDs consistency' },
    { id: 'duplicates', label: 'Duplicate images detector' },
    { id: 'leakage', label: 'Train / validation / test leakage' },
  ];

  const handleSelectSample = () => {
    setSelectedDataset(sampleDataset);
    setSimulationPhase('idle');
    setActiveStepIndex(1);
    setValidatedChecks([]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const name = file.name.replace(/\.[^/.]+$/, '');
      setSelectedDataset({
        name: name || 'Custom_Dataset_v1',
        imageCount: 840,
        annotationCount: 812,
        classesCount: 2,
        classesList: ['Submerged_Object', 'Anchor_Chain'],
        format: 'YOLO',
        status: 'READY FOR VALIDATION',
        fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      });
      setSimulationPhase('idle');
      setActiveStepIndex(1);
      setValidatedChecks([]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const name = file.name.replace(/\.[^/.]+$/, '');
      setSelectedDataset({
        name: name || 'Custom_Dataset_v1',
        imageCount: 960,
        annotationCount: 920,
        classesCount: 2,
        classesList: ['Acoustic_Target', 'Debris_Cluster'],
        format: 'YOLO',
        status: 'READY FOR VALIDATION',
        fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      });
      setSimulationPhase('idle');
      setActiveStepIndex(1);
      setValidatedChecks([]);
    }
  };

  const handleReset = () => {
    setSelectedDataset(null);
    setSimulationPhase('idle');
    setActiveStepIndex(0);
    setValidatedChecks([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleStartSimulation = () => {
    if (!selectedDataset) return;

    setSimulationPhase('validating');
    setActiveStepIndex(2);
    setValidatedChecks([]);

    // Progressive check animation
    validationChecks.forEach((check, index) => {
      setTimeout(() => {
        setValidatedChecks((prev) => [...prev, check.id]);
      }, (index + 1) * 260);
    });

    // Move to Preprocessing
    setTimeout(() => {
      setSimulationPhase('preprocessing');
      setActiveStepIndex(3);
    }, 2200);

    // Move to Model Adaptation (Fine-tuning simulation)
    setTimeout(() => {
      setSimulationPhase('adapting');
      setActiveStepIndex(4);
    }, 3600);

    // Move to Candidate Evaluation
    setTimeout(() => {
      setSimulationPhase('evaluating');
      setActiveStepIndex(5);
    }, 4900);

    // Complete candidate evaluation and model registration
    setTimeout(() => {
      setSimulationPhase('completed');
      setActiveStepIndex(6);
    }, 6200);
  };

  return (
    <div
      id="dataset-lab-page"
      data-testid="dataset-lab-page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        paddingBottom: '60px',
      }}
    >
      {/* 1. Header Section */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 28px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          background: 'radial-gradient(ellipse at 85% 20%, rgba(0, 242, 254, 0.08) 0%, rgba(7, 14, 28, 0.85) 70%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: '680px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span
              className="badge badge-cyan mono"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                fontSize: '13.5px',
                letterSpacing: '0.06em',
                fontWeight: 700,
              }}
            >
              <FlaskConical size={13} color="var(--sonar-cyan)" />
              DATASET ADAPTATION WORKSPACE
            </span>
            <span className="badge badge-muted mono" style={{ fontSize: '14.5px' }}>
              ORCA SPECIALIST EXTENSION
            </span>
          </div>

          <h1
            style={{
              fontSize: '26px',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              margin: '0 0 4px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            DATASET LAB
          </h1>
          <div
            style={{
              fontSize: '15.5px',
              fontWeight: 600,
              color: 'var(--sonar-cyan)',
              marginBottom: '6px',
            }}
          >
            Adapt ORCA to New Underwater Domains
          </div>
          <p
            style={{
              fontSize: '14.5px',
              color: 'var(--text-secondary)',
              lineHeight: '1.5',
              margin: 0,
            }}
          >
            Upload an annotated dataset and prepare it for controlled specialist-model adaptation.
            Follow the standardized 6-step lifecycle to validate integrity, configure base YOLOv8n weights, and stage candidate models without affecting active deployments.
          </p>
        </div>

        {/* Quick Lifecycle Status Badge */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 16px',
              background: 'rgba(7, 14, 28, 0.7)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-medium)',
            }}
          >
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14.5px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Adaptation Pipeline
              </div>
              <div className="mono" style={{ fontSize: '14.5px', fontWeight: 700, color: simulationPhase === 'completed' ? 'var(--status-emerald)' : 'var(--sonar-cyan)' }}>
                {simulationPhase === 'idle' && (selectedDataset ? 'DATASET READY' : 'IDLE / AWAITING DATASET')}
                {simulationPhase === 'validating' && 'VALIDATING SUITE...'}
                {simulationPhase === 'preprocessing' && 'PREPROCESSING...'}
                {simulationPhase === 'adapting' && 'FINE-TUNING BACKBONE...'}
                {simulationPhase === 'evaluating' && 'BENCHMARKING CANDIDATE...'}
                {simulationPhase === 'completed' && 'CANDIDATE BENCHMARKED (86.7% mAP)'}
              </div>
            </div>
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: simulationPhase === 'completed' ? 'var(--status-emerald)' : (selectedDataset ? 'var(--sonar-cyan)' : 'var(--text-muted)'),
                boxShadow: simulationPhase === 'completed' ? 'var(--status-emerald-glow)' : (selectedDataset ? 'var(--sonar-cyan-glow)' : 'none'),
              }}
            />
          </div>
        </div>
      </div>

      {/* 2. Compact Workflow Pipeline Summary Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '14px 20px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          overflowX: 'auto',
          gap: '8px',
        }}
      >
        {[
          { step: '01', label: 'UPLOAD', active: !!selectedDataset },
          { step: '02', label: 'VALIDATE', active: simulationPhase === 'validating' || simulationPhase === 'preprocessing' || simulationPhase === 'adapting' || simulationPhase === 'evaluating' || simulationPhase === 'completed' },
          { step: '03', label: 'PREPROCESS', active: simulationPhase === 'preprocessing' || simulationPhase === 'adapting' || simulationPhase === 'evaluating' || simulationPhase === 'completed' },
          { step: '04', label: 'ADAPT MODEL', active: simulationPhase === 'adapting' || simulationPhase === 'evaluating' || simulationPhase === 'completed' },
          { step: '05', label: 'EVALUATE', active: simulationPhase === 'evaluating' || simulationPhase === 'completed' },
          { step: '06', label: 'REGISTER', active: simulationPhase === 'completed' },
        ].map((item, idx, arr) => (
          <React.Fragment key={item.step}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-xs)',
                background: item.active ? 'rgba(0, 242, 254, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                border: `1px solid ${item.active ? 'var(--border-active)' : 'transparent'}`,
                transition: 'all 0.25s ease',
                flexShrink: 0,
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: '13.5px',
                  fontWeight: 700,
                  color: item.active ? 'var(--sonar-cyan)' : 'var(--text-muted)',
                }}
              >
                {item.step}
              </span>
              <span
                style={{
                  fontSize: '13.5px',
                  fontWeight: item.active ? 700 : 500,
                  color: item.active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  letterSpacing: '0.04em',
                }}
              >
                {item.label}
              </span>
            </div>
            {idx < arr.length - 1 && (
              <ArrowRight size={14} color={item.active ? 'var(--sonar-cyan)' : 'var(--text-muted)'} style={{ flexShrink: 0, opacity: 0.6 }} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* 3. Main Upload Area & Dataset Summary Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: selectedDataset ? '1fr 1fr' : '1fr',
          gap: '20px',
          alignItems: 'stretch',
        }}
      >
        {/* Upload Card */}
        <div
          className="app-card"
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: '16.5px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UploadCloud size={18} color="var(--sonar-cyan)" />
                UPLOAD ANNOTATED DATASET
              </h2>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                Upload a dataset containing images and corresponding annotations.
              </p>
            </div>
            <span className="badge badge-muted mono" style={{ fontSize: '14.5px' }}>
              ACCEPTED: ZIP / FOLDER
            </span>
          </div>

          {/* Drag & Drop Box */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              flex: 1,
              minHeight: '170px',
              border: `2px dashed ${isDragOver ? 'var(--sonar-cyan)' : 'var(--border-medium)'}`,
              borderRadius: 'var(--radius-md)',
              background: isDragOver ? 'rgba(0, 242, 254, 0.05)' : 'rgba(7, 14, 28, 0.45)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'center',
              gap: '10px',
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".zip,.tar,.gz"
              style={{ display: 'none' }}
            />
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'rgba(0, 242, 254, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(0, 242, 254, 0.25)',
              }}
            >
              <FolderArchive size={22} color="var(--sonar-cyan)" />
            </div>

            <div>
              <div style={{ fontSize: '15.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Drop dataset here
              </div>
              <div style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                or <span style={{ color: 'var(--sonar-cyan)', textDecoration: 'underline' }}>browse files</span>
              </div>
            </div>

            <div
              className="mono"
              style={{
                fontSize: '13.5px',
                color: 'var(--text-muted)',
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              ZIP / dataset folder
            </div>
          </div>

          {/* Expected Structure Snippet & Recommended Note */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Expected structure:
              </span>
              <span className="mono" style={{ fontSize: '14.5px', color: 'var(--sonar-cyan)' }}>
                YOLO STANDARD
              </span>
            </div>
            <pre
              className="mono"
              style={{
                fontSize: '14.5px',
                color: 'var(--text-highlight)',
                margin: 0,
                lineHeight: '1.4',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {`dataset/\n├── images/\n├── labels/\n└── data.yaml`}
            </pre>
            <div style={{ fontSize: '13.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
              <Info size={12} color="var(--sonar-cyan)" />
              <span>YOLO-format annotated datasets are recommended.</span>
            </div>
          </div>

          {/* Sample Preset Button for Instant Testing */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              id="btn-load-sample-dataset"
              data-testid="btn-load-sample-dataset"
              onClick={handleSelectSample}
              className="btn btn-secondary btn-sm"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Sparkles size={14} color="var(--sonar-cyan)" />
              Load Sample Dataset (Marine_Debris_v1)
            </button>

            {selectedDataset && (
              <button
                type="button"
                onClick={handleReset}
                className="btn btn-secondary btn-sm"
                title="Reset Selection"
                style={{ padding: '0 12px' }}
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Dataset Summary Card (Visible when dataset is loaded) */}
        {selectedDataset && (
          <div
            className="app-card"
            style={{
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              borderColor: 'var(--border-active)',
              background: 'linear-gradient(180deg, rgba(0, 242, 254, 0.04) 0%, rgba(7, 14, 28, 0.75) 100%)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <span className="badge badge-cyan mono" style={{ fontSize: '14.5px', marginBottom: '4px', display: 'inline-block' }}>
                  MANIFEST PARSED
                </span>
                <h2 style={{ fontSize: '17.5px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  DATASET SUMMARY
                </h2>
              </div>
              <span
                className="badge mono"
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: 'var(--status-emerald)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  fontSize: '14.5px',
                }}
              >
                {selectedDataset.status}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                padding: '16px',
                background: 'rgba(0, 0, 0, 0.25)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <div style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>Dataset:</div>
                <div className="mono" style={{ fontSize: '15.5px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {selectedDataset.name}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>Format:</div>
                <div className="mono" style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--sonar-cyan)', marginTop: '2px' }}>
                  {selectedDataset.format}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>Images:</div>
                <div className="mono" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {selectedDataset.imageCount.toLocaleString()}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>Annotations:</div>
                <div className="mono" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--sonar-cyan)', marginTop: '2px' }}>
                  {selectedDataset.annotationCount.toLocaleString()}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>Classes:</div>
                <div className="mono" style={{ fontSize: '15.5px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {selectedDataset.classesCount}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>Status:</div>
                <div className="mono" style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--status-emerald)', marginTop: '2px' }}>
                  {selectedDataset.status}
                </div>
              </div>
            </div>

            {/* Class Breakdown Chips */}
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Detected Target Classes:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {selectedDataset.classesList.map((cls, idx) => (
                  <span
                    key={cls}
                    className="mono"
                    style={{
                      fontSize: '13.5px',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-xs)',
                      background: 'rgba(0, 242, 254, 0.08)',
                      border: '1px solid rgba(0, 242, 254, 0.2)',
                      color: 'var(--text-highlight)',
                    }}
                  >
                    #{idx} {cls}
                  </span>
                ))}
              </div>
            </div>

            {/* Base Model Selector Selection */}
            <div
              style={{
                marginTop: 'auto',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  TARGET BASE MODEL:
                </span>
                <span className="mono" style={{ fontSize: '14.5px', color: 'var(--text-muted)' }}>
                  YOLOv8n BACKBONE
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                {['Pipeline Specialist', 'Human Specialist', 'Hardware Specialist', 'New Specialist'].map((modelName) => (
                  <button
                    key={modelName}
                    type="button"
                    onClick={() => setSelectedBaseModel(modelName)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-xs)',
                      border: `1px solid ${selectedBaseModel === modelName ? 'var(--sonar-cyan)' : 'var(--border-subtle)'}`,
                      background: selectedBaseModel === modelName ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      color: selectedBaseModel === modelName ? 'var(--sonar-cyan)' : 'var(--text-secondary)',
                      fontSize: '13.5px',
                      fontWeight: selectedBaseModel === modelName ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {modelName}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginTop: '6px', fontStyle: 'italic' }}>
                Base-model selection depends on dataset class compatibility.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Primary Action Button */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 20px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(7, 14, 28, 0.65)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '100%', justifyContent: 'center' }}>
          <button
            type="button"
            id="btn-start-dataset-validation"
            data-testid="btn-start-dataset-validation"
            disabled={!selectedDataset || simulationPhase === 'validating' || simulationPhase === 'preprocessing' || simulationPhase === 'adapting' || simulationPhase === 'evaluating'}
            onClick={handleStartSimulation}
            className="btn btn-primary"
            style={{
              padding: '12px 32px',
              fontSize: '15.5px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              minWidth: '280px',
              justifyContent: 'center',
            }}
          >
            {!selectedDataset ? (
              <>
                <UploadCloud size={16} />
                UPLOAD DATASET TO CONTINUE
              </>
            ) : simulationPhase === 'idle' ? (
              <>
                <Play size={16} />
                START DATASET VALIDATION
              </>
            ) : simulationPhase === 'completed' ? (
              <>
                <CheckCircle2 size={16} />
                VALIDATION COMPLETED — RE-RUN
              </>
            ) : (
              <>
                <Activity size={16} className="spin" />
                SIMULATING ADAPTATION WORKFLOW...
              </>
            )}
          </button>

          {simulationPhase !== 'idle' && (
            <button
              type="button"
              onClick={() => {
                setSimulationPhase('idle');
                setActiveStepIndex(1);
                setValidatedChecks([]);
              }}
              className="btn btn-secondary"
              style={{ padding: '12px 18px', fontSize: '13.5px' }}
            >
              <RotateCcw size={14} />
              Reset
            </button>
          )}
        </div>

        {/* Simulation Feedback Alert */}
        {simulationPhase === 'completed' && (
          <div
            id="simulation-completed-banner"
            data-testid="simulation-completed-banner"
            style={{
              width: '100%',
              maxWidth: '820px',
              padding: '12px 18px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--status-emerald)' }}>
              ✓ Dataset adaptation & candidate evaluation workflow prepared.
            </div>
            <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
              Simulated specialist model fine-tuning completed (Precision: 88.4%, Recall: 84.2%, mAP50: 86.7%). Candidate model requires backend training and evaluation before activation.
            </div>
          </div>
        )}
      </div>

      {/* 5. WORKFLOW SUMMARY — ALWAYS VISIBLE (6 Steps) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <h2 style={{ fontSize: '17.5px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
              DATASET ADAPTATION LIFECYCLE
            </h2>
            <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Full 6-step verification and fine-tuning staging architecture (Always Visible)
            </div>
          </div>
          <span className="badge badge-muted mono" style={{ fontSize: '14.5px' }}>
            STEPS 01 TO 06
          </span>
        </div>

        {/* 6 Grid Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
          }}
        >
          {/* STEP 01 — DATASET UPLOAD */}
          <div
            className="app-card"
            style={{
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              borderColor: activeStepIndex === 1 ? 'var(--border-active)' : selectedDataset ? 'rgba(0, 242, 254, 0.35)' : 'var(--border-subtle)',
              transition: 'border-color 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="mono" style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--sonar-cyan)' }}>
                  01
                </span>
                <span style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  DATASET UPLOAD
                </span>
              </div>
              <span
                className="badge mono"
                style={{
                  fontSize: '14.5px',
                  background: selectedDataset ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  color: selectedDataset ? 'var(--status-emerald)' : 'var(--text-muted)',
                  border: `1px solid ${selectedDataset ? 'rgba(16, 185, 129, 0.3)' : 'transparent'}`,
                }}
              >
                {selectedDataset ? 'DATASET RECEIVED' : 'WAITING FOR DATASET'}
              </span>
            </div>

            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
              Upload an annotated dataset containing images and corresponding labels.
            </p>

            <div
              style={{
                marginTop: 'auto',
                padding: '10px',
                borderRadius: 'var(--radius-xs)',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Expected structure:
              </div>
              <pre className="mono" style={{ fontSize: '13.5px', color: 'var(--sonar-cyan)', margin: 0, lineHeight: '1.3' }}>
                {`dataset/\n├── images/\n├── labels/\n└── data.yaml`}
              </pre>
            </div>
          </div>

          {/* STEP 02 — DATASET VALIDATION */}
          <div
            className="app-card"
            style={{
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              borderColor: activeStepIndex === 2 ? 'var(--sonar-cyan)' : 'var(--border-subtle)',
              transition: 'border-color 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="mono" style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--sonar-cyan)' }}>
                  02
                </span>
                <span style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  DATASET VALIDATION
                </span>
              </div>
              <span
                className="badge mono"
                style={{
                  fontSize: '14.5px',
                  background:
                    simulationPhase === 'validating'
                      ? 'rgba(0, 242, 254, 0.15)'
                      : simulationPhase === 'preprocessing' || simulationPhase === 'adapting' || simulationPhase === 'evaluating' || simulationPhase === 'completed'
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(255, 255, 255, 0.05)',
                  color:
                    simulationPhase === 'validating'
                      ? 'var(--sonar-cyan)'
                      : simulationPhase === 'preprocessing' || simulationPhase === 'adapting' || simulationPhase === 'evaluating' || simulationPhase === 'completed'
                      ? 'var(--status-emerald)'
                      : 'var(--text-muted)',
                }}
              >
                {simulationPhase === 'validating'
                  ? 'VALIDATING...'
                  : simulationPhase === 'preprocessing' || simulationPhase === 'adapting' || simulationPhase === 'evaluating' || simulationPhase === 'completed'
                  ? 'VALIDATION PASSED'
                  : 'PENDING'}
              </span>
            </div>

            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
              Verify dataset integrity before model adaptation.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {validationChecks.map((check) => {
                const isPassed = validatedChecks.includes(check.id) || simulationPhase === 'completed' || simulationPhase === 'preprocessing' || simulationPhase === 'adapting' || simulationPhase === 'evaluating';
                return (
                  <div
                    key={check.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13.5px',
                      color: isPassed ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                  >
                    {isPassed ? (
                      <Check size={12} color="var(--status-emerald)" />
                    ) : (
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', border: '1px solid var(--border-subtle)', display: 'inline-block' }} />
                    )}
                    <span>{check.label}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ fontSize: '14.5px', color: 'var(--text-muted)', marginTop: 'auto', fontStyle: 'italic' }}>
              ORCA designed validation suite. Real validation executes against dataset manifest on backend invocation.
            </div>
          </div>

          {/* STEP 03 — PREPROCESSING */}
          <div
            className="app-card"
            style={{
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              borderColor: activeStepIndex === 3 ? 'var(--sonar-cyan)' : 'var(--border-subtle)',
              transition: 'border-color 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="mono" style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--sonar-cyan)' }}>
                  03
                </span>
                <span style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  PREPROCESSING
                </span>
              </div>
              <span
                className="badge mono"
                style={{
                  fontSize: '14.5px',
                  background:
                    simulationPhase === 'preprocessing'
                      ? 'rgba(0, 242, 254, 0.15)'
                      : simulationPhase === 'adapting' || simulationPhase === 'evaluating' || simulationPhase === 'completed'
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(255, 255, 255, 0.05)',
                  color:
                    simulationPhase === 'preprocessing'
                      ? 'var(--sonar-cyan)'
                      : simulationPhase === 'adapting' || simulationPhase === 'evaluating' || simulationPhase === 'completed'
                      ? 'var(--status-emerald)'
                      : 'var(--text-muted)',
                }}
              >
                {simulationPhase === 'preprocessing'
                  ? 'PREPROCESSING...'
                  : simulationPhase === 'adapting' || simulationPhase === 'evaluating' || simulationPhase === 'completed'
                  ? 'READY'
                  : 'PENDING'}
              </span>
            </div>

            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
              Normalize the dataset and prepare it for the selected model.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { title: 'Image normalization', desc: 'RGB histogram balance & 640x640 letterbox' },
                { title: 'Format conversion', desc: 'Normalized YOLO coordinates [0.0 - 1.0]' },
                { title: 'Annotation normalization', desc: 'Bounding box boundary clipping' },
                { title: 'Model-compatible preprocessing', desc: 'PyTorch / ONNX compatible tensor shapes' },
              ].map((item) => (
                <div
                  key={item.title}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-xs)',
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-highlight)' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '14.5px', color: 'var(--text-muted)' }}>
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* STEP 04 — MODEL ADAPTATION */}
          <div
            className="app-card"
            style={{
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              borderColor: activeStepIndex === 4 ? 'var(--sonar-cyan)' : 'var(--border-subtle)',
              transition: 'border-color 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="mono" style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--sonar-cyan)' }}>
                  04
                </span>
                <span style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  MODEL ADAPTATION
                </span>
              </div>
              <span
                className="badge mono"
                style={{
                  fontSize: '14.5px',
                  background:
                    simulationPhase === 'adapting'
                      ? 'rgba(0, 242, 254, 0.15)'
                      : simulationPhase === 'evaluating' || simulationPhase === 'completed'
                      ? 'rgba(168, 85, 247, 0.15)'
                      : 'rgba(255, 255, 255, 0.05)',
                  color:
                    simulationPhase === 'adapting'
                      ? 'var(--sonar-cyan)'
                      : simulationPhase === 'evaluating' || simulationPhase === 'completed'
                      ? 'var(--status-purple)'
                      : 'var(--text-muted)',
                }}
              >
                {simulationPhase === 'adapting'
                  ? 'FINE-TUNING BACKBONE...'
                  : simulationPhase === 'evaluating' || simulationPhase === 'completed'
                  ? 'ADAPTATION COMPLETE'
                  : 'CANDIDATE / NOT STARTED'}
              </span>
            </div>

            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
              Fine-tune a specialist model using the prepared dataset.
            </p>

            {/* Visual Mechanism Diagram */}
            <div
              style={{
                padding: '12px',
                borderRadius: 'var(--radius-xs)',
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span className="mono" style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--sonar-cyan)' }}>
                BASE YOLOv8n
              </span>
              <ArrowDown size={12} color="var(--text-muted)" />
              <span className="mono" style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-highlight)' }}>
                NEW DATASET
              </span>
              <ArrowDown size={12} color="var(--text-muted)" />
              <span className="mono" style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--status-amber)' }}>
                FINE-TUNING
              </span>
              <ArrowDown size={12} color="var(--text-muted)" />
              <span className="mono" style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--status-emerald)' }}>
                NEW MODEL CHECKPOINT
              </span>
            </div>

            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                BASE MODEL: <span className="mono" style={{ color: 'var(--sonar-cyan)' }}>{selectedBaseModel}</span>
              </div>
              <div style={{ fontSize: '13.5px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Base-model selection depends on dataset class compatibility.
              </div>
            </div>
          </div>

          {/* STEP 05 — EVALUATION */}
          <div
            className="app-card"
            style={{
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              borderColor: activeStepIndex === 5 ? 'var(--sonar-cyan)' : 'var(--border-subtle)',
              transition: 'border-color 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="mono" style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--sonar-cyan)' }}>
                  05
                </span>
                <span style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  EVALUATION
                </span>
              </div>
              <span
                className="badge mono"
                style={{
                  fontSize: '14.5px',
                  background:
                    simulationPhase === 'evaluating'
                      ? 'rgba(0, 242, 254, 0.15)'
                      : simulationPhase === 'completed'
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(255, 255, 255, 0.05)',
                  color:
                    simulationPhase === 'evaluating'
                      ? 'var(--sonar-cyan)'
                      : simulationPhase === 'completed'
                      ? 'var(--status-emerald)'
                      : 'var(--text-muted)',
                  border: `1px solid ${
                    simulationPhase === 'completed' ? 'rgba(16, 185, 129, 0.3)' : 'transparent'
                  }`,
                }}
              >
                {simulationPhase === 'evaluating'
                  ? 'BENCHMARKING...'
                  : simulationPhase === 'completed'
                  ? 'EVALUATION PASSED (0.867 mAP)'
                  : 'WAITING FOR MODEL'}
              </span>
            </div>

            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
              Evaluate the adapted model before deployment.
            </p>

            {/* Visual Flow */}
            <div
              className="mono"
              style={{
                fontSize: '14.5px',
                color: simulationPhase === 'completed' ? 'var(--sonar-cyan)' : 'var(--text-muted)',
                textAlign: 'center',
                padding: '6px',
                background: 'rgba(0, 0, 0, 0.25)',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              NEW MODEL → VALIDATION / TEST → PERFORMANCE METRICS → PERFORMANCE GATE
            </div>

            {/* Metric Cards: Displays simulated evaluation scores after training */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
              }}
            >
              {[
                {
                  label: 'Precision',
                  value: simulationPhase === 'completed' ? candidateMetrics.precision : simulationPhase === 'evaluating' ? '...' : '--',
                  color: simulationPhase === 'completed' ? 'var(--text-highlight)' : 'var(--text-muted)',
                },
                {
                  label: 'Recall',
                  value: simulationPhase === 'completed' ? candidateMetrics.recall : simulationPhase === 'evaluating' ? '...' : '--',
                  color: simulationPhase === 'completed' ? 'var(--text-highlight)' : 'var(--text-muted)',
                },
                {
                  label: 'mAP50',
                  value: simulationPhase === 'completed' ? candidateMetrics.map50 : simulationPhase === 'evaluating' ? '...' : '--',
                  color: simulationPhase === 'completed' ? 'var(--sonar-cyan)' : 'var(--text-muted)',
                },
                {
                  label: 'mAP50-95',
                  value: simulationPhase === 'completed' ? candidateMetrics.map50_95 : simulationPhase === 'evaluating' ? '...' : '--',
                  color: simulationPhase === 'completed' ? 'var(--status-emerald)' : 'var(--text-muted)',
                },
              ].map((m) => (
                <div
                  key={m.label}
                  style={{
                    padding: '8px',
                    borderRadius: 'var(--radius-xs)',
                    background: simulationPhase === 'completed' ? 'rgba(0, 242, 254, 0.05)' : 'rgba(0, 0, 0, 0.3)',
                    border: `1px solid ${simulationPhase === 'completed' ? 'rgba(0, 242, 254, 0.2)' : 'var(--border-subtle)'}`,
                    textAlign: 'center',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <div style={{ fontSize: '14.5px', color: 'var(--text-muted)' }}>{m.label}</div>
                  <div className="mono" style={{ fontSize: '20px', fontWeight: 700, color: m.color, marginTop: '2px' }}>
                    {m.value}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                fontSize: '13.5px',
                color: simulationPhase === 'completed' ? 'var(--status-emerald)' : 'var(--status-amber)',
                fontWeight: 600,
                textAlign: 'center',
                marginTop: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
              }}
            >
              {simulationPhase === 'completed' ? (
                <>
                  <Check size={13} color="var(--status-emerald)" />
                  <span>Candidate validation benchmark (Simulated)</span>
                </>
              ) : simulationPhase === 'evaluating' ? (
                <span>Benchmarking candidate against validation split...</span>
              ) : (
                <span>Metrics available after training</span>
              )}
            </div>
          </div>

          {/* STEP 06 — MODEL REGISTRATION */}
          <div
            className="app-card"
            style={{
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              borderColor: activeStepIndex === 6 ? 'var(--status-purple)' : 'var(--border-subtle)',
              transition: 'border-color 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="mono" style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--sonar-cyan)' }}>
                  06
                </span>
                <span style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  MODEL REGISTRATION
                </span>
              </div>
              <span
                className="badge mono"
                style={{
                  fontSize: '14.5px',
                  background: simulationPhase === 'completed' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  color: simulationPhase === 'completed' ? 'var(--status-purple)' : 'var(--text-muted)',
                }}
              >
                {simulationPhase === 'completed' ? 'CANDIDATE STAGED' : 'CANDIDATE / NOT REGISTERED'}
              </span>
            </div>

            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
              Register the evaluated model as a candidate before activation.
            </p>

            {/* Quick Registry Preview */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                padding: '10px',
                borderRadius: 'var(--radius-xs)',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>Pipeline Specialist</span>
                <span className="badge badge-online mono" style={{ fontSize: '13.5px', padding: '1px 6px' }}>ACTIVE</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>Human Specialist</span>
                <span className="badge badge-online mono" style={{ fontSize: '13.5px', padding: '1px 6px' }}>ACTIVE</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>Hardware Specialist</span>
                <span className="badge badge-online mono" style={{ fontSize: '13.5px', padding: '1px 6px' }}>ACTIVE</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border-subtle)', paddingTop: '4px' }}>
                <span className="mono" style={{ fontSize: '13.5px', color: 'var(--status-purple)', fontWeight: 600 }}>New Specialist</span>
                <span className="badge mono" style={{ fontSize: '13.5px', padding: '1px 6px', background: 'rgba(168, 85, 247, 0.2)', color: 'var(--status-purple)' }}>CANDIDATE</span>
              </div>
            </div>

            <div style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginTop: 'auto', fontStyle: 'italic' }}>
              New models remain candidates until evaluation and approval.
            </div>
          </div>
        </div>
      </div>

      {/* 6. Comprehensive MODEL REGISTRY Table Visualization */}
      <div
        className="app-card"
        style={{
          padding: '22px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '17.5px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="var(--sonar-cyan)" />
              MODEL REGISTRY
            </h2>
            <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Specialist inventory, routing activation status, and candidate staging
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span className="badge badge-online mono" style={{ fontSize: '14.5px' }}>
              3 PRODUCTION ACTIVE
            </span>
            <span className="badge mono" style={{ fontSize: '14.5px', background: 'rgba(168, 85, 247, 0.15)', color: 'var(--status-purple)' }}>
              1 CANDIDATE
            </span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                <th style={{ padding: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>SPECIALIST MODEL</th>
                <th style={{ padding: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>ARCHITECTURE</th>
                <th style={{ padding: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>DOMAIN FOCUS</th>
                <th style={{ padding: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>STATUS</th>
                <th style={{ padding: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>ROUTING TRIGGER</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '12px 10px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Pipeline Specialist (Model 1)
                </td>
                <td className="mono" style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>
                  YOLOv8n (Pytorch)
                </td>
                <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>
                  Underwater Subsea Pipelines & Corrosions
                </td>
                <td style={{ padding: '12px 10px' }}>
                  <span className="badge badge-online mono" style={{ fontSize: '14.5px' }}>
                    ACTIVE
                  </span>
                </td>
                <td className="mono" style={{ padding: '12px 10px', fontSize: '13.5px', color: 'var(--sonar-cyan)' }}>
                  Industrial / Pipeline Domain
                </td>
              </tr>

              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '12px 10px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Human Specialist (Model 2)
                </td>
                <td className="mono" style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>
                  YOLOv8n (Pytorch)
                </td>
                <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>
                  Divers, Human Presence & Search-and-Rescue
                </td>
                <td style={{ padding: '12px 10px' }}>
                  <span className="badge badge-online mono" style={{ fontSize: '14.5px' }}>
                    ACTIVE
                  </span>
                </td>
                <td className="mono" style={{ padding: '12px 10px', fontSize: '13.5px', color: 'var(--sonar-cyan)' }}>
                  Biometric / Diver Domain
                </td>
              </tr>

              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '12px 10px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Hardware Specialist (Model 3)
                </td>
                <td className="mono" style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>
                  YOLOv8n (Pytorch)
                </td>
                <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>
                  Subsea Hardware, Tools, Caps & Transducers
                </td>
                <td style={{ padding: '12px 10px' }}>
                  <span className="badge badge-online mono" style={{ fontSize: '14.5px' }}>
                    ACTIVE
                  </span>
                </td>
                <td className="mono" style={{ padding: '12px 10px', fontSize: '13.5px', color: 'var(--sonar-cyan)' }}>
                  Hardware / Rig Intake
                </td>
              </tr>

              {/* Candidate Specialist Row */}
              <tr style={{ background: 'rgba(168, 85, 247, 0.04)' }}>
                <td style={{ padding: '12px 10px', fontWeight: 700, color: 'var(--status-purple)' }}>
                  {selectedDataset ? `${selectedDataset.name.replace(/_/g, ' ')} Specialist` : 'Marine Debris Specialist (Candidate)'}
                </td>
                <td className="mono" style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>
                  YOLOv8n Backbone
                </td>
                <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>
                  {selectedDataset ? selectedDataset.classesList.join(', ') : 'Submerged Marine Plastics & Nets'}
                </td>
                <td style={{ padding: '12px 10px' }}>
                  <span
                    className="badge mono"
                    style={{
                      fontSize: '14.5px',
                      background: 'rgba(168, 85, 247, 0.2)',
                      color: 'var(--status-purple)',
                      border: '1px solid rgba(168, 85, 247, 0.4)',
                    }}
                  >
                    CANDIDATE
                  </span>
                </td>
                <td className="mono" style={{ padding: '12px 10px', fontSize: '13.5px', color: simulationPhase === 'completed' ? 'var(--status-emerald)' : 'var(--text-muted)' }}>
                  {simulationPhase === 'completed' ? 'Benchmarked (0.867 mAP50) • Staged for Review' : 'Pending Evaluation & Approval'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-xs)',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            fontSize: '14.5px',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertTriangle size={15} color="var(--status-amber)" style={{ flexShrink: 0 }} />
          <span>
            <strong style={{ color: 'var(--status-amber)' }}>Safety Governance:</strong> A newly adapted model MUST NOT automatically replace an existing active model. New models remain candidates until evaluation and approval.
          </span>
        </div>
      </div>

      {/* 7. Architecture Statement Banner at Bottom */}
      <div
        className="glass-panel"
        style={{
          padding: '20px 24px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-medium)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '10px',
          background: 'radial-gradient(ellipse at 50% 50%, rgba(0, 242, 254, 0.05) 0%, rgba(7, 14, 28, 0.95) 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={18} color="var(--sonar-cyan)" />
          <h3 style={{ fontSize: '16.5px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '0.02em' }}>
            Open & Dataset-Adaptive Architecture
          </h3>
        </div>

        <p
          style={{
            fontSize: '14.5px',
            color: 'var(--text-secondary)',
            maxWidth: '740px',
            margin: 0,
            lineHeight: '1.5',
          }}
        >
          "ORCA is designed to incorporate new underwater datasets and specialist models through a controlled validation, adaptation and evaluation workflow."
        </p>

        {/* Architecture Triad */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginTop: '4px',
          }}
        >
          <span className="badge badge-cyan mono" style={{ fontSize: '13.5px', padding: '4px 12px' }}>
            SPECIALIST AI MODELS
          </span>
          <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>+</span>
          <span className="badge badge-cyan mono" style={{ fontSize: '13.5px', padding: '4px 12px' }}>
            DATASET ADAPTATION
          </span>
          <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>+</span>
          <span className="badge badge-cyan mono" style={{ fontSize: '13.5px', padding: '4px 12px' }}>
            TARGET-AWARE MODEL ROUTING
          </span>
        </div>
      </div>
    </div>
  );
};
