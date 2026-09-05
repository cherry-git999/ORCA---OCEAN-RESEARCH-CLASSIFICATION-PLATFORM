import fs from 'fs';
import path from 'path';

const FRONTEND_URL = 'http://127.0.0.1:5173';
const BACKEND_URL = 'http://127.0.0.1:8000';

async function verifyFrontendIntegration() {
  console.log('==================================================');
  console.log('VERIFYING FRONTEND ↔ FASTAPI /predict INTEGRATION');
  console.log('==================================================');

  // 1. Verify Vite dev server response
  console.log('\n[1] Checking Vite Dev Server (http://127.0.0.1:5173)...');
  const resHtml = await fetch(FRONTEND_URL);
  if (!resHtml.ok) {
    throw new Error(`Vite server returned ${resHtml.status}`);
  }
  const html = await resHtml.text();
  if (!html.includes('<div id="root"></div>')) {
    throw new Error('Vite HTML missing root container');
  }
  console.log('  PASS: Vite dev server active and serving index.html');

  // 2. Verify Backend /health
  console.log('\n[2] Checking FastAPI Backend Health (http://127.0.0.1:8000/health)...');
  const resHealth = await fetch(`${BACKEND_URL}/health`);
  if (!resHealth.ok) {
    throw new Error(`Backend health check returned ${resHealth.status}`);
  }
  const healthData = await resHealth.json();
  console.log('  PASS: Backend health status:', JSON.stringify(healthData));

  // 3. Test Hardware /predict via Multipart FormData (identical to React predictImage)
  console.log('\n[3] Testing Hardware Specialist via FormData...');
  const hwPath = '/media/cherry/External Hardisk/ps 57/SIH26057/model3_experiments/datasets/esp_hardware_clean/images/clip_009.jpg';
  const hwBytes = fs.readFileSync(hwPath);
  const hwBlob = new Blob([hwBytes], { type: 'image/jpeg' });
  const fdHw = new FormData();
  fdHw.append('target', 'hardware');
  fdHw.append('image', hwBlob, 'clip_009.jpg');

  const resHw = await fetch(`${BACKEND_URL}/predict`, { method: 'POST', body: fdHw });
  if (!resHw.ok) throw new Error(`Hardware /predict failed: ${resHw.status}`);
  const jsonHw = await resHw.json();
  console.log('  Hardware Response:', JSON.stringify(jsonHw, null, 2));
  if (jsonHw.model !== 'hardware' || jsonHw.target !== 'Hardware' || jsonHw.detections.length === 0 || jsonHw.detections[0].class !== 'clip') {
    throw new Error('Hardware response validation failed');
  }
  console.log('  PASS: Hardware detection verified (class: clip, conf:', jsonHw.detections[0].confidence, ')');

  // 4. Test Pipeline /predict via FormData
  console.log('\n[4] Testing Pipeline Specialist (.pbm) via FormData...');
  const pipePath = '/media/cherry/External Hardisk/ps 57/datasets/SubPipeMiniSSS/DATA/SSS_HF_images/Image/1693569383.780.pbm';
  const pipeBytes = fs.readFileSync(pipePath);
  const pipeBlob = new Blob([pipeBytes], { type: 'application/octet-stream' });
  const fdPipe = new FormData();
  fdPipe.append('target', 'pipeline');
  fdPipe.append('image', pipeBlob, '1693569383.780.pbm');

  const resPipe = await fetch(`${BACKEND_URL}/predict`, { method: 'POST', body: fdPipe });
  if (!resPipe.ok) throw new Error(`Pipeline /predict failed: ${resPipe.status}`);
  const jsonPipe = await resPipe.json();
  console.log('  Pipeline Response:', JSON.stringify(jsonPipe, null, 2));
  if (jsonPipe.model !== 'pipeline' || jsonPipe.target !== 'Pipeline' || jsonPipe.detections.length === 0 || jsonPipe.detections[0].class !== 'Pipeline') {
    throw new Error('Pipeline response validation failed');
  }
  console.log('  PASS: Pipeline detection verified (class: Pipeline, conf:', jsonPipe.detections[0].confidence, ')');

  // 5. Test Human /predict via FormData
  console.log('\n[5] Testing Human Specialist (.png) via FormData...');
  const humanPath = '/media/cherry/External Hardisk/ps 57/SIH26057/model2_experiments/datasets/aquascan_1k_clean/images/0002b00e-Screenshot_2025-08-10_23.00.36.png';
  const humanBytes = fs.readFileSync(humanPath);
  const humanBlob = new Blob([humanBytes], { type: 'image/png' });
  const fdHuman = new FormData();
  fdHuman.append('target', 'human');
  fdHuman.append('image', humanBlob, 'aquascan_sample.png');

  const resHuman = await fetch(`${BACKEND_URL}/predict`, { method: 'POST', body: fdHuman });
  if (!resHuman.ok) throw new Error(`Human /predict failed: ${resHuman.status}`);
  const jsonHuman = await resHuman.json();
  console.log('  Human Response:', JSON.stringify(jsonHuman, null, 2));
  if (jsonHuman.model !== 'human' || jsonHuman.target !== 'Human' || jsonHuman.detections.length === 0 || jsonHuman.detections[0].class !== 'Human') {
    throw new Error('Human response validation failed');
  }
  console.log('  PASS: Human detection verified (class: Human, conf:', jsonHuman.detections[0].confidence, ')');

  console.log('\n==================================================');
  console.log('ALL FRONTEND ↔ FASTAPI INTEGRATION CHECKS PASSED!');
  console.log('==================================================');
}

verifyFrontendIntegration().catch(err => {
  console.error('Integration check failed:', err);
  process.exit(1);
});
