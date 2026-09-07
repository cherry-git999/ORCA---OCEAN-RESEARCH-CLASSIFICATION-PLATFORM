import React from 'react';
import { useSonar } from '../context/SonarContext';
import { ExportActions } from '../components/reports/ExportActions';
import { JsonReportViewer } from '../components/reports/JsonReportViewer';
import { EmptyState } from '../components/common/EmptyState';
import { FileText, CheckCircle2, Compass, Radio, Target, ListOrdered } from 'lucide-react';
import { getSimulatedPriority, getSortedDetectionsByPriority } from '../utils/detectionPriority';

export const ReportsPage: React.FC = () => {
  const { activeScan, scans, activeScanId, setActiveScanId } = useSonar();

  if (!activeScan) {
    return (
      <div className="animate-fade-in" style={{ padding: '40px 0' }}>
        <EmptyState
          type="no_scan"
          title="NO SCAN AVAILABLE FOR REPORT"
          description="Complete a scan analysis to view and export operational PDF, CSV, and JSON mission reports."
          actionText="Analyze Scan"
          onAction={() => {
            window.location.hash = '#/analyze';
          }}
        />
      </div>
    );
  }

  const totalAnomalies = activeScan.detections.length;
  const highConf = activeScan.detections.filter((d) => d.confidence >= 0.8).length;
  const routingConfText =
    activeScan.routingConfidence != null
      ? `${(activeScan.routingConfidence * 100).toFixed(1)}%`
      : 'N/A';
  const isHardware = !!activeScan.isHardwareScan;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Scan Selector if multiple scans exist */}
      {scans.length > 1 && (
        <div
          className="glass-panel"
          style={{
            padding: '12px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Select Analyzed Scan for Report:
          </span>
          <select
            className="form-select mono"
            value={activeScanId}
            onChange={(e) => setActiveScanId(e.target.value)}
            style={{ padding: '6px 12px', fontSize: '12px', width: 'auto' }}
          >
            {scans.map((s) => (
              <option key={s.id} value={s.id}>
                {s.image.filename} — {s.target.toUpperCase()} ({s.detections.length} detections){s.isHardwareScan ? ' [HARDWARE]' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Mission Summary Card */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(0, 242, 254, 0.12)',
                color: 'var(--sonar-cyan)',
              }}
            >
              <FileText size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>ORCA SCAN ANALYSIS MISSION REPORT</h3>
                {isHardware && (
                  <span
                    id="report-hardware-tag"
                    className="badge badge-cyan"
                    style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Radio size={10} />
                    <span>LIVE HARDWARE SCAN</span>
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '4px', fontSize: '11.5px' }}>
                <span className="mono" style={{ color: 'var(--text-muted)' }}>
                  <strong>SCAN ID:</strong> {activeScan.id}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>•</span>
                <span className="mono" style={{ color: 'var(--text-muted)' }}>
                  <strong>SCAN FILENAME:</strong> <span style={{ color: 'var(--text-primary)' }}>{activeScan.image.filename}</span>
                </span>
                <span style={{ color: 'var(--text-muted)' }}>•</span>
                <span className="mono" style={{ color: 'var(--text-muted)' }}>
                  <strong>TIMESTAMP:</strong> <span style={{ color: 'var(--text-primary)' }}>{activeScan.timestamp}</span>
                </span>
                {isHardware && (
                  <>
                    <span style={{ color: 'var(--text-muted)' }}>•</span>
                    <span className="mono" style={{ color: 'var(--sonar-cyan)', fontWeight: 700 }}>
                      <strong>DISTANCE OF THE OBJECT:</strong> {activeScan.hardwareDistance || '11.28 cm'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <span className="badge badge-emerald">
            <CheckCircle2 size={12} />
            Verified Report Ready
          </span>
        </div>

        {/* Statistical Summary Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isHardware ? 'repeat(auto-fit, minmax(130px, 1fr))' : 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
            background: 'var(--bg-surface)',
            padding: '16px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Specialist Model
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--sonar-cyan)', marginTop: '2px' }}>
              {activeScan.model_name}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Swath Format
            </div>
            <div className="mono" style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px' }}>
              {activeScan.image.width} × {activeScan.image.height} px
            </div>
          </div>

          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Routing Confidence
            </div>
            <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8', marginTop: '2px' }}>
              {routingConfText}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Detections
            </div>
            <div
              className="mono"
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: totalAnomalies > 0 ? 'var(--text-highlight)' : 'var(--text-muted)',
                marginTop: '2px',
              }}
            >
              {totalAnomalies} {totalAnomalies === 1 ? 'Object' : 'Objects'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              High Conf (≥80%)
            </div>
            <div className="mono" style={{ fontSize: '15px', fontWeight: 700, color: '#34d399', marginTop: '2px' }}>
              {highConf}
            </div>
          </div>

          {/* CONDITIONAL METRIC TILE: ONLY PRESENT ON HARDWARE SCANS */}
          {isHardware && (
            <div
              id="report-distance-summary-tile"
              data-testid="report-distance-summary-tile"
              style={{
                background: 'rgba(0, 242, 254, 0.08)',
                border: '1px solid rgba(0, 242, 254, 0.3)',
                borderRadius: 'var(--radius-xs)',
                padding: '4px 8px',
              }}
            >
              <div style={{ fontSize: '10px', color: 'var(--sonar-cyan)', textTransform: 'uppercase', fontWeight: 700 }}>
                Distance of the Object
              </div>
              <div className="mono" style={{ fontSize: '15px', fontWeight: 800, color: 'var(--sonar-cyan)', marginTop: '2px' }}>
                {activeScan.hardwareDistance || '11.28 cm'}
              </div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>
                (Physical Sonar Intake)
              </div>
            </div>
          )}

          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Survey Coordinates
            </div>
            <div className="mono" style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', marginTop: '2px' }}>
              {activeScan.location.latitude != null
                ? `${activeScan.location.latitude > 0 ? activeScan.location.latitude.toFixed(2) + '°N' : Math.abs(activeScan.location.latitude).toFixed(2) + '°S'}, ${
                    activeScan.location.longitude != null && activeScan.location.longitude > 0
                      ? activeScan.location.longitude.toFixed(2) + '°E'
                      : Math.abs(activeScan.location.longitude || 0).toFixed(2) + '°W'
                  }`
                : '15.35°N, 73.45°E'}
            </div>
            <div style={{ fontSize: '9px', color: '#fbbf24', marginTop: '2px', fontWeight: 500 }}>
              (Estimated - Not highly accurate)
            </div>
          </div>
        </div>

        {/* Offshore Marine Survey Environment Telemetry Bar */}
        <div
          style={{
            marginTop: '14px',
            padding: '10px 16px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(7, 14, 28, 0.65)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Compass size={16} color="var(--sonar-cyan)" />
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Marine Survey Sector:</strong>{' '}
              {activeScan.location.description || 'Arabian Sea Offshore Basin (Estimated - Not highly accurate)'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-amber" style={{ fontSize: '9px' }}>
              ESTIMATED (APPROXIMATE)
            </span>
            <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Datum: WGS-84 Hydrographic
            </span>
          </div>
        </div>
      </div>

      {/* CLEANUP / INSPECTION ORDER (Operational Intelligence Layer) */}
      {(() => {
        const rankedDetections = getSortedDetectionsByPriority(activeScan.detections, activeScan.target);
        const isHumanContext = (activeScan.target || '').toLowerCase().includes('human');

        return (
          <div
            id="report-cleanup-order-card"
            data-testid="report-cleanup-order-card"
            className="glass-panel"
            style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    padding: '7px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(0, 242, 254, 0.12)',
                    color: 'var(--sonar-cyan)',
                  }}
                >
                  <ListOrdered size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    CLEANUP / INSPECTION ORDER
                  </h3>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                    {isHumanContext
                      ? 'Ranked anomaly queue for verification, welfare assessment, and operator confirmation.'
                      : 'Ranked anomaly queue for priority hazard mitigation, retrieval, and structural inspection.'}
                  </p>
                </div>
              </div>

              <span className="badge badge-cyan mono" style={{ fontSize: '11px' }}>
                {rankedDetections.length} Prioritized Targets
              </span>
            </div>

            {rankedDetections.length === 0 ? (
              <div
                id="report-cleanup-empty"
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
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '10px',
                }}
              >
                {rankedDetections.map((item) => (
                  <div
                    key={item.detection.id}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <span
                        className="mono"
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: item.rank === 1 ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          border: `1px solid ${item.rank === 1 ? 'rgba(244, 63, 94, 0.4)' : 'var(--border-subtle)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 800,
                          color: item.rank === 1 ? '#fda4af' : 'var(--text-secondary)',
                          flexShrink: 0,
                        }}
                      >
                        {item.rank}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span className="mono" style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '12.5px' }}>
                            {item.detection.id}
                          </span>
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                          <span style={{ fontWeight: 700, color: 'var(--sonar-cyan)', fontSize: '12.5px' }}>
                            {item.detection.class_name.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {item.priorityData.recommendedAction}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'flex-end' }}>
                        <span
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            background: item.priorityData.severityColor,
                            display: 'inline-block',
                          }}
                        />
                        <span className="mono" style={{ fontSize: '14px', fontWeight: 800, color: item.priorityData.severityColor }}>
                          {item.priorityData.priority}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>/ 100</span>
                      </div>
                      <span
                        className="badge mono"
                        style={{
                          fontSize: '8.5px',
                          background: `${item.priorityData.severityColor}18`,
                          color: item.priorityData.severityColor,
                          border: `1px solid ${item.priorityData.severityColor}40`,
                          padding: '1px 4px',
                          marginTop: '2px',
                        }}
                      >
                        {item.priorityData.severityLabel}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Mission Detection Breakdown Table */}
      <div
        id="mission-detection-breakdown-panel"
        data-testid="mission-detection-breakdown-panel"
        className="glass-panel"
        style={{ padding: '22px' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '18px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                padding: '7px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(0, 242, 254, 0.12)',
                color: 'var(--sonar-cyan)',
              }}
            >
              <Target size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, letterSpacing: '0.03em' }}>
                MISSION DETECTION BREAKDOWN
              </h3>
              <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Granular object telemetry, confidence scoring, and review status for each identified anomaly.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isHardware ? (
              <span
                id="report-hardware-intake-badge"
                data-testid="report-hardware-intake-badge"
                className="badge badge-cyan"
                style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <Radio size={11} />
                <span>PHYSICAL HARDWARE SCAN (DISTANCE ENABLED)</span>
              </span>
            ) : (
              <span className="badge badge-blue" style={{ fontSize: '10px' }}>
                STANDARD SWATH SCAN
              </span>
            )}
            <span className="badge badge-ghost mono" style={{ fontSize: '11px' }}>
              {activeScan.detections.length} Total Targets
            </span>
          </div>
        </div>

        {/* Table Container */}
        <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-medium)' }}>
          <table
            id="report-detections-table"
            data-testid="report-detections-table"
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '12px',
            }}
          >
            <thead>
              <tr
                style={{
                  background: 'rgba(7, 14, 28, 0.95)',
                  borderBottom: '1px solid var(--border-medium)',
                  color: 'var(--text-muted)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                <th style={{ padding: '12px 14px' }}>#</th>
                <th style={{ padding: '12px 14px' }}>Anomaly ID</th>
                <th style={{ padding: '12px 14px' }}>Target Class</th>
                <th style={{ padding: '12px 14px' }}>Confidence</th>
                {/* CONDITIONAL COLUMN: ONLY SHOWN IF PHYSICAL HARDWARE SCAN */}
                {isHardware && (
                  <th
                    id="col-header-distance"
                    data-testid="col-header-distance"
                    style={{
                      padding: '12px 14px',
                      color: 'var(--sonar-cyan)',
                      background: 'rgba(0, 242, 254, 0.06)',
                    }}
                  >
                    Distance of the Object
                  </th>
                )}
                <th style={{ padding: '12px 14px' }}>Hazard</th>
                <th style={{ padding: '12px 14px' }}>Location Risk</th>
                <th style={{ padding: '12px 14px', color: 'var(--sonar-cyan)' }}>Priority</th>
                <th style={{ padding: '12px 14px' }}>Recommended Action</th>
                <th style={{ padding: '12px 14px' }}>Review Status</th>
                <th style={{ padding: '12px 14px' }}>Bounding Box [X1, Y1, X2, Y2]</th>
              </tr>
            </thead>
            <tbody>
              {activeScan.detections.length === 0 ? (
                <tr>
                  <td
                    colSpan={isHardware ? 11 : 10}
                    style={{
                      padding: '32px 16px',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontStyle: 'italic',
                    }}
                  >
                    No target anomalies identified in this scan swath above the operational confidence threshold.
                  </td>
                </tr>
              ) : (
                activeScan.detections.map((det, idx) => {
                  const isHighConf = det.confidence >= 0.8;
                  const isMedConf = det.confidence >= 0.5 && det.confidence < 0.8;
                  const confColor = isHighConf ? 'var(--status-emerald)' : isMedConf ? '#38bdf8' : 'var(--status-amber)';
                  const objectDistance = det.distance || activeScan.hardwareDistance || '11.28 cm';
                  const priorityData = getSimulatedPriority(det, activeScan.target);

                  return (
                    <tr
                      key={det.id || idx}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        background: idx % 2 === 0 ? 'rgba(7, 14, 28, 0.35)' : 'rgba(11, 20, 38, 0.5)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td className="mono" style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                        {idx + 1}
                      </td>
                      <td className="mono" style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {det.id}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(0, 242, 254, 0.1)',
                            border: '1px solid rgba(0, 242, 254, 0.25)',
                            color: 'var(--sonar-cyan)',
                            fontWeight: 600,
                            textTransform: 'capitalize',
                          }}
                        >
                          {det.class_name}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="mono" style={{ fontWeight: 700, color: confColor }}>
                            {(det.confidence * 100).toFixed(1)}%
                          </span>
                          <div
                            style={{
                              width: '45px',
                              height: '4px',
                              borderRadius: '2px',
                              background: 'rgba(255,255,255,0.1)',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(100, Math.round(det.confidence * 100))}%`,
                                height: '100%',
                                background: confColor,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* CONDITIONAL CELL: ONLY SHOWN IF PHYSICAL HARDWARE SCAN */}
                      {isHardware && (
                        <td
                          data-testid={`cell-distance-${det.id || idx}`}
                          style={{
                            padding: '12px 14px',
                            background: 'rgba(0, 242, 254, 0.03)',
                          }}
                        >
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <Radio size={12} color="var(--sonar-cyan)" />
                            <span
                              className="mono"
                              style={{
                                fontWeight: 800,
                                color: 'var(--sonar-cyan)',
                                fontSize: '13px',
                              }}
                            >
                              {objectDistance}
                            </span>
                          </div>
                        </td>
                      )}

                      {/* Hazard */}
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          className="badge"
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            background:
                              priorityData.hazard === 'Very High'
                                ? 'rgba(244, 63, 94, 0.15)'
                                : priorityData.hazard === 'High'
                                ? 'rgba(249, 115, 22, 0.15)'
                                : 'rgba(0, 242, 254, 0.1)',
                            color:
                              priorityData.hazard === 'Very High'
                                ? 'var(--status-rose)'
                                : priorityData.hazard === 'High'
                                ? 'var(--status-amber)'
                                : 'var(--sonar-cyan)',
                            border: `1px solid ${
                              priorityData.hazard === 'Very High'
                                ? 'rgba(244, 63, 94, 0.3)'
                                : priorityData.hazard === 'High'
                                ? 'rgba(249, 115, 22, 0.3)'
                                : 'rgba(0, 242, 254, 0.3)'
                            }`,
                          }}
                        >
                          {priorityData.hazard}
                        </span>
                      </td>

                      {/* Location Risk */}
                      <td style={{ padding: '12px 14px' }}>
                        <span className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {priorityData.locationRisk}
                        </span>
                      </td>

                      {/* Priority */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            className="mono"
                            style={{ fontWeight: 800, fontSize: '13px', color: priorityData.severityColor }}
                          >
                            {priorityData.priority}
                          </span>
                          <span
                            className="badge mono"
                            style={{
                              fontSize: '8.5px',
                              background: `${priorityData.severityColor}18`,
                              color: priorityData.severityColor,
                              border: `1px solid ${priorityData.severityColor}35`,
                              padding: '1px 4px',
                            }}
                          >
                            {priorityData.severityLabel}
                          </span>
                        </div>
                      </td>

                      {/* Recommended Action */}
                      <td style={{ padding: '12px 14px', fontSize: '11px', color: 'var(--text-primary)', maxWidth: '160px' }}>
                        {priorityData.recommendedAction}
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <span
                          className={`badge ${
                            det.review_status === 'confirmed'
                              ? 'badge-emerald'
                              : det.review_status === 'rejected'
                              ? 'badge-rose'
                              : 'badge-amber'
                          }`}
                          style={{ fontSize: '10px' }}
                        >
                          {det.review_status?.toUpperCase() || 'PENDING'}
                        </span>
                      </td>

                      <td className="mono" style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '11px' }}>
                        [{det.bbox.x1}, {det.bbox.y1}, {det.bbox.x2}, {det.bbox.y2}]
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Action Controls */}
      <ExportActions scan={activeScan} />

      {/* Structured JSON Report Preview */}
      <JsonReportViewer scan={activeScan} />
    </div>
  );
};

