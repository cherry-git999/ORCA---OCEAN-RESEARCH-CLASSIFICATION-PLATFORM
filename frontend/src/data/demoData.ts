import { ModelInfo, MissionStats, SonarScanItem } from '../types/detection';

// High-fidelity synthetic side-scan sonar SVG background data URIs
const createSonarSvgDataUrl = (type: 'pipeline' | 'human' | 'empty') => {
  const width = 1600;
  const height = 480;

  let content = '';
  if (type === 'pipeline') {
    // Pipeline acoustic backscatter: linear high-intensity acoustic reflection + acoustic shadow
    content = `
      <!-- Seabed Acoustic Backscatter Texture -->
      <filter id="sonarNoise">
        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise"/>
        <feColorMatrix type="matrix" values="
          0 0 0 0 0.08
          0 0 0 0 0.18
          0 0 0 0 0.28
          0 0 0 0.9 0" />
      </filter>
      <rect width="100%" height="100%" fill="#071220"/>
      <rect width="100%" height="100%" filter="url(#sonarNoise)" opacity="0.6"/>

      <!-- Nadir / Water Column Track (Center dark strip in side-scan sonar) -->
      <rect x="0" y="225" width="1600" height="30" fill="#03070f" opacity="0.85"/>
      <line x1="0" y1="240" x2="1600" y2="240" stroke="#00f2fe" stroke-dasharray="8 8" stroke-width="1" opacity="0.4"/>

      <!-- Acoustic Shadow & Pipeline 1 (Submerged Trunkline) -->
      <path d="M 120,180 L 780,185 L 780,205 L 120,200 Z" fill="#020408" opacity="0.95" />
      <path d="M 118,172 L 782,177 L 782,185 L 118,180 Z" fill="#4facfe" opacity="0.95" filter="drop-shadow(0 0 6px #00f2fe)" />
      
      <!-- Pipeline Segment 2 (Exposed Flowline with Scour Mark) -->
      <path d="M 860,280 L 1480,290 L 1480,312 L 860,302 Z" fill="#020408" opacity="0.9" />
      <path d="M 858,272 L 1482,282 L 1482,290 L 858,280 Z" fill="#38bdf8" opacity="0.9" />

      <!-- Acoustic Ripple Field -->
      <ellipse cx="450" cy="380" rx="140" ry="40" fill="#0f2b48" opacity="0.3" />
      <ellipse cx="1150" cy="110" rx="180" ry="35" fill="#0f2b48" opacity="0.25" />
    `;
  } else if (type === 'human') {
    // Diver acoustic silhouette: localized high reflection torso/fins + elongated acoustic shadow
    content = `
      <rect width="100%" height="100%" fill="#06101c"/>
      <!-- Seabed texture -->
      <circle cx="300" cy="200" r="180" fill="#0d2238" opacity="0.4"/>
      <circle cx="900" cy="300" r="220" fill="#0b1b2d" opacity="0.5"/>
      <line x1="0" y1="240" x2="1600" y2="240" stroke="#38bdf8" stroke-dasharray="10 10" stroke-width="1" opacity="0.3"/>

      <!-- Diver 1 Silhouette & Acoustic Return -->
      <!-- Shadow -->
      <path d="M 440,160 Q 470,140 500,165 L 530,195 L 480,205 Z" fill="#02050b" opacity="0.95"/>
      <!-- Bright Return (torso, scuba tank, fins) -->
      <ellipse cx="430" cy="155" rx="18" ry="12" fill="#e0f2fe" filter="drop-shadow(0 0 8px #00f2fe)"/>
      <path d="M 415,160 L 390,175 L 395,185 L 420,165 Z" fill="#38bdf8"/>

      <!-- Diver 2 Silhouette & Return (Secondary target) -->
      <ellipse cx="880" cy="270" rx="22" ry="14" fill="#bae6fd" filter="drop-shadow(0 0 6px #38bdf8)"/>
      <path d="M 895,275 L 945,310 L 935,320 L 885,285 Z" fill="#02050b" opacity="0.9"/>
    `;
  } else {
    // Clear seabed
    content = `
      <rect width="100%" height="100%" fill="#060e1a"/>
      <line x1="0" y1="240" x2="1600" y2="240" stroke="#00f2fe" stroke-dasharray="12 12" stroke-width="1" opacity="0.25"/>
      <ellipse cx="800" cy="240" rx="600" ry="180" fill="#0a1a2e" opacity="0.4"/>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${content}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const DEMO_MODELS: ModelInfo[] = [
  {
    id: 'model1',
    name: 'YOLOv8n Pipeline Specialist',
    role: 'Subsea Pipeline & Flowline Specialist',
    target: 'Pipeline',
    architecture: 'YOLOv8n (PyTorch / Ultralytics)',
    status: 'READY',
    dataset: 'SubPipeMiniSSS (1,240 acoustic images)',
  },
  {
    id: 'model2',
    name: 'YOLOv8n Human Specialist',
    role: 'Acoustic Diver & Subsurface Human Specialist',
    target: 'Human',
    architecture: 'YOLOv8n (PyTorch / Ultralytics)',
    status: 'READY',
    dataset: 'AquaScan-1K (1,050 sonar frames)',
  },
];

export const DEMO_MISSION_STATS: MissionStats = {
  scansAnalyzed: 128,
  anomaliesDetected: 347,
  highConfidence: 219,
  requiresReview: 42,
  currentMissionId: 'SSS_2026_0905_001',
};

export const DEMO_SCANS: SonarScanItem[] = [
  {
    id: 'SSS_2026_0905_001',
    timestamp: '2026-09-05 08:30:14 UTC',
    target: 'pipeline',
    model_name: 'YOLOv8n Pipeline Specialist',
    status: 'Complete',
    mission_id: 'TRANSECT-ALPHA-NORTH',
    image: {
      filename: 'sonar_scan_subpipe_001.pbm',
      width: 1600,
      height: 480,
      size_kb: 2304,
      format: 'PBM (Netpbm P6/PPM sonar stream)',
      preview_url: createSonarSvgDataUrl('pipeline'),
    },
    location: {
      source: 'demo',
      latitude: 57.1497,
      longitude: -2.0943,
      accuracy: 4.5,
      transect_id: 'LINE-04-N',
      description: 'North Sea Continental Shelf (DEMO COORDINATES - Test Location)',
    },
    detections: [
      {
        id: 'ANM-001',
        class_id: 0,
        class_name: 'Pipeline',
        confidence: 0.942,
        bbox: { x1: 110, y1: 160, x2: 790, y2: 215 },
        model: 'Pipeline Specialist',
        review_status: 'confirmed',
        notes: 'Exposed subsea trunkline with prominent acoustic shadow signature.',
      },
      {
        id: 'ANM-002',
        class_id: 0,
        class_name: 'Pipeline',
        confidence: 0.871,
        bbox: { x1: 850, y1: 265, x2: 1490, y2: 320 },
        model: 'Pipeline Specialist',
        review_status: 'confirmed',
        notes: 'Secondary flowline segment exhibiting seafloor scouring.',
      },
      {
        id: 'ANM-003',
        class_id: 0,
        class_name: 'Pipeline',
        confidence: 0.684,
        bbox: { x1: 420, y1: 150, x2: 580, y2: 220 },
        model: 'Pipeline Specialist',
        review_status: 'review_required',
        notes: 'Potential pipeline junction flange or structural clamp.',
      },
      {
        id: 'ANM-004',
        class_id: 0,
        class_name: 'Pipeline',
        confidence: 0.815,
        bbox: { x1: 980, y1: 270, x2: 1220, y2: 315 },
        model: 'Pipeline Specialist',
        review_status: 'pending',
        notes: 'Continuous steel casing boundary.',
      },
      {
        id: 'ANM-005',
        class_id: 0,
        class_name: 'Pipeline',
        confidence: 0.543,
        bbox: { x1: 240, y1: 170, x2: 360, y2: 210 },
        model: 'Pipeline Specialist',
        review_status: 'review_required',
        notes: 'Moderate confidence return near sand wave ridge.',
      },
      {
        id: 'ANM-006',
        class_id: 0,
        class_name: 'Pipeline',
        confidence: 0.478, // Low confidence candidate (<50%)
        bbox: { x1: 1300, y1: 280, x2: 1440, y2: 325 },
        model: 'Pipeline Specialist',
        review_status: 'pending',
        notes: 'Acoustic reflection edge candidate.',
      },
      {
        id: 'ANM-007',
        class_id: 0,
        class_name: 'Pipeline',
        confidence: 0.382, // Low confidence candidate
        bbox: { x1: 720, y1: 180, x2: 810, y2: 215 },
        model: 'Pipeline Specialist',
        review_status: 'rejected',
        notes: 'Filtered acoustic noise edge on rocky outcrop.',
      },
    ],
  },
  {
    id: 'SSS_2026_0905_002',
    timestamp: '2026-09-05 10:14:52 UTC',
    target: 'human',
    model_name: 'YOLOv8n Human Specialist',
    status: 'Complete',
    mission_id: 'TRANSECT-BRAVO-SEARCH',
    image: {
      filename: 'sonar_scan_aquascan_diver_002.jpg',
      width: 1600,
      height: 480,
      size_kb: 1450,
      format: 'JPEG (High-frequency sidescan sonar)',
      preview_url: createSonarSvgDataUrl('human'),
    },
    location: {
      source: 'demo',
      latitude: 54.5260,
      longitude: 13.5420,
      accuracy: 3.2,
      transect_id: 'SEARCH-GRID-B2',
      description: 'Baltic Sea Coastal Sector (DEMO COORDINATES - Test Location)',
    },
    detections: [
      {
        id: 'ANM-101',
        class_id: 1,
        class_name: 'Human',
        confidence: 0.924,
        bbox: { x1: 380, y1: 135, x2: 540, y2: 215 },
        model: 'Human Specialist',
        review_status: 'confirmed',
        notes: 'Commercial diver acoustic profile with scuba harness echo.',
      },
      {
        id: 'ANM-102',
        class_id: 1,
        class_name: 'Human',
        confidence: 0.841,
        bbox: { x1: 860, y1: 250, x2: 960, y2: 330 },
        model: 'Human Specialist',
        review_status: 'confirmed',
        notes: 'Subsurface personnel acoustic shadow and twin-tank signature.',
      },
      {
        id: 'ANM-103',
        class_id: 1,
        class_name: 'Human',
        confidence: 0.612,
        bbox: { x1: 290, y1: 180, x2: 370, y2: 240 },
        model: 'Human Specialist',
        review_status: 'review_required',
        notes: 'Potential trailing safety tether or buoyancy apparatus.',
      },
    ],
  },
  {
    id: 'SSS_2026_0904_004',
    timestamp: '2026-09-04 16:45:00 UTC',
    target: 'pipeline',
    model_name: 'YOLOv8n Pipeline Specialist',
    status: 'Complete',
    mission_id: 'TRANSECT-ECHO-BASELINE',
    image: {
      filename: 'sonar_scan_clear_seabed_003.png',
      width: 1600,
      height: 480,
      size_kb: 1820,
      format: 'PNG (Baseline sonar bathymetry)',
      preview_url: createSonarSvgDataUrl('empty'),
    },
    location: {
      source: 'demo',
      latitude: 57.1950,
      longitude: -2.0410,
      accuracy: 5.0,
      transect_id: 'BASELINE-E1',
      description: 'Aberdeen Outer Basin (DEMO COORDINATES - Test Location)',
    },
    detections: [], // Empty detections to test empty state
  },
];

export const DEMO_SURVEY_TRACK = [
  { lat: 57.1400, lng: -2.1200 },
  { lat: 57.1450, lng: -2.1080 },
  { lat: 57.1497, lng: -2.0943 },
  { lat: 57.1550, lng: -2.0800 },
  { lat: 57.1620, lng: -2.0650 },
  { lat: 57.1700, lng: -2.0500 },
];
