import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { Detection, ReviewStatus, SonarScanItem } from '../types/detection';
import { FilterParams } from '../types/filter';
import { BackendAnalysisResponse } from '../types/api';
import { checkBackendHealth } from '../api/healthApi';
import {
  getScanHistory,
  saveScan,
  deleteScan as removeStoredScan,
  clearScanHistory as wipeStoredHistory,
  updateStoredDetectionReviewStatus,
  StoredScanRecord,
} from '../utils/scanHistoryStorage';

import { getWaterCoordinatesForScan } from '../utils/geoCoordinates';

interface SonarContextType {
  scans: SonarScanItem[];
  activeScanId: string;
  activeScan: SonarScanItem | undefined;
  setActiveScanId: (id: string) => void;
  selectedAnomalyId: string | null;
  setSelectedAnomalyId: (id: string | null) => void;
  filters: FilterParams;
  updateFilters: (partial: Partial<FilterParams>) => void;
  resetFilters: () => void;
  updateReviewStatus: (detectionId: string, status: ReviewStatus) => void;
  filteredDetections: Detection[];
  rawDetectionsCount: number;
  filteredDetectionsCount: number;
  locationSource: 'estimated' | 'sonar_metadata' | 'unavailable';
  setLocationSource: (source: 'estimated' | 'sonar_metadata' | 'unavailable') => void;
  addUploadedScan: (scan: SonarScanItem) => void;
  deleteScan: (id: string) => void;
  clearHistory: () => void;
  reviewCounts: { confirmed: number; rejected: number; review_required: number };

  // Real Backend Health & Telemetry State
  backendStatus: 'online' | 'offline' | 'checking';
  isAnalyzing: boolean;
  setIsAnalyzing: (analyzing: boolean) => void;
  analysisError: string | null;
  setAnalysisError: (err: string | null) => void;
  lastBackendResponse: BackendAnalysisResponse | null;
  setLastBackendResponse: (res: BackendAnalysisResponse | null) => void;
  currentRawFile: File | null;
  setCurrentRawFile: (file: File | null) => void;
  clearAnalysisError: () => void;
  refreshHealth: () => Promise<void>;
  lastAnalysisTimestamp: string | null;
}

const DEFAULT_FILTERS: FilterParams = {
  minConfidence: 0.25,
  minBoxWidth: 0,
  maxBoxWidth: 16000,
  minBoxHeight: 0,
  maxBoxHeight: 16000,
  targetClass: 'All',
  reviewStatus: 'All',
  confidenceCategory: 'All',
  searchQuery: '',
  isRawView: false,
};

function storedToScanItem(stored: StoredScanRecord): SonarScanItem {
  return {
    id: stored.id,
    timestamp: stored.timestamp,
    target: stored.target,
    model_name: stored.model,
    status: 'Complete',
    mission_id: stored.mission_id || 'SURVEY_RUN',
    image: {
      filename: stored.filename,
      width: stored.width,
      height: stored.height,
      size_kb: stored.size_kb || 0,
      format: stored.filename.split('.').pop()?.toUpperCase() || 'SCAN',
      preview_url: stored.imageData || '',
    },
    detections: stored.detections.map((d) => ({
      id: d.id,
      class_id: d.class_id,
      class_name: d.class_name,
      confidence: d.confidence,
      bbox: d.bbox,
      model: stored.model,
      review_status: d.review_status || 'pending',
    })),
    location:
      stored.location && stored.location.latitude !== null
        ? stored.location
        : getWaterCoordinatesForScan(stored.filename),
    routingConfidence: stored.routingConfidence,
    isAutoRouted: stored.isAutoRouted,
  };
}

const SonarContext = createContext<SonarContextType | undefined>(undefined);

