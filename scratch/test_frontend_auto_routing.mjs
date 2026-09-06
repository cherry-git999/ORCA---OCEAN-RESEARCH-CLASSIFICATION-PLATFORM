import fs from 'fs';
import path from 'path';

const FRONTEND_URL = 'http://127.0.0.1:5173';
const BACKEND_URL = 'http://127.0.0.1:8000';

const SUBPIPE_PBM_PATH = '/media/cherry/External Hardisk/ps 57/datasets/SubPipeMiniSSS/DATA/SSS_HF_images/Image/1693569383.780.pbm';
const AQUASCAN_PNG_PATH = '/media/cherry/External Hardisk/ps 57/SIH26057/model2_experiments/datasets/aquascan_1k_clean/images/0002b00e-Screenshot_2025-08-10_23.00.36.png';
const HARDWARE_JPG_PATH = '/media/cherry/External Hardisk/ps 57/SIH26057/model3_experiments/datasets/esp_hardware_clean/images/clip_009.jpg';

async function runStep8IntegrationTests() {
  console.log('================================================================================');
  console.log('STARTING STEP 8: FRONTEND AUTO-ROUTING + DETECTION INTEGRATION TESTS');
  console.log('================================================================================');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (e) {
      console.error(`  [FAIL] ${name}: ${e.message}`);
      failed++;
    }
  }

  // 1. Health check
  await test('FastAPI Backend Health Check (GET /health)', async () => {
    const res = await fetch(`${BACKEND_URL}/health`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.status !== 'ok') throw new Error(`Unexpected status: ${data.status}`);
  });

  // 2. Vite Dev Server check
  await test('Vite Dev Server Serving AquaSentinel Dashboard (GET /)', async () => {
    const res = await fetch(FRONTEND_URL);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const text = await res.text();
    if (!text.includes('AquaSentinel AI')) throw new Error('Dashboard title missing in HTML');
  });

  // 3. Pipeline Canonical via /predict-auto
  await test('Pipeline Canonical Image -> Automatic Route to Pipeline Specialist', async () => {
    const bytes = fs.readFileSync(SUBPIPE_PBM_PATH);
    const blob = new Blob([bytes], { type: 'application/octet-stream' });
    const fd = new FormData();
    fd.append('file', blob, '1693569383.780.pbm');

    const res = await fetch(`${BACKEND_URL}/predict-auto`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);
    const json = await res.json();
    console.log('    Pipeline Routing:', JSON.stringify(json.routing));
    if (json.routing.status !== 'routed') throw new Error(`Expected routed, got ${json.routing.status}`);
    if (json.routing.model !== 'pipeline') throw new Error(`Expected pipeline, got ${json.routing.model}`);
    if (json.routing.target !== 'Pipeline') throw new Error(`Expected Pipeline, got ${json.routing.target}`);
    if (json.routing.confidence < 0.85) throw new Error(`Confidence too low: ${json.routing.confidence}`);
    if (!Array.isArray(json.detections) || json.detections.length === 0) throw new Error('Expected detections');
    if (json.detections[0].class !== 'Pipeline') throw new Error(`Expected class Pipeline, got ${json.detections[0].class}`);
    console.log(`    Detections: ${json.detections.length} objects (class: ${json.detections[0].class}, conf: ${(json.detections[0].confidence*100).toFixed(1)}%)`);
  });

  // 4. Human Canonical via /predict-auto
  await test('Human Canonical Image -> Automatic Route to Human Specialist', async () => {
    const bytes = fs.readFileSync(AQUASCAN_PNG_PATH);
    const blob = new Blob([bytes], { type: 'image/png' });
    const fd = new FormData();
    fd.append('file', blob, '0002b00e-Screenshot_2025-08-10_23.00.36.png');

    const res = await fetch(`${BACKEND_URL}/predict-auto`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);
    const json = await res.json();
    console.log('    Human Routing:', JSON.stringify(json.routing));
    if (json.routing.status !== 'routed') throw new Error(`Expected routed, got ${json.routing.status}`);
    if (json.routing.model !== 'human') throw new Error(`Expected human, got ${json.routing.model}`);
    if (json.routing.target !== 'Human') throw new Error(`Expected Human, got ${json.routing.target}`);
    if (json.routing.confidence < 0.85) throw new Error(`Confidence too low: ${json.routing.confidence}`);
    if (!Array.isArray(json.detections) || json.detections.length === 0) throw new Error('Expected detections');
    if (json.detections[0].class !== 'Human') throw new Error(`Expected class Human, got ${json.detections[0].class}`);
    console.log(`    Detections: ${json.detections.length} objects (class: ${json.detections[0].class}, conf: ${(json.detections[0].confidence*100).toFixed(1)}%)`);
  });

  // 5. Hardware Canonical via /predict-auto
  await test('Hardware Canonical Image -> Automatic Route to Hardware Specialist (Class: clip)', async () => {
    const bytes = fs.readFileSync(HARDWARE_JPG_PATH);
    const blob = new Blob([bytes], { type: 'image/jpeg' });
    const fd = new FormData();
    fd.append('file', blob, 'clip_009.jpg');

    const res = await fetch(`${BACKEND_URL}/predict-auto`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);
    const json = await res.json();
    console.log('    Hardware Routing:', JSON.stringify(json.routing));
    if (json.routing.status !== 'routed') throw new Error(`Expected routed, got ${json.routing.status}`);
    if (json.routing.model !== 'hardware') throw new Error(`Expected hardware, got ${json.routing.model}`);
    if (json.routing.target !== 'Hardware') throw new Error(`Expected Hardware, got ${json.routing.target}`);
    if (json.routing.confidence < 0.85) throw new Error(`Confidence too low: ${json.routing.confidence}`);
    if (!Array.isArray(json.detections) || json.detections.length === 0) throw new Error('Expected detections');
    if (json.detections[0].class !== 'clip') throw new Error(`Expected class clip, got ${json.detections[0].class}`);
    console.log(`    Detections: ${json.detections.length} objects (class: ${json.detections[0].class}, conf: ${(json.detections[0].confidence*100).toFixed(1)}%)`);
  });

  // 6. Degenerate Input Handling
  await test('Degenerate Black Image -> Gated UNCERTAIN State with Zero Specialist Execution', async () => {
    const blackBuffer = fs.readFileSync('scratch/black_test.png');
    const blob = new Blob([blackBuffer], { type: 'image/png' });
    const fd = new FormData();
    fd.append('file', blob, 'black.png');

    const res = await fetch(`${BACKEND_URL}/predict-auto`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);
    const json = await res.json();
    console.log('    Degenerate Response:', JSON.stringify(json.routing));
    if (json.routing.status !== 'uncertain') throw new Error(`Expected uncertain, got ${json.routing.status}`);
    if (json.routing.reason !== 'degenerate_image') throw new Error(`Expected degenerate_image, got ${json.routing.reason}`);
    if (json.detections.length !== 0) throw new Error('Detections must be empty for uncertain state');
  });

  // 7. Corrupt image error handling
  await test('Corrupt Image File -> HTTP 400 Bad Request with Friendly Message', async () => {
    const corruptBuffer = Buffer.from('NOT_AN_IMAGE_CORRUPT_BYTES');
    const blob = new Blob([corruptBuffer], { type: 'image/png' });
    const fd = new FormData();
    fd.append('file', blob, 'corrupt.png');

    const res = await fetch(`${BACKEND_URL}/predict-auto`, { method: 'POST', body: fd });
    if (res.status !== 400) throw new Error(`Expected HTTP 400, got ${res.status}`);
    const json = await res.json();
    if (!json.error) throw new Error('Expected error field in response');
    console.log('    Handled Error:', json.error);
  });

  // 8. Manual /predict regression (Hardware, Pipeline, Human)
  await test('Manual Mode /predict Regression (Pipeline, Human, Hardware targets)', async () => {
    // Hardware
    const hwBytes = fs.readFileSync(HARDWARE_JPG_PATH);
    const fdHw = new FormData();
    fdHw.append('target', 'hardware');
    fdHw.append('image', new Blob([hwBytes], { type: 'image/jpeg' }), 'clip_009.jpg');
    const resHw = await fetch(`${BACKEND_URL}/predict`, { method: 'POST', body: fdHw });
    if (!resHw.ok) throw new Error(`Manual hardware failed: ${resHw.status}`);
    const jsonHw = await resHw.json();
    if (jsonHw.model !== 'hardware') throw new Error('Manual hardware model mismatch');

    // Pipeline
    const pipeBytes = fs.readFileSync(SUBPIPE_PBM_PATH);
    const fdPipe = new FormData();
    fdPipe.append('target', 'pipeline');
    fdPipe.append('image', new Blob([pipeBytes], { type: 'application/octet-stream' }), '1693569383.780.pbm');
    const resPipe = await fetch(`${BACKEND_URL}/predict`, { method: 'POST', body: fdPipe });
    if (!resPipe.ok) throw new Error(`Manual pipeline failed: ${resPipe.status}`);
    const jsonPipe = await resPipe.json();
    if (jsonPipe.model !== 'pipeline') throw new Error('Manual pipeline model mismatch');

    // Human
    const humanBytes = fs.readFileSync(AQUASCAN_PNG_PATH);
    const fdHuman = new FormData();
    fdHuman.append('target', 'human');
    fdHuman.append('image', new Blob([humanBytes], { type: 'image/png' }), '0002b00e.png');
    const resHuman = await fetch(`${BACKEND_URL}/predict`, { method: 'POST', body: fdHuman });
    if (!resHuman.ok) throw new Error(`Manual human failed: ${resHuman.status}`);
    const jsonHuman = await resHuman.json();
    if (jsonHuman.model !== 'human') throw new Error('Manual human model mismatch');
  });

  console.log('================================================================================');
  console.log(`INTEGRATION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL ${passed + failed})`);
  console.log('================================================================================');

  if (failed > 0) process.exit(1);
}

runStep8IntegrationTests().catch(err => {
  console.error('Fatal error running integration tests:', err);
  process.exit(1);
});
