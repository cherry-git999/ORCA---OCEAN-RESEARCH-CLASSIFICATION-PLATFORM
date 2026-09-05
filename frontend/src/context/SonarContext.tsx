import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { Detection, ReviewStatus, SonarScanItem } from '../types/detection';
import { FilterParams } from '../types/filter';
import { BackendAnalysisResponse } from '../types/api';
import { DEMO_SCANS } from '../data/demoData';
import { analyzeSonarImage } from '../api/analysisApi';
import { checkBackendHealth } from '../api/healthApi';
import { generateImagePreview } from '../utils/imagePreview';
import { mapBackendResponseToScanItem } from '../utils/adapters';

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
  locationSource: 'demo' | 'sonar_metadata';
  setLocationSource: (source: 'demo' | 'sonar_metadata') => void;
  addUploadedScan: (scan: SonarScanItem) => void;
  
  // Phase 8.2 Real Backend Integration additions
  backendStatus: 'online' | 'offline' | 'checking';
  isLiveAnalysis: boolean;
  isAnalyzing: boolean;
  analysisError: string | null;
  lastBackendResponse: BackendAnalysisResponse | null;
  currentRawFile: File | null;
  executeLiveAnalysis: (file: File, target: 'pipeline' | 'human') => Promise<boolean>;
  clearAnalysisError: () => void;
  refreshHealth: () => Promise<void>;
}

const DEFAULT_FILTERS: FilterParams = {
  minConfidence: 0.25, // 25% permissive default matching base model threshold
  minBoxWidth: 0,
  maxBoxWidth: 16000,
  minBoxHeight: 0,
  maxBoxHeight: 16000,
  targetClass: 'All',
  reviewStatus: 'All',
  confidenceCategory: 'All',
  searchQuery: '',
  isRawView: false, // Default is filtered view
};

const SonarContext = createContext<SonarContextType | undefined>(undefined);

const SESSION_SCANS_KEY = 'aquasentinel_scans_v1';
const SESSION_ACTIVE_ID_KEY = 'aquasentinel_active_id_v1';
const SESSION_LIVE_FLAG_KEY = 'aquasentinel_is_live_v1';

