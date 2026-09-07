import React from 'react';
import { Detection } from '../../types/detection';
import { getSortedDetectionsByPriority } from '../../utils/detectionPriority';
import { ListOrdered, AlertTriangle, ArrowRight, ShieldAlert } from 'lucide-react';

interface CleanupInspectionOrderCardProps {
  detections: Detection[];
  selectedAnomalyId: string | null;
  onSelectAnomaly: (id: string) => void;
  target?: string;
}

export const CleanupInspectionOrderCard: React.FC<CleanupInspectionOrderCardProps> = ({
  detections,
  selectedAnomalyId,
  onSelectAnomaly,
  target = 'pipeline',
}) => {
  const rankedItems = getSortedDetectionsByPriority(detections, target);
  const isHumanContext = (target || '').toLowerCase().includes('human');

  return (
    <div
      id="cleanup-inspection-order-card"
      data-testid="cleanup-inspection-order-card"
      className="glass-panel"
      style={{
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Card Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              padding: '6px',
              borderRadius: 'var(--radius-xs)',
              background: 'rgba(0, 242, 254, 0.1)',
              color: 'var(--sonar-cyan)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ListOrdered size={16} />
          </div>
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.04em', margin: 0, textTransform: 'uppercase' }}>
              CLEANUP / INSPECTION ORDER
            </h3>
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
              {isHumanContext ? 'Prioritized Verification & Welfare Order' : 'Prioritized Hazard Mitigation & Inspection Queue'}
            </span>
          </div>
        </div>

        <span
          className="badge mono"
          style={{
            fontSize: '10px',
            background: rankedItems.length > 0 ? 'rgba(0, 242, 254, 0.1)' : 'rgba(255, 255, 255, 0.04)',
            color: rankedItems.length > 0 ? 'var(--sonar-cyan)' : 'var(--text-muted)',
            border: `1px solid ${rankedItems.length > 0 ? 'rgba(0, 242, 254, 0.25)' : 'var(--border-subtle)'}`,
          }}
        >
          {rankedItems.length} {rankedItems.length === 1 ? 'Target Ranked' : 'Targets Ranked'}
        </span>
      </div>

      {/* Ranked Detections List */}
      {rankedItems.length === 0 ? (
        <div
          id="cleanup-order-empty-state"
          data-testid="cleanup-order-empty-state"
          style={{
            padding: '20px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-sm)',
            border: '1px dashed var(--border-subtle)',
            fontSize: '12px',
          }}
        >
          No detections available for prioritization.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '280px', overflowY: 'auto' }}>
          {rankedItems.map((item) => {
            const isSelected = selectedAnomalyId === item.detection.id;
            const { priorityData } = item;

            return (
              <div
                key={item.detection.id || item.rank}
                onClick={() => onSelectAnomaly(item.detection.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: isSelected ? 'rgba(0, 242, 254, 0.12)' : 'var(--bg-surface)',
                  border: isSelected ? '1px solid var(--border-active)' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  gap: '10px',
                }}
              >
                {/* Left: Rank & Identification */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <span
                    className="mono"
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: item.rank === 1 ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${item.rank === 1 ? 'rgba(244, 63, 94, 0.4)' : 'var(--border-subtle)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: item.rank === 1 ? '#fda4af' : 'var(--text-secondary)',
                      flexShrink: 0,
                    }}
                  >
                    {item.rank}
                  </span>

                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span className="mono" style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {item.detection.id}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>→</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--sonar-cyan)' }}>
                        {item.detection.class_name.toUpperCase()}
                      </span>
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {priorityData.recommendedAction}
                    </span>
                  </div>
                </div>

                {/* Right: Priority Score & Severity Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'flex-end' }}>
                      <span
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: priorityData.severityColor,
                          boxShadow: `0 0 6px ${priorityData.severityColor}`,
                          display: 'inline-block',
                        }}
                      />
                      <span
                        className="mono"
                        style={{
                          fontSize: '13px',
                          fontWeight: 800,
                          color: priorityData.severityColor,
                        }}
                      >
                        {priorityData.priority}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>/ 100</span>
                    </div>
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        color: priorityData.severityColor,
                        textTransform: 'uppercase',
                      }}
                    >
                      {priorityData.severityLabel}
                    </span>
                  </div>

                  <ArrowRight size={13} color="var(--text-muted)" style={{ opacity: isSelected ? 1 : 0.4 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Context Note */}
      <div
        style={{
          fontSize: '10px',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '6px',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <span>Ranked by Simulated Priority Score</span>
        <span className="mono" style={{ color: 'var(--sonar-cyan)' }}>
          Model Context: {target.toUpperCase()}
        </span>
      </div>
    </div>
  );
};
