import React, { useState } from 'react';
import { FilterParams } from '../../types/filter';
import { Sliders, Filter, ChevronDown, ChevronUp, RotateCcw, ShieldAlert, Check } from 'lucide-react';

interface FilterControlPanelProps {
  filters: FilterParams;
  onUpdateFilters: (partial: Partial<FilterParams>) => void;
  onResetFilters: () => void;
  rawCount: number;
  filteredCount: number;
}

export const FilterControlPanel: React.FC<FilterControlPanelProps> = ({
  filters,
  onUpdateFilters,
  onResetFilters,
  rawCount,
  filteredCount,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const filteredOutCount = Math.max(rawCount - filteredCount, 0);

  return (
    <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Top Header & Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} color="var(--sonar-cyan)" />
          <h4 style={{ fontSize: '15.5px', fontWeight: 600 }}>CANDIDATE DETECTION FILTERING</h4>
        </div>

        {/* RAW vs FILTERED Toggle Button */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-surface-elevated)',
          padding: '2px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-medium)',
        }}>
          <button
            onClick={() => onUpdateFilters({ isRawView: false })}
            style={{
              padding: '5px 12px',
              fontSize: '12.5px',
              fontWeight: 600,
              borderRadius: 'var(--radius-xs)',
              border: 'none',
              cursor: 'pointer',
              background: !filters.isRawView ? 'var(--sonar-cyan)' : 'transparent',
              color: !filters.isRawView ? '#040812' : 'var(--text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            FILTERED VIEW
          </button>
          <button
            onClick={() => onUpdateFilters({ isRawView: true })}
            style={{
              padding: '5px 12px',
              fontSize: '12.5px',
              fontWeight: 600,
              borderRadius: 'var(--radius-xs)',
              border: 'none',
              cursor: 'pointer',
              background: filters.isRawView ? 'var(--status-amber)' : 'transparent',
              color: filters.isRawView ? '#040812' : 'var(--text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            RAW VIEW
          </button>
        </div>
      </div>

      {/* Summary Counts Display */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '8px',
        background: 'var(--bg-surface)',
        padding: '10px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-subtle)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Raw Candidates
          </div>
          <div className="mono" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {rawCount}
          </div>
        </div>
        <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Visible Detections
          </div>
          <div className="mono" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--sonar-cyan)' }}>
            {filteredCount}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Filtered Out
          </div>
          <div className="mono" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--status-rose)' }}>
            {filteredOutCount}
          </div>
        </div>
      </div>

      {/* Primary Confidence Slider */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label style={{ fontSize: '13.5px', fontWeight: 600 }}>
            Minimum Detection Confidence:
          </label>
          <span className="mono badge badge-cyan" style={{ fontSize: '12px' }}>
            {Math.round(filters.minConfidence * 100)}%
          </span>
        </div>

        <input
          type="range"
          min="25"
          max="100"
          value={Math.round(filters.minConfidence * 100)}
          onChange={(e) => onUpdateFilters({ minConfidence: Number(e.target.value) / 100 })}
          className="range-slider"
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
          <span>25% (Permissive / Default)</span>
          <span>50% (Standard)</span>
          <span>100% (Strict)</span>
        </div>
      </div>

      {/* Quick Category Buttons: High / Medium / Low */}
      <div>
        <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
          Confidence Category Filter:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
          {(['All', 'HIGH', 'MEDIUM', 'LOW'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => onUpdateFilters({ confidenceCategory: cat })}
              className={`btn btn-sm ${filters.confidenceCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '5px 8px', fontSize: '12px' }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Expandable Noise & BBox Geometry Filter */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '13.5px',
            cursor: 'pointer',
            padding: '4px 0',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sliders size={13} color="var(--sonar-teal)" />
            Bounding Box Dimension Constraints
          </span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {isExpanded && (
          <div style={{
            marginTop: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            padding: '10px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-surface)',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Min Width (px)</label>
                <input
                  type="number"
                  value={filters.minBoxWidth}
                  onChange={(e) => onUpdateFilters({ minBoxWidth: Number(e.target.value) })}
                  className="form-input"
                  style={{ padding: '6px 8px', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Max Width (px)</label>
                <input
                  type="number"
                  value={filters.maxBoxWidth}
                  onChange={(e) => onUpdateFilters({ maxBoxWidth: Number(e.target.value) })}
                  className="form-input"
                  style={{ padding: '6px 8px', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Min Height (px)</label>
                <input
                  type="number"
                  value={filters.minBoxHeight}
                  onChange={(e) => onUpdateFilters({ minBoxHeight: Number(e.target.value) })}
                  className="form-input"
                  style={{ padding: '6px 8px', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Max Height (px)</label>
                <input
                  type="number"
                  value={filters.maxBoxHeight}
                  onChange={(e) => onUpdateFilters({ maxBoxHeight: Number(e.target.value) })}
                  className="form-input"
                  style={{ padding: '6px 8px', fontSize: '13px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
              <button onClick={onResetFilters} className="btn btn-ghost btn-sm">
                <RotateCcw size={12} />
                Reset Defaults
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Safety Notice */}
      <div style={{
        fontSize: '11.5px',
        color: 'var(--text-muted)',
        background: 'rgba(56, 189, 248, 0.04)',
        border: '1px dashed var(--border-subtle)',
        padding: '6px 8px',
        borderRadius: 'var(--radius-xs)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <ShieldAlert size={12} color="var(--sonar-cyan)" />
        <span>Detection filtering uses deterministic geometric and threshold rules (not an uncalibrated noise classifier).</span>
      </div>
    </div>
  );
};
