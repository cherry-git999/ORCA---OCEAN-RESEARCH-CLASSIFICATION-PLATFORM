export interface HardwareImageItem {
  filename: string;
  dataUrl: string;
  sizeBytes: number;
  dimensions?: { width: number; height: number };
  fileType: string;
  receivedAt: string;
}

export interface HardwareSonarItem {
  filename: string;
  rawText: string;
  sizeBytes: number;
  lineCount: number;
  fileType: string;
  receivedAt: string;
}

export interface HardwareCapture {
  id: string;
  captureNumber: number;
  timestamp: string;
  image?: HardwareImageItem | null;
  sonar?: HardwareSonarItem | null;
  sourceEndpoint: string;
  status: 'waiting' | 'partial' | 'received';
  analysisStatus: 'NOT_STARTED';
}

export type HardwareConnectionState = 'checking' | 'waiting' | 'online' | 'offline' | 'error';
