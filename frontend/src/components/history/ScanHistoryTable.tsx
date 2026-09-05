import React, { useState } from 'react';
import { SonarScanItem } from '../../types/detection';
import { History, Search, ArrowRight, Eye, Calendar, HardDrive } from 'lucide-react';

interface ScanHistoryTableProps {
  scans: SonarScanItem[];
  activeScanId: string;
  onSelectScan: (id: string) => void;
  onOpenWorkspace: () => void;
}

export const ScanHistoryTable: React.FC<ScanHistoryTableProps> = ({
  scans,
  activeScanId,
  onSelectScan,
  onOpenWorkspace,
}) => {
  const [targetFilter, setTargetFilter] = useState<'All' | 'pipeline' | 'human'>('All');
  const [search, setSearch] = useState<string>('');

  const filteredScans = scans.filter((scan) => {
    if (targetFilter !== 'All' && scan.target !== targetFilter) return false;
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      return (
        scan.id.toLowerCase().includes(q) ||
        scan.image.filename.toLowerCase().includes(q) ||
        scan.mission_id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header & Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 600 }}>ACOUSTIC SCAN MISSION LOGS</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Archived Side-Scan Sonar Surveys & Inference Runs</p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative', width: '200px' }}>
            <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search Scan ID / Mission..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '30px', fontSize: '12px', height: '32px' }}
            />
          </div>

          <select
            className="form-select"
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value as 'All' | 'pipeline' | 'human')}
            style={{ width: 'auto', fontSize: '12px', height: '32px', padding: '4px 8px' }}
          >
            <option value="All">All Targets</option>
            <option value="pipeline">Pipeline Specialist</option>
            <option value="human">Human Specialist</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-medium)' }}>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>SCAN ID</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>TIMESTAMP</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>TARGET / MODEL</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>ANOMALIES</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>ACOUSTIC FILE</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>STATUS</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filteredScans.map((scan) => {
              const isActive = scan.id === activeScanId;
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
                        {scan.id}
                      </span>
                      {isActive && (
                        <span className="badge badge-cyan" style={{ fontSize: '9px', padding: '1px 5px' }}>
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {scan.mission_id}
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
                    <span className="mono" style={{
                      fontWeight: 700,
                      fontSize: '13px',
                      color: scan.detections.length > 0 ? 'var(--text-highlight)' : 'var(--text-muted)',
                    }}>
                      {scan.detections.length} detections
                    </span>
                  </td>

                  <td style={{ padding: '12px 16px' }}>
                    <div className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {scan.image.filename}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {scan.image.width} × {scan.image.height} px ({scan.image.size_kb} KB)
                    </div>
                  </td>

                  <td style={{ padding: '12px 16px' }}>
                    <span className="badge badge-emerald">{scan.status}</span>
                  </td>

                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => {
                        onSelectScan(scan.id);
                        onOpenWorkspace();
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      <Eye size={12} />
                      Inspect
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