export const SonarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scans, setScans] = useState<SonarScanItem[]>(() => {
    try {
      const cached = sessionStorage.getItem(SESSION_SCANS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEMO_SCANS;
  });

  const [activeScanId, setActiveScanId] = useState<string>(() => {
    try {
      const cached = sessionStorage.getItem(SESSION_ACTIVE_ID_KEY);
      if (cached) return cached;
    } catch (e) {}
    return 'SSS_2026_0905_001';
  });

  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>('ANM-001');
  const [filters, setFilters] = useState<FilterParams>(DEFAULT_FILTERS);
  const [locationSource, setLocationSource] = useState<'demo' | 'sonar_metadata'>('demo');

  // Backend Integration State
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [isLiveAnalysis, setIsLiveAnalysis] = useState<boolean>(() => {
    try {
      const cached = sessionStorage.getItem(SESSION_LIVE_FLAG_KEY);
      if (cached) return cached === 'true';
    } catch (e) {}
    return false;
  });
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [lastBackendResponse, setLastBackendResponse] = useState<BackendAnalysisResponse | null>(null);
  const [currentRawFile, setCurrentRawFile] = useState<File | null>(null);

  // Synchronize activeScanId and live flag with sessionStorage
  const changeActiveScanId = (id: string) => {
    setActiveScanId(id);
    const isLive = id.startsWith('SCAN_');
    setIsLiveAnalysis(isLive);
    try {
      sessionStorage.setItem(SESSION_ACTIVE_ID_KEY, id);
      sessionStorage.setItem(SESSION_LIVE_FLAG_KEY, isLive ? 'true' : 'false');
    } catch (e) {}
  };

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
    return scans.find((s) => s.id === activeScanId) || scans[0];
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
    setScans((prevScans) =>
      prevScans.map((scan) => {
        if (scan.id !== activeScan?.id) return scan;
        return {
          ...scan,
          detections: scan.detections.map((det) =>
            det.id === detectionId ? { ...det, review_status: status } : det
          ),
        };
      })
    );
  };

  const addUploadedScan = (newScan: SonarScanItem) => {
    setScans((prev) => [newScan, ...prev]);
    setActiveScanId(newScan.id);
    if (newScan.detections.length > 0) {
      setSelectedAnomalyId(newScan.detections[0].id);
    } else {
      setSelectedAnomalyId(null);
    }
  };

  /**
   * Execute real live analysis against FastAPI /analyze endpoint.
   * Enforces strict STALE-STATE ISOLATION: previous detections are cleared
   * before running, and if the API call fails, previous boxes are NEVER shown.
   */
  const executeLiveAnalysis = async (file: File, target: 'pipeline' | 'human'): Promise<boolean> => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    // Stale-state isolation: unselect anomaly immediately & reset filters to permissive default
    setSelectedAnomalyId(null);
    setFilters(DEFAULT_FILTERS);

    try {
      // 1. Generate browser-safe preview (defensive Netpbm P6/P5 or standard raster)
      const previewData = await generateImagePreview(file);
      const fileSizeKb = Math.round(file.size / 1024);

      // 2. Dispatch real multipart/form-data to FastAPI /analyze
      const apiResponse = await analyzeSonarImage(file, target);

      // 3. Map real response into domain SonarScanItem
      const liveScanItem = mapBackendResponseToScanItem(apiResponse, previewData.previewUrl, fileSizeKb, file);

      // 4. Update scan inventory and active state
      setScans((prev) => {
        const next = [liveScanItem, ...prev.filter((s) => !s.id.startsWith('SCAN_LIVE_TEMP'))];
        try {
          sessionStorage.setItem(SESSION_SCANS_KEY, JSON.stringify(next));
        } catch (e) {
          console.warn('Could not cache full scans to sessionStorage:', e);
        }
        return next;
      });
      changeActiveScanId(liveScanItem.id);
      setLastBackendResponse(apiResponse);
      setCurrentRawFile(file);
      setIsLiveAnalysis(true);

      // 5. Select first detected anomaly if available
      if (liveScanItem.detections.length > 0) {
        setSelectedAnomalyId(liveScanItem.detections[0].id);
      } else {
        setSelectedAnomalyId(null);
      }

      setIsAnalyzing(false);
      return true;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown analysis error occurred';
      setAnalysisError(errorMsg);

      // Stale-State Rule: create an empty error scan so previous detections are NOT displayed over this image
      const previewData = await generateImagePreview(file).catch(() => ({
        previewUrl: '',
        width: 1600,
        height: 480,
      }));

      const errorScanItem: SonarScanItem = {
        id: `ERROR_${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
        target,
        model_name: target === 'pipeline' ? 'Pipeline Specialist' : 'Human Specialist',
        status: 'Pending',
        mission_id: 'TRANSECT-ERROR',
        image: {
          filename: file.name,
          width: previewData.width,
          height: previewData.height,
          size_kb: Math.round(file.size / 1024),
          format: file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN',
          preview_url: previewData.previewUrl,
        },
        location: {
          source: 'unavailable',
          latitude: null,
          longitude: null,
          accuracy: null,
          description: 'Analysis failed; no location telemetry',
        },
        detections: [], // ZERO detections to ensure stale boxes never appear!
      };

      setScans((prev) => [errorScanItem, ...prev]);
      setActiveScanId(errorScanItem.id);
      setSelectedAnomalyId(null);
      setCurrentRawFile(null);

      setIsAnalyzing(false);
      return false;
    }
  };

  const allDetections = activeScan ? activeScan.detections : [];
  const rawDetectionsCount = allDetections.length;

  const filteredDetections = useMemo(() => {
    if (!activeScan) return [];
    if (filters.isRawView) {
      // Raw view: returns all detections directly from backend
      return activeScan.detections;
    }

    return activeScan.detections.filter((det) => {
      // 1. Min confidence filter
      if (det.confidence < filters.minConfidence) return false;

      // 2. Bounding box size filter
      const width = Math.abs(det.bbox.x2 - det.bbox.x1);
      const height = Math.abs(det.bbox.y2 - det.bbox.y1);
      if (width < filters.minBoxWidth || width > filters.maxBoxWidth) return false;
      if (height < filters.minBoxHeight || height > filters.maxBoxHeight) return false;

      // 3. Target class filter
      if (filters.targetClass !== 'All' && det.class_name !== filters.targetClass) return false;

      // 4. Review status filter
      if (filters.reviewStatus !== 'All' && det.review_status !== filters.reviewStatus) return false;

      // 5. Confidence category filter
      if (filters.confidenceCategory !== 'All') {
        const cat = det.confidence >= 0.8 ? 'HIGH' : det.confidence >= 0.5 ? 'MEDIUM' : 'LOW';
        if (cat !== filters.confidenceCategory) return false;
      }

      // 6. Search query
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
        setActiveScanId: changeActiveScanId,
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
        backendStatus,
        isLiveAnalysis,
        isAnalyzing,
        analysisError,
        lastBackendResponse,
        currentRawFile,
        executeLiveAnalysis,
        clearAnalysisError,
        refreshHealth,
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
