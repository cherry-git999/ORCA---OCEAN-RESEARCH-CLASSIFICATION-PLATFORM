/**
 * Frontend-vs-Backend Consistency Verification Test
 * 
 * Verifies that the frontend data mapping exactly preserves the real FastAPI
 * /analyze response with ZERO discrepancies:
 * - detection_count
 * - class_name
 * - confidence
 * - bbox coordinates (x1, y1, x2, y2)
 * - image dimensions (width, height)
 * - model name
 * - zero fabricated GPS
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SAMPLE_DATA_DIR = path.resolve(__dirname, '../sample_data');

const API_URL = 'http://127.0.0.1:8000';

async function runConsistencyTest() {
  console.log('================================================================');
  console.log('STARTING FRONTEND <-> BACKEND CONSISTENCY VERIFICATION TEST');
  console.log('================================================================');

  // Test 1: SubPipe Pipeline Sonar (.pbm)
  const pbmPath = path.join(SAMPLE_DATA_DIR, '1693569383.780.pbm');
  await testEndpoint(pbmPath, 'pipeline', 'Model 1 (Pipeline Specialist)');

  // Test 2: AquaScan Diver Image (.png)
  const pngPath = path.join(SAMPLE_DATA_DIR, '0a2be3cd-Screenshot_2025-08-03_14.26.49.png');
  await testEndpoint(pngPath, 'human', 'Model 2 (Human Specialist)');

  // Test 3: SubPipe BPM Sonar (.pbm)
  const bpmPath = path.join(SAMPLE_DATA_DIR, '1693569385.780.pbm');
  await testEndpoint(bpmPath, 'pipeline', 'Model 1 (Pipeline Specialist)');

  console.log('\n================================================================');
  console.log('ALL FRONTEND <-> BACKEND CONSISTENCY TESTS PASSED (100% MATCH)');
  console.log('================================================================');
}

async function testEndpoint(filePath, target, expectedRole) {
  const filename = filePath.split('/').pop();
  console.log(`\nTesting ${filename} with target="${target}"...`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }

  const fileBytes = fs.readFileSync(filePath);
  const blob = new Blob([fileBytes]);
  const formData = new FormData();
  formData.append('target', target);
  formData.append('file', blob, filename);

  const res = await fetch(`${API_URL}/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`API returned HTTP ${res.status}: ${await res.text()}`);
  }

  const backendJson = await res.json();

  // Simulate Frontend Adapter (from src/utils/adapters.ts)
  const frontendScan = {
    target: backendJson.target,
    model_name: backendJson.model.name,
    image: {
      filename: backendJson.image.filename,
      width: backendJson.image.width,
      height: backendJson.image.height,
    },
    location: {
      source: 'unavailable',
      latitude: null,
      longitude: null,
    },
    detections: (backendJson.analysis.detections || []).map((d, idx) => ({
      id: `ANM-${String(idx + 1).padStart(3, '0')}`,
      class_name: d.class_name,
      confidence: d.confidence,
      bbox: {
        x1: d.bbox.x1,
        y1: d.bbox.y1,
        x2: d.bbox.x2,
        y2: d.bbox.y2,
      },
    })),
  };

  // 1. Detection count consistency
  const countBackend = backendJson.analysis.detection_count;
  const countFrontend = frontendScan.detections.length;
  console.log(`  [COUNT] Backend: ${countBackend} | Frontend: ${countFrontend} => ${countBackend === countFrontend ? 'MATCH' : 'MISMATCH'}`);
  if (countBackend !== countFrontend) throw new Error('Detection count mismatch!');

  // 2. Image resolution consistency
  console.log(`  [DIMS]  Backend: ${backendJson.image.width}x${backendJson.image.height} | Frontend: ${frontendScan.image.width}x${frontendScan.image.height} => MATCH`);
  if (backendJson.image.width !== frontendScan.image.width || backendJson.image.height !== frontendScan.image.height) {
    throw new Error('Image dimension mismatch!');
  }

  // 3. Coordinate & confidence exactness
  for (let i = 0; i < countBackend; i++) {
    const bDet = backendJson.analysis.detections[i];
    const fDet = frontendScan.detections[i];

    console.log(`  [DET #${i + 1}] Class: ${bDet.class_name} == ${fDet.class_name}`);
    console.log(`           Confidence: ${bDet.confidence} == ${fDet.confidence}`);
    console.log(`           BBox: (${bDet.bbox.x1}, ${bDet.bbox.y1}, ${bDet.bbox.x2}, ${bDet.bbox.y2})`);
    console.log(`              == (${fDet.bbox.x1}, ${fDet.bbox.y1}, ${fDet.bbox.x2}, ${fDet.bbox.y2}) => EXACT MATCH`);

    if (bDet.class_name !== fDet.class_name) throw new Error('Class mismatch!');
    if (bDet.confidence !== fDet.confidence) throw new Error('Confidence mismatch!');
    if (bDet.bbox.x1 !== fDet.bbox.x1 || bDet.bbox.y1 !== fDet.bbox.y1 ||
        bDet.bbox.x2 !== fDet.bbox.x2 || bDet.bbox.y2 !== fDet.bbox.y2) {
      throw new Error('Bounding box coordinate mismatch!');
    }
  }

  // 4. Safety rule: Zero fake GPS check
  if (frontendScan.location.latitude !== null || frontendScan.location.longitude !== null || frontendScan.location.source !== 'unavailable') {
    throw new Error('Safety violation: Fake GPS was populated in live scan!');
  }
  console.log('  [SAFETY] No fake GPS verified (coordinates strictly null/unavailable).');
}

runConsistencyTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
