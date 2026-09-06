import React from 'react';
import { useSonar } from '../context/SonarContext';
import { ScanHistoryTable } from '../components/history/ScanHistoryTable';

interface HistoryPageProps {
  onNavigate: (route: 'detections' | 'analyze') => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onNavigate }) => {
  const { scans, activeScanId, setActiveScanId } = useSonar();

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <ScanHistoryTable
        scans={scans}
        activeScanId={activeScanId}
        onSelectScan={(id) => setActiveScanId(id)}
        onOpenWorkspace={() => onNavigate('detections')}
        onNavigateToAnalyze={() => onNavigate('analyze')}
      />
    </div>
  );
};
