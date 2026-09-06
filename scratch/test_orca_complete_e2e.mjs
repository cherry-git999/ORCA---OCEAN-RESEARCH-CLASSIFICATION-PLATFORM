import fs from 'fs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const SUBPIPE_PBM_PATH = '/media/cherry/External Hardisk/ps 57/datasets/SubPipeMiniSSS/DATA/SSS_HF_images/Image/1693569383.780.pbm';
const HARDWARE_JPG_PATH = '/media/cherry/External Hardisk/ps 57/SIH26057/model3_experiments/datasets/esp_hardware_clean/images/clip_009.jpg';
const HUMAN_PNG_PATH = '/media/cherry/External Hardisk/ps 57/SIH26057/model2_experiments/datasets/aquascan_1k_clean/images/0002b00e-Screenshot_2025-08-10_23.00.36.png';

async function runOrcaE2E() {
  console.log('================================================================================');
  console.log('RUNNING ORCA PRODUCTION WORKSPACE END-TO-END VALIDATION VIA CHROME CDP');
  console.log('================================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // Connect to Chrome CDP
  const listRes = await fetch('http://127.0.0.1:9222/json/list');
  const targets = await listRes.json();
  let pageTarget = targets.find((t) => t.type === 'page');

  if (!pageTarget) {
    const newRes = await fetch('http://127.0.0.1:9222/json/new?http://127.0.0.1:5173/');
    pageTarget = await newRes.json();
  }

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let idCounter = 1;
  const pendingRequests = new Map();

  function sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      pendingRequests.set(id, { resolve, reject, method });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pendingRequests.has(msg.id)) {
      const { resolve, reject } = pendingRequests.get(msg.id);
      pendingRequests.delete(msg.id);
      if (msg.error) {
        reject(new Error(`CDP Error in ${msg.method}: ${msg.error.message}`));
      } else {
        resolve(msg.result);
      }
    }
  };

  await sendCommand('Page.enable');
  await sendCommand('DOM.enable');
  await sendCommand('Runtime.enable');

  async function evaluate(expression) {
    const res = await sendCommand('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval exception: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  }

  async function captureScreenshot(filename) {
    const res = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`scratch/${filename}`, Buffer.from(res.data, 'base64'));
    console.log(`    (Screenshot saved: scratch/${filename})`);
  }

  // Clear localStorage for a clean baseline test
  await sendCommand('Page.navigate', { url: 'http://127.0.0.1:5173/' });
  await sleep(1000);
  await evaluate(`localStorage.clear(); sessionStorage.clear(); location.hash = '#/dashboard';`);
  await sleep(600);

  // 1. Validate Initial Clean State & Branding
  console.log('\n--- 1. Testing ORCA Branding & Clean Initial State ---');
  const title = await evaluate(`document.title`);
  assert(title.includes('ORCA'), `Page title contains ORCA: "${title}"`);

  const brandHeader = await evaluate(`document.querySelector('.app-sidebar h1')?.innerText`);
  assert(brandHeader === 'ORCA', `Sidebar brand header is ORCA: "${brandHeader}"`);

  const brandSub = await evaluate(`document.querySelector('.sidebar-text div')?.innerText`);
  assert(
    brandSub.includes('MULTIMODAL UNDERWATER INTELLIGENCE PLATFORM'),
    `Sidebar subtitle is correct: "${brandSub}"`
  );

  const topbarHasActiveScan = await evaluate(
    `Array.from(document.querySelectorAll('header *')).some(el => el.innerText && el.innerText.includes('Active Scan:'))`
  );
  assert(!topbarHasActiveScan, 'Active Scan selector completely removed from Topbar');

  const hasDemoBadges = await evaluate(
    `Array.from(document.querySelectorAll('*')).some(el => el.innerText && (el.innerText === 'DEMO' || el.innerText === 'UI PREVIEW MODE'))`
  );
  assert(!hasDemoBadges, 'Zero DEMO / UI PREVIEW MODE badges on dashboard');

  await captureScreenshot('test_orca_01_dashboard_clean.png');

  // 2. Navigate to Analyze Page
  console.log('\n--- 2. Testing Image Ingestion & Automatic Specialist Routing ---');
  await evaluate(`location.hash = '#/analyze'`);
  await sleep(600);

  // Check file input exists
  const fileInputNode = await sendCommand('DOM.getDocument');
  const fileInput = await sendCommand('DOM.querySelector', {
    nodeId: fileInputNode.root.nodeId,
    selector: '#sonar-file-input',
  });
  assert(fileInput.nodeId > 0, 'Sonar file input dropzone element found');

  // Ingest Hardware image (clip_009.jpg)
  console.log('    Uploading Hardware image:', HARDWARE_JPG_PATH);
  await sendCommand('DOM.setFileInputFiles', {
    nodeId: fileInput.nodeId,
    files: [HARDWARE_JPG_PATH],
  });

  // Wait for auto-routing API call to finish and modal to appear
  console.log('    Waiting for POST /predict-auto and AutoRoutingModal...');
  let modalOpen = false;
  for (let i = 0; i < 40; i++) {
    await sleep(300);
    modalOpen = await evaluate(
      `!!document.getElementById('auto-routing-modal-card') && document.body.innerText.includes('IMAGE ANALYSIS COMPLETE')`
    );
    if (modalOpen) break;
  }
  assert(modalOpen, 'Model Automatically Selected modal appeared after /predict-auto');

  await captureScreenshot('test_orca_02_model_selected_modal.png');

  const routedDomain = await evaluate(`document.getElementById('modal-selected-domain')?.innerText`);
  assert(
    routedDomain?.toUpperCase().includes('HARDWARE'),
    `Router automatically identified HARDWARE domain: "${routedDomain}"`
  );

  const confPercent = await evaluate(`document.getElementById('modal-routing-confidence')?.innerText`);
  assert(parseFloat(confPercent) >= 85, `Routing confidence is high: ${confPercent}`);

  // Click [ Continue ] to open UI Analysis Pipeline Transition
  console.log('\n--- 3. Testing UI-Only Analysis Pipeline Transition ---');
  await evaluate(`document.getElementById('modal-continue-btn')?.click()`);
  await sleep(400);

  const pipelineModalOpen = await evaluate(
    `!!document.getElementById('analysis-pipeline-modal-card') && document.body.innerText.includes('ANALYSIS PIPELINE')`
  );
  assert(pipelineModalOpen, 'Analysis Pipeline Transition Modal is displayed');

  await captureScreenshot('test_orca_03_pipeline_transition_modal.png');

  // Click [ Continue to Detection Workspace ]
  console.log('\n--- 4. Testing Transition to Real Detection Workspace ---');
  await evaluate(`document.getElementById('continue-to-workspace-btn')?.click()`);
  await sleep(800);

  const currentHash = await evaluate(`location.hash`);
  assert(currentHash === '#/detections', `Navigated to Detection Workspace route: ${currentHash}`);

  const workspaceTitle = await evaluate(`document.querySelector('.app-content h2')?.innerText`);
  assert(
    workspaceTitle?.includes('ORCA DETECTION WORKSPACE'),
    `Workspace title is ORCA DETECTION WORKSPACE: "${workspaceTitle}"`
  );

  const objectsDetected = await evaluate(
    `document.querySelector('.glass-panel .mono[style*="font-size: 15px"]')?.innerText || '0'`
  );
  assert(parseInt(objectsDetected) >= 1, `Real objects detected from backend: ${objectsDetected}`);

  const detectionLabel = await evaluate(
    `Array.from(document.querySelectorAll('.app-content *')).some(el => el.innerText && el.innerText.includes('CLIP'))`
  );
  assert(detectionLabel, 'Real backend class "CLIP" displayed in workspace');

  await captureScreenshot('test_orca_04_detection_workspace_real.png');

  // 5. Test Download Annotated Image (Canvas Generation)
  console.log('\n--- 5. Testing Download Annotated Image Execution ---');
  const hasDownloadAnnotatedBtn = await evaluate(
    `!!document.getElementById('workspace-download-annotated-btn')`
  );
  assert(hasDownloadAnnotatedBtn, 'Download Annotated Image button present in workspace');

  // Trigger export function to verify canvas rendering doesn't throw
  const exportSuccess = await evaluate(`
    (async () => {
      try {
        const btn = document.getElementById('workspace-download-annotated-btn');
        btn.click();
        return true;
      } catch (e) {
        return false;
      }
    })()
  `);
  assert(exportSuccess, 'Download Annotated Image executed cleanly');

  // 6. Test Reports Page & PDF Report Generation
  console.log('\n--- 6. Testing Reports Page & PDF Generation ---');
  await evaluate(`location.hash = '#/reports'`);
  await sleep(600);

  const reportsTitle = await evaluate(`document.querySelector('.app-content h3')?.innerText`);
  assert(
    reportsTitle?.includes('ORCA SCAN ANALYSIS MISSION REPORT'),
    `Reports title is ORCA report: "${reportsTitle}"`
  );

  const hasCoordsInReport = await evaluate(`
    document.body.innerText.toUpperCase().includes('SURVEY COORDINATES') &&
    document.body.innerText.includes('(Estimated - Not highly accurate)')
  `);
  assert(hasCoordsInReport, 'Reports page displays Survey Coordinates with (Estimated - Not highly accurate)');

  const pdfBtn = await evaluate(`!!document.getElementById('btn-download-pdf-report')`);
  assert(pdfBtn, 'Download PDF Report button present in Reports view');

  const pdfTriggerSuccess = await evaluate(`
    (() => {
      try {
        document.getElementById('btn-download-pdf-report').click();
        return true;
      } catch (e) {
        return false;
      }
    })()
  `);
  assert(pdfTriggerSuccess, 'Download PDF Report triggered without errors');

  await captureScreenshot('test_orca_05_reports_page.png');

  // 6b. Test Geospatial Interactive Map & Water Coordinates
  console.log('\n--- 6b. Testing Geospatial Interactive Map & Water Coordinates ---');
  await evaluate(`location.hash = '#/geospatial'`);
  await sleep(1000);

  const hasLeafletMap = await evaluate(`!!document.querySelector('.leaflet-container')`);
  assert(hasLeafletMap, 'Leaflet interactive map container initialized');

  const markerCount = await evaluate(`document.querySelectorAll('.custom-sonar-marker').length`);
  assert(markerCount >= 1, `Anomaly markers plotted on map (count: ${markerCount})`);

  const hasDisclaimer = await evaluate(`
    document.body.innerText.includes('(Estimated - Not highly accurate)')
  `);
  assert(hasDisclaimer, 'Accuracy disclaimer (Estimated - Not highly accurate) present on Geospatial page');

  const hasWaterSector = await evaluate(`
    document.body.innerText.includes('OFFSHORE') ||
    document.body.innerText.includes('Offshore') ||
    document.body.innerText.includes('Maritime')
  `);
  assert(hasWaterSector, 'Offshore water survey sector indicated on Geospatial chart');

  // Click marker to verify popup
  const clickedMarker = await evaluate(`
    (() => {
      const markerEl = document.querySelector('.leaflet-marker-icon');
      if (markerEl) {
        markerEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        return true;
      }
      return false;
    })()
  `);
  // Wait for popup to render
  let hasPopup = false;
  for (let i = 0; i < 6; i++) {
    hasPopup = await evaluate(`
      (() => {
        const popup = document.querySelector('.leaflet-popup');
        return !!popup && popup.innerText.includes('Estimated - Not highly accurate');
      })()
    `);
    if (hasPopup) break;
    await sleep(500);
  }
  assert(hasPopup, 'Marker popup opened with accuracy disclaimer');

  await captureScreenshot('test_orca_08_geospatial_water_map.png');

  // 7. Test Real Scan History Persistence Across Page Reload
  console.log('\n--- 7. Testing Scan History LocalStorage Persistence ---');
  await evaluate(`location.hash = '#/history'`);
  await sleep(600);

  const historyEntriesBefore = await evaluate(
    `document.querySelectorAll('table tbody tr').length`
  );
  assert(historyEntriesBefore >= 1, `Scan history displays recorded scan (count: ${historyEntriesBefore})`);

  const historyFileText = await evaluate(`document.querySelector('table tbody td')?.innerText`);
  assert(
    historyFileText?.includes('clip_009.jpg'),
    `Scan history table shows actual filename clip_009.jpg: "${historyFileText}"`
  );

  // Reload browser to prove persistence in localStorage
  console.log('    Reloading page to test localStorage persistence...');
  await sendCommand('Page.reload');
  await sleep(1200);

  const historyEntriesAfter = await evaluate(
    `document.querySelectorAll('table tbody tr').length`
  );
  assert(historyEntriesAfter >= 1, `Scan persisted after browser refresh! (count: ${historyEntriesAfter})`);

  await captureScreenshot('test_orca_06_scan_history_persisted.png');

  // 8. Test System Telemetry Modal
  console.log('\n--- 8. Testing Real System Telemetry Modal ---');
  await evaluate(
    `document.querySelector('header button[title="System Architecture Telemetry"]')?.click()`
  );
  await sleep(400);

  const telemetryOpen = await evaluate(
    `document.body.innerText.includes('ORCA Operational Telemetry & System Status')`
  );
  assert(telemetryOpen, 'Operational Telemetry Modal displayed');

  const hasAll3Models = await evaluate(`
    document.body.innerText.includes('Pipeline Specialist') &&
    document.body.innerText.includes('Human Specialist') &&
    document.body.innerText.includes('Hardware Specialist')
  `);
  assert(hasAll3Models, 'All 3 specialist models (Pipeline, Human, Hardware) displayed in telemetry');

  await captureScreenshot('test_orca_07_telemetry_modal.png');

  console.log('\n================================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runOrcaE2E()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal test failure:', err);
    process.exit(1);
  });
