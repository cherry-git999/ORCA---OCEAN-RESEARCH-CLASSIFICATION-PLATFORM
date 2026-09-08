import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  ArrowRight,
  Layers,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
} from 'lucide-react';

interface AnalysisPipelineTransitionModalProps {
  isOpen: boolean;
  modelName: string;
  targetName: string;
  detectionCount: number;
  onContinue: () => void;
}

const IMAGE_QUALITY_SUBSTEPS = [
  {
    id: 1,
    name: 'Speckle / Acoustic Noise Reduction',
    desc: 'Adaptive speckle filtering & transducer high-frequency suppression',
  },
  {
    id: 2,
    name: 'Intensity Normalization',
    desc: 'Histogram equalization & dynamic gain curve realignment',
  },
  {
    id: 3,
    name: 'Contrast Enhancement',
    desc: 'Local adaptive contrast stretch across acoustic shadow boundaries',
  },
  {
    id: 4,
    name: 'Acoustic Shadow Enhancement',
    desc: 'Seafloor gradient demarcation & acoustic shadow edge isolation',
  },
  {
    id: 5,
    name: 'Seabed / Background Suppression',
    desc: 'Benthic clutter attenuation & reverberation profile subtraction',
  },
  {
    id: 6,
    name: 'Geometric Correction',
    desc: 'Slant-range to ground-range coordinate re-projection matrix',
  },
  {
    id: 7,
    name: 'Resolution & Image Size Standardization',
    desc: 'Standardized bilinear scaling to 640x640 tensor input dimensions',
  },
  {
    id: 8,
    name: 'Data Augmentation',
    desc: 'Affine perturbation & acoustic illumination robustness transforms',
  },
  {
    id: 9,
    name: 'Image Quality & Data Dropout Handling',
    desc: 'Ping loss interpolation & SNR signal integrity verification',
  },
  {
    id: 10,
    name: 'Dataset Cleaning & Validation',
    desc: 'Manifold consistency validation & non-acoustic artifact pruning',
  },
];

