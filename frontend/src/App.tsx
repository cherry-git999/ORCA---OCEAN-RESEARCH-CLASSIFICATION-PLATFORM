import React, { useState, useEffect } from 'react';
import { SonarProvider } from './context/SonarContext';
import { Sidebar, NavRoute } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { SystemStatusModal } from './components/layout/SystemStatusModal';
import { DashboardPage } from './pages/DashboardPage';
import { AnalyzePage } from './pages/AnalyzePage';
import { DetectionWorkspacePage } from './pages/DetectionWorkspacePage';
import { GeospatialPage } from './pages/GeospatialPage';
import { ReportsPage } from './pages/ReportsPage';
import { HistoryPage } from './pages/HistoryPage';
import { HardwarePage } from './pages/HardwarePage';

export const App: React.FC = () => {
  // Sync route with URL hash for easy browser navigation & bookmarking
  const getInitialRoute = (): NavRoute => {
    const hash = window.location.hash.replace('#/', '').replace('#', '');
    const validRoutes: NavRoute[] = ['dashboard', 'analyze', 'detections', 'geospatial', 'reports', 'history', 'hardware'];
    return validRoutes.includes(hash as NavRoute) ? (hash as NavRoute) : 'dashboard';
  };

  const [currentRoute, setCurrentRoute] = useState<NavRoute>(getInitialRoute);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '').replace('#', '');
      const validRoutes: NavRoute[] = ['dashboard', 'analyze', 'detections', 'geospatial', 'reports', 'history', 'hardware'];
      if (validRoutes.includes(hash as NavRoute)) {
        setCurrentRoute(hash as NavRoute);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (route: NavRoute) => {
    setCurrentRoute(route);
    window.location.hash = `#/${route}`;
  };

  const renderActivePage = () => {
    switch (currentRoute) {
      case 'dashboard':
        return <DashboardPage onNavigate={handleNavigate} />;
      case 'analyze':
        return <AnalyzePage onNavigate={handleNavigate} />;
      case 'detections':
        return <DetectionWorkspacePage onNavigate={handleNavigate} />;
      case 'geospatial':
        return <GeospatialPage onNavigate={handleNavigate} />;
      case 'reports':
        return <ReportsPage />;
      case 'history':
        return <HistoryPage onNavigate={handleNavigate} />;
      case 'hardware':
        return <HardwarePage onNavigate={handleNavigate} />;
      default:
        return <DashboardPage onNavigate={handleNavigate} />;
    }
  };

  return (
    <SonarProvider>
      <div className="app-layout">
        {/* Persistent Left Sidebar */}
        <Sidebar
          currentRoute={currentRoute}
          onNavigate={handleNavigate}
          onOpenStatusModal={() => setIsStatusModalOpen(true)}
        />

        {/* Main Content Area */}
        <div className="app-main">
          {/* Top Bar Header */}
          <Topbar
            currentRoute={currentRoute}
            onOpenStatusModal={() => setIsStatusModalOpen(true)}
          />

          {/* Page Body */}
          <main className="app-content">
            {renderActivePage()}
          </main>
        </div>

        {/* Global System Telemetry Status Modal */}
        <SystemStatusModal
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
        />
      </div>
    </SonarProvider>
  );
};

export default App;