export const SonarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize scans directly from browser localStorage (operational persistent storage)
  const [scans, setScans] = useState<SonarScanItem[]>(() => {
    try {
      const stored = getScanHistory();
      return stored.map(storedToScanItem);
    } catch {
      return [];
    }
  });

  const [activeScanId, setActiveScanId] = useState<string>(() => {
    const stored = getScanHistory();
    return stored.length > 0 ? stored[0].id : '';
  });

  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>(() => {
    const stored = getScanHistory();
    if (stored.length > 0 && stored[0].detections.length > 0) {
      return stored[0].detections[0].id;
    }
    return null;
  });

  const [filters, setFilters] = useState<FilterParams>(DEFAULT_FILTERS);
  const [locationSource, setLocationSource] = useState<'estimated' | 'sonar_metadata' | 'unavailable'>('estimated');

  // Backend Integration State
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [lastBackendResponse, setLastBackendResponse] = useState<BackendAnalysisResponse | null>(null);
  const [currentRawFile, setCurrentRawFile] = useState<File | null>(null);
  const [lastAnalysisTimestamp, setLastAnalysisTimestamp] = useState<string | null>(() => {
    const stored = getScanHistory();
    return stored.length > 0 ? stored[0].timestamp : null;
  });

  // Poll Backend Health Status
  const refreshHealth = async () => {
    const health = await checkBackendHealth();
    setBackendStatus(health.isHealthy ? 'online' : 'offline');
  };

  useEffect(() => {
    refreshHealth();
    const interval = setInterval(refreshHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const activeScan = useMemo(() => {
    if (!activeScanId) return scans.length > 0 ? scans[0] : undefined;
    return scans.find((s) => s.id === activeScanId) || (scans.length > 0 ? scans[0] : undefined);
  }, [scans, activeScanId]);

  const updateFilters = (partial: Partial<FilterParams>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const clearAnalysisError = () => {
    setAnalysisError(null);
  };

  const updateReviewStatus = (detectionId: string, status: ReviewStatus) => {
    if (!activeScan) return;
    updateStoredDetectionReviewStatus(activeScan.id, detectionId, status);
    setScans((prevScans) =>
      prevScans.map((scan) => {
        if (scan.id !== activeScan.id) return scan;
        return {
          ...scan,
          detections: scan.detections.map((det) =>
            det.id === detectionId ? { ...det, review_status: status } : det
          ),
        };
      })
    );
  };

  const reviewCounts = useMemo(() => {
    let confirmed = 0;
    let rejected = 0;
    let review_required = 0;
    for (const scan of scans) {
      for (const det of scan.detections) {
        if (det.review_status === 'confirmed') confirmed++;
        else if (det.review_status === 'rejected') rejected++;
        else if (det.review_status === 'review_required') review_required++;
      }
    }
    return { confirmed, rejected, review_required };
  }, [scans]);

  /**
   * Adds an analyzed scan, updates active state, and persists to localStorage.
   */
  const addUploadedScan = (newScan: SonarScanItem) => {
    setScans((prev) => [newScan, ...prev.filter((s) => s.id !== newScan.id)]);
    setActiveScanId(newScan.id);
    setLastAnalysisTimestamp(newScan.timestamp);

    if (newScan.detections.length > 0) {
      setSelectedAnomalyId(newScan.detections[0].id);
    } else {
      setSelectedAnomalyId(null);
    }

    // Persist to localStorage
    const record: StoredScanRecord = {
      id: newScan.id,
      timestamp: newScan.timestamp,
      filename: newScan.image.filename,
      model: newScan.model_name,
      target: newScan.target,
      routingConfidence: newScan.routingConfidence,
      isAutoRouted: newScan.isAutoRouted,
      detections: newScan.detections.map((d) => ({
        id: d.id,
        class_id: d.class_id,
        class_name: d.class_name,
        confidence: d.confidence,
        bbox: d.bbox,
        review_status: d.review_status || 'pending',
      })),
      location: newScan.location,
      imageData: newScan.image.preview_url,
      width: newScan.image.width,
      height: newScan.image.height,
      size_kb: newScan.image.size_kb,
      mission_id: newScan.mission_id,
    };
    saveScan(record);
  };

  /**
   * Deletes a scan from both state and localStorage.
   */
  const deleteScan = (id: string) => {
    removeStoredScan(id);
    setScans((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (activeScanId === id) {
        setActiveScanId(next.length > 0 ? next[0].id : '');
        setSelectedAnomalyId(next.length > 0 && next[0].detections.length > 0 ? next[0].detections[0].id : null);
      }
      return next;
    });
  };

  /**
   * Clears all scan history.
   */
  const clearHistory = () => {
    wipeStoredHistory();
    setScans([]);
    setActiveScanId('');
    setSelectedAnomalyId(null);
  };

  const allDetections = activeScan ? activeScan.detections : [];
  const rawDetectionsCount = allDetections.length;

  const filteredDetections = useMemo(() => {
    if (!activeScan) return [];
    if (filters.isRawView) {
      return activeScan.detections;
    }

    return activeScan.detections.filter((det) => {
      if (det.confidence < filters.minConfidence) return false;

      const width = Math.abs(det.bbox.x2 - det.bbox.x1);
      const height = Math.abs(det.bbox.y2 - det.bbox.y1);
      if (width < filters.minBoxWidth || width > filters.maxBoxWidth) return false;
      if (height < filters.minBoxHeight || height > filters.maxBoxHeight) return false;

      if (filters.targetClass !== 'All' && det.class_name !== filters.targetClass) return false;
      if (filters.reviewStatus !== 'All' && det.review_status !== filters.reviewStatus) return false;

      if (filters.confidenceCategory !== 'All') {
        const cat = det.confidence >= 0.8 ? 'HIGH' : det.confidence >= 0.5 ? 'MEDIUM' : 'LOW';
        if (cat !== filters.confidenceCategory) return false;
      }

      if (filters.searchQuery.trim() !== '') {
        const query = filters.searchQuery.toLowerCase();
        const matchesId = det.id.toLowerCase().includes(query);
        const matchesClass = det.class_name.toLowerCase().includes(query);
        const matchesNotes = det.notes?.toLowerCase().includes(query) ?? false;
        if (!matchesId && !matchesClass && !matchesNotes) return false;
      }

      return true;
    });
  }, [activeScan, filters]);

  const filteredDetectionsCount = filteredDetections.length;

  return (
    <SonarContext.Provider
      value={{
        scans,
        activeScanId,
        activeScan,
        setActiveScanId,
        selectedAnomalyId,
        setSelectedAnomalyId,
        filters,
        updateFilters,
        resetFilters,
        updateReviewStatus,
        filteredDetections,
        rawDetectionsCount,
        filteredDetectionsCount,
        locationSource,
        setLocationSource,
        addUploadedScan,
        deleteScan,
        clearHistory,
        reviewCounts,
        backendStatus,
        isAnalyzing,
        setIsAnalyzing,
        analysisError,
        setAnalysisError,
        lastBackendResponse,
        setLastBackendResponse,
        currentRawFile,
        setCurrentRawFile,
        clearAnalysisError,
        refreshHealth,
        lastAnalysisTimestamp,
      }}
    >
      {children}
    </SonarContext.Provider>
  );
};

export const useSonar = (): SonarContextType => {
  const context = useContext(SonarContext);
  if (!context) {
    throw new Error('useSonar must be used within a SonarProvider');
  }
  return context;
};
