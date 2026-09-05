import React from 'react';
import { Detection, TargetClass, ReviewStatus } from '../../types/detection';
import { Search, SlidersHorizontal, Crosshair, ArrowUpDown } from 'lucide-react';

interface DetectionTableProps {
  detections: Detection[];
  selectedAnomalyId: string | null;
  onSelectAnomaly: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  targetClassFilter: 'All' | TargetClass;
  onTargetClassFilterChange: (cls: 'All' | TargetClass) => void;
  reviewStatusFilter: 'All' | ReviewStatus;
  onReviewStatusFilterChange: (st: 'All' | ReviewStatus) => void;
}

export const DetectionTable: React.FC<DetectionTableProps> = ({
  detections,
  selectedAnomalyId,
  onSelectAnomaly,
  searchQuery,
  onSearchChange,
  targetClassFilter,
  onTargetClassFilterChange,
  reviewStatusFilter,
  onReviewStatusFilterChange,
}) => {
  return (
    <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Table Header Controls: Search & Dropdowns */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600 }}>CANDIDATE DETECTION TABLE</h4>
          <span className="badge badge-cyan" style={{ fontSize: '10px' }}>
            {detections.length} Entries
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', width: '180px' }}>
            <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search ID / Notes..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '30px', paddingRight: '8px', fontSize: '12px', height: '32px' }}
            />
          </div>

          {/* Class Filter */}
          <select
            className="form-select"
            value={targetClassFilter}
            onChange={(e) => onTargetClassFilterChange(e.target.value as 'All' | TargetClass)}
            style={{ width: 'auto', fontSize: '12px', height: '32px', padding: '4px 8px' }}
          >
            <option value="All">All Classes</option>
            <option value="Pipeline">Pipeline</option>
            <option value="Human">Human</option>
          </select>

          {/* Review Status Filter */}
          <select
            className="form-select"
            value={reviewStatusFilter}
            onChange={(e) => onReviewStatusFilterChange(e.target.value as 'All' | ReviewStatus)}
            style={{ width: 'auto', fontSize: '12px', height: '32px', padding: '4px 8px' }}
          >
            <option value="All">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="review_required">Requires Review</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table Element */}
      <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-medium)' }}>
              <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}># ID</th>
              <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>CLASS</th>
              <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>CONFIDENCE</th>
              <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>X1</th>
              <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Y1</th>
              <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>X2</th>
              <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Y2</th>
              <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>PIXEL SIZE</th>
              <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>STATUS</th>
              <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {detections.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No candidate anomalies match the active filters or no detections found in this scan.
                </td>
              </tr>
            ) : (
              detections.map((det) => {
                const isSelected = selectedAnomalyId === det.id;
                const width = Math.round(Math.abs(det.bbox.x2 - det.bbox.x1));
                const height = Math.round(Math.abs(det.bbox.y2 - det.bbox.y1));

                const confPercent = (det.confidence * 100).toFixed(2);
                let confBadge = 'badge-rose';
                if (det.confidence >= 0.8) confBadge = 'badge-emerald';
                else if (det.confidence >= 0.5) confBadge = 'badge-cyan';

                let statusBadge = 'badge-amber';
                if (det.review_status === 'confirmed') statusBadge = 'badge-emerald';
                else if (det.review_status === 'rejected') statusBadge = 'badge-rose';

                return (
                  <tr
                    key={det.id}
                    onClick={() => onSelectAnomaly(det.id)}
                    style={{
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border-subtle)',
                      background: isSelected ? 'rgba(0, 242, 254, 0.12)' : 'transparent',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <td style={{ padding: '10px 14px' }}>
                      <span className="mono" style={{ fontWeight: 700, color: isSelected ? 'var(--sonar-cyan)' : 'var(--text-primary)' }}>
                        {det.id}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className="badge badge-cyan">{det.class_name}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="mono" style={{ fontWeight: 600 }}>{confPercent}%</span>
                        <span className={`badge ${confBadge}`} style={{ fontSize: '9px' }}>
                          {det.confidence >= 0.8 ? 'HIGH' : det.confidence >= 0.5 ? 'MED' : 'LOW'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className="mono" style={{ color: 'var(--text-secondary)' }}>{det.bbox.x1}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className="mono" style={{ color: 'var(--text-secondary)' }}>{det.bbox.y1}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className="mono" style={{ color: 'var(--text-secondary)' }}>{det.bbox.x2}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className="mono" style={{ color: 'var(--text-secondary)' }}>{det.bbox.y2}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className="mono" style={{ color: 'var(--text-secondary)' }}>
                        {width} × {height} px
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className={`badge ${statusBadge}`}>
                        {det.review_status.toUpperCase().replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAnomaly(det.id);
                        }}
                        className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ padding: '3px 8px', fontSize: '11px' }}
                      >
                        <Crosshair size={12} />
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
