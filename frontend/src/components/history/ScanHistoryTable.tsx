import React, { useState } from 'react';
import { SonarScanItem } from '../../types/detection';
import { useSonar } from '../../context/SonarContext';
import { Search, Eye, Calendar, Trash2 } from 'lucide-react';
import { EmptyState } from '../common/EmptyState';

interface ScanHistoryTableProps {
  scans: SonarScanItem[];
  activeScanId: string;
  onSelectScan: (id: string) => void;
  onOpenWorkspace: () => void;
  onNavigateToAnalyze?: () => void;
}

export const ScanHistoryTable: React.FC<ScanHistoryTableProps> = ({
  scans,
  activeScanId,
  onSelectScan,
  onOpenWorkspace,
  onNavigateToAnalyze,
}) => {
  const { deleteScan, clearHistory } = useSonar();
  const [targetFilter, setTargetFilter] = useState<'All' | 'pipeline' | 'human' | 'hardware'>('All');
  const [search, setSearch] = useState<string>('');

  if (scans.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '32px' }}>
        <EmptyState
          type="no_scan"
          title="NO SCAN HISTORY YET"
          description="Completed scans will appear here. Ingest an image in the analysis workspace to record your first operational scan."
          actionText="Analyze First Scan"
          onAction={onNavigateToAnalyze || (() => { window.location.hash = '#/analyze'; })}
        />
      </div>
    );
  }

  const filteredScans = scans.filter((scan) => {
    if (targetFilter !== 'All' && scan.target.toLowerCase() !== targetFilter.toLowerCase()) return false;
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      return (
        scan.id.toLowerCase().includes(q) ||
        scan.image.filename.toLowerCase().includes(q) ||
        scan.model_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 600 }}>SCAN HISTORY INVENTORY</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Persistent Browser Storage ({scans.length} {scans.length === 1 ? 'Scan' : 'Scans'} Recorded)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '220px' }}>
            <Search
              size={13}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search Filename / ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '30px', fontSize: '12px', height: '32px' }}
            />
          </div>

          <select
            className="form-select"
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value as 'All' | 'pipeline' | 'human' | 'hardware')}
            style={{ width: 'auto', fontSize: '12px', height: '32px', padding: '4px 8px' }}
          >
            <option value="All">All Targets</option>
            <option value="pipeline">Pipeline</option>
            <option value="human">Human</option>
            <option value="hardware">Hardware</option>
          </select>

          <button
            onClick={() => {
              if (window.confirm('Clear all local scan history?')) {
                clearHistory();
              }
            }}
            className="btn btn-ghost btn-sm"
            title="Clear Scan History"
            style={{ fontSize: '11px', color: 'var(--text-muted)' }}
          >
            <Trash2 size={13} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-medium)' }}>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>SCAN FILE</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>TIMESTAMP</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>TARGET / MODEL</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>ROUTING</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>DETECTIONS</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredScans.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No scans match the current filter.
                </td>
              </tr>
            ) : (
              filteredScans.map((scan) => {
                const isActive = scan.id === activeScanId;
                const routingText =
                  scan.routingConfidence != null
                    ? `${(scan.routingConfidence * 100).toFixed(1)}%`
                    : 'Manual';

                return (
                  <tr
                    key={scan.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: isActive ? 'rgba(0, 242, 254, 0.08)' : 'transparent',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="mono" style={{ fontWeight: 700, color: isActive ? 'var(--sonar-cyan)' : 'var(--text-primary)' }}>
                          {scan.image.filename}
                        </span>
                        {isActive && (
                          <span className="badge badge-cyan" style={{ fontSize: '9px', padding: '1px 5px' }}>
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {scan.id} • {scan.image.width} × {scan.image.height} px
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                        <Calendar size={13} color="var(--sonar-teal)" />
                        <span>{scan.timestamp}</span>
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span className="badge badge-cyan" style={{ marginBottom: '2px', display: 'inline-block' }}>
                        {scan.target.toUpperCase()}
                      </span>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {scan.model_name}
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span className="mono" style={{ fontSize: '12px', fontWeight: 600, color: scan.isAutoRouted ? '#a855f7' : 'var(--text-secondary)' }}>
                        {routingText}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span
                        className="mono"
                        style={{
                          fontWeight: 700,
                          fontSize: '13px',
                          color: scan.detections.length > 0 ? '#34d399' : 'var(--text-muted)',
                        }}
                      >
                        {scan.detections.length} {scan.detections.length === 1 ? 'detection' : 'detections'}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => {
                            onSelectScan(scan.id);
                            onOpenWorkspace();
                          }}
                          className="btn btn-secondary btn-sm"
                          title="Open in Detection Workspace"
                        >
                          <Eye size={12} />
                          <span>Inspect</span>
                        </button>

                        <button
                          onClick={() => deleteScan(scan.id)}
                          className="btn btn-ghost btn-sm"
                          title="Delete Scan"
                          style={{ color: '#fb7185' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
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