export const AnalysisPipelineTransitionModal: React.FC<AnalysisPipelineTransitionModalProps> = ({
  isOpen,
  modelName,
  targetName,
  detectionCount,
  onContinue,
}) => {
  // Auto-expanded accordion state (NO USER CLICK REQUIRED)
  const [isAccordionOpen, setIsAccordionOpen] = useState(true);

  // Substep animation state: 1 to 10 active steps, 11 = all completed
  const [activeSubstep, setActiveSubstep] = useState<number>(1);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const substepsContainerRef = useRef<HTMLDivElement>(null);
  const activeStepRef = useRef<HTMLDivElement>(null);

  // Reset & start animation timer whenever modal opens
  useEffect(() => {
    if (!isOpen) {
      setActiveSubstep(1);
      setIsCompleted(false);
      setIsAccordionOpen(true);
      return;
    }

    // Step progression timer: ~900ms per step, ~9.5-10s total
    setActiveSubstep(1);
    setIsCompleted(false);
    setIsAccordionOpen(true);

    let currentStep = 1;
    const interval = setInterval(() => {
      currentStep += 1;
      if (currentStep <= 10) {
        setActiveSubstep(currentStep);
      } else {
        setActiveSubstep(11);
        setIsCompleted(true);
        clearInterval(interval);
      }
    }, 950);

    return () => {
      clearInterval(interval);
    };
  }, [isOpen]);

  // Smoothly keep the active substep in view as it progresses
  useEffect(() => {
    if (activeStepRef.current && substepsContainerRef.current) {
      activeStepRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeSubstep]);

  if (!isOpen) return null;

  const progressPercent = Math.min(100, Math.round(((Math.min(activeSubstep, 10) - (isCompleted ? 0 : 1)) / 10) * 100));

  return (
    <div
      id="analysis-pipeline-modal-backdrop"
      data-testid="analysis-pipeline-modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(3, 7, 18, 0.90)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        id="analysis-pipeline-modal-card"
        data-testid="analysis-pipeline-modal-card"
        className="glass-panel-elevated"
        style={{
          width: '100%',
          maxWidth: '580px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 26px',
          borderRadius: 'var(--radius-lg, 16px)',
          background: 'linear-gradient(180deg, rgba(11, 20, 38, 0.98) 0%, rgba(5, 10, 20, 0.99) 100%)',
          border: '1px solid var(--border-active, #00f2fe)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 45px rgba(0, 242, 254, 0.18)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '16px', flexShrink: 0 }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 10px auto',
              borderRadius: '50%',
              background: 'rgba(0, 242, 254, 0.12)',
              border: '2px solid var(--sonar-cyan, #00f2fe)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--sonar-cyan, #00f2fe)',
              boxShadow: '0 0 20px rgba(0, 242, 254, 0.3)',
            }}
          >
            <Layers size={22} />
          </div>

          <h2
            style={{
              fontSize: '19px',
              fontWeight: 800,
              letterSpacing: '0.06em',
              color: 'var(--text-primary, #ffffff)',
              textTransform: 'uppercase',
              margin: '0 0 4px 0',
            }}
          >
            ANALYSIS PIPELINE
          </h2>

          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary, #94a3b8)' }}>
            Multimodal Underwater Intelligence Workflow Executed
          </div>
        </div>

        {/* Scrollable Pipeline Stages Content */}
        <div
          style={{
            overflowY: 'auto',
            paddingRight: '6px',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {/* Stage 01: Image Ingestion */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: 'var(--radius-sm, 8px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="mono" style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748b)' }}>
                01
              </span>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary, #ffffff)' }}>
                  Image Ingestion
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary, #94a3b8)' }}>
                  Acoustic / optical file stream decoded into memory
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--status-emerald, #10b981)' }}>
              <CheckCircle2 size={16} />
            </div>
          </div>

          {/* Stage 02: Image Quality Check (AUTO-EXPANDING ACCORDION) */}
          <div
            id="stage-quality-check-card"
            data-testid="stage-quality-check-card"
            style={{
              background: isCompleted ? 'rgba(16, 185, 129, 0.03)' : 'rgba(0, 242, 254, 0.04)',
              border: `1px solid ${isCompleted ? 'rgba(16, 185, 129, 0.35)' : 'rgba(0, 242, 254, 0.35)'}`,
              borderRadius: 'var(--radius-sm, 8px)',
              overflow: 'hidden',
              boxShadow: isCompleted ? '0 0 15px rgba(16, 185, 129, 0.1)' : '0 0 15px rgba(0, 242, 254, 0.1)',
            }}
          >
            {/* Stage 02 Accordion Header */}
            <div
              onClick={() => setIsAccordionOpen(!isAccordionOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                cursor: 'pointer',
                background: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="mono" style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748b)' }}>
                  02
                </span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary, #ffffff)' }}>
                      Image Quality Check
                    </span>
                    <span
                      className={`badge ${isCompleted ? 'badge-emerald' : 'badge-cyan'}`}
                      style={{ fontSize: '11px', padding: '1px 6px' }}
                    >
                      {isCompleted ? '10/10 COMPLETE' : `STEP ${Math.min(activeSubstep, 10)}/10`}
                    </span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary, #94a3b8)' }}>
                    Spatial resolution, dynamic range & acoustic noise suppression
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isCompleted ? (
                  <CheckCircle2 size={16} color="var(--status-emerald, #10b981)" />
                ) : (
                  <Loader2 size={16} className="animate-spin" color="var(--sonar-cyan, #00f2fe)" />
                )}
                {isAccordionOpen ? <ChevronUp size={15} color="#94a3b8" /> : <ChevronDown size={15} color="#94a3b8" />}
              </div>
            </div>

            {/* Progress Bar under Accordion Header */}
            <div style={{ width: '100%', height: '3px', background: 'rgba(255, 255, 255, 0.08)' }}>
              <div
                style={{
                  width: `${isCompleted ? 100 : Math.max(10, progressPercent)}%`,
                  height: '100%',
                  background: isCompleted
                    ? 'linear-gradient(90deg, #10b981, #34d399)'
                    : 'linear-gradient(90deg, #00f2fe, #38bdf8)',
                  transition: 'width 0.4s ease',
                  boxShadow: '0 0 8px rgba(0, 242, 254, 0.5)',
                }}
              />
            </div>

            {/* Accordion Body: 10 Substeps List (Auto-Expanded) */}
            {isAccordionOpen && (
              <div
                ref={substepsContainerRef}
                style={{
                  padding: '10px 14px',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  background: 'rgba(3, 7, 18, 0.4)',
                }}
              >
                {IMAGE_QUALITY_SUBSTEPS.map((substep) => {
                  const isStepDone = isCompleted || activeSubstep > substep.id;
                  const isStepActive = !isCompleted && activeSubstep === substep.id;

                  return (
                    <div
                      key={substep.id}
                      ref={isStepActive ? activeStepRef : null}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '12.5px',
                        background: isStepActive
                          ? 'rgba(0, 242, 254, 0.10)'
                          : isStepDone
                          ? 'rgba(16, 185, 129, 0.04)'
                          : 'transparent',
                        border: isStepActive
                          ? '1px solid rgba(0, 242, 254, 0.4)'
                          : '1px solid transparent',
                        transition: 'all 0.25s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          className="mono"
                          style={{
                            fontSize: '11px',
                            color: isStepActive ? '#00f2fe' : isStepDone ? '#34d399' : '#64748b',
                            width: '18px',
                          }}
                        >
                          {substep.id < 10 ? `0${substep.id}` : substep.id}
                        </span>
                        <div>
                          <div
                            style={{
                              fontWeight: isStepActive ? 700 : isStepDone ? 500 : 400,
                              color: isStepActive
                                ? '#ffffff'
                                : isStepDone
                                ? '#e2e8f0'
                                : '#64748b',
                            }}
                          >
                            {substep.name}
                          </div>
                          <div
                            style={{
                              fontSize: '11px',
                              color: isStepActive ? '#38bdf8' : '#64748b',
                            }}
                          >
                            {substep.desc}
                          </div>
                        </div>
                      </div>

                      <div style={{ flexShrink: 0 }}>
                        {isStepDone ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#10b981' }}>
                            <Check size={13} strokeWidth={3} />
                          </div>
                        ) : isStepActive ? (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              color: '#00f2fe',
                              fontWeight: 600,
                            }}
                          >
                            <Loader2 size={11} className="animate-spin" />
                            <span>PROCESSING</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#475569' }}>QUEUED</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Complete Badge Footer inside card */}
            {isCompleted && (
              <div
                style={{
                  padding: '8px 14px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  borderTop: '1px solid rgba(16, 185, 129, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12.5px',
                  color: '#34d399',
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={14} color="#34d399" />
                <span>Image Quality Processing Complete — All 10 preprocessing stages verified</span>
              </div>
            )}
          </div>

          {/* Stage 03: Domain Identification */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: 'var(--radius-sm, 8px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="mono" style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748b)' }}>
                03
              </span>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary, #ffffff)' }}>
                  Domain Identification
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary, #94a3b8)' }}>
                  Visual invariants extracted via Router V1 (τ = 0.85)
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--status-emerald, #10b981)' }}>
              <CheckCircle2 size={16} />
            </div>
          </div>

          {/* Stage 04: Specialist Model Selected */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: 'var(--radius-sm, 8px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="mono" style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748b)' }}>
                04
              </span>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary, #ffffff)' }}>
                  Specialist Model Selected
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary, #94a3b8)' }}>
                  Dedicated YOLOv8 checkpoint ({modelName || targetName.toUpperCase()}) engaged
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--status-emerald, #10b981)' }}>
              <CheckCircle2 size={16} />
            </div>
          </div>

          {/* Stage 05: Object Detection */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: 'var(--radius-sm, 8px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="mono" style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748b)' }}>
                05
              </span>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary, #ffffff)' }}>
                  Object Detection
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary, #94a3b8)' }}>
                  Inference executed with bounding box coordinate regression
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--status-emerald, #10b981)' }}>
              <CheckCircle2 size={16} />
            </div>
          </div>

          {/* Stage 06: Annotation Generation */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: 'var(--radius-sm, 8px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="mono" style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748b)' }}>
                06
              </span>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary, #ffffff)' }}>
                  Annotation Generation
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary, #94a3b8)' }}>
                  Confidence scoring & geometric label attribution generated
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--status-emerald, #10b981)' }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
        </div>

        {/* Summary Info Pill */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            background: 'rgba(0, 242, 254, 0.05)',
            border: '1px solid rgba(0, 242, 254, 0.2)',
            borderRadius: 'var(--radius-sm, 8px)',
            marginBottom: '14px',
            fontSize: '12.5px',
            flexShrink: 0,
          }}
        >
          <div>
            <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Specialist Model: </span>
            <strong style={{ color: 'var(--sonar-cyan, #00f2fe)' }}>{targetName.toUpperCase()}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Detections Found: </span>
            <strong className="mono" style={{ color: '#34d399' }}>{detectionCount}</strong>
          </div>
        </div>

        {/* Action Button */}
        <button
          id="continue-to-workspace-btn"
          data-testid="continue-to-workspace-btn"
          onClick={onContinue}
          className="btn btn-primary"
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '14.5px',
            fontWeight: 700,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            boxShadow: isCompleted
              ? '0 4px 20px rgba(0, 242, 254, 0.45)'
              : '0 4px 14px rgba(0, 242, 254, 0.2)',
            flexShrink: 0,
          }}
        >
          <span>{isCompleted ? 'Continue to Detection Workspace' : 'Continue to Detection Workspace'}</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
