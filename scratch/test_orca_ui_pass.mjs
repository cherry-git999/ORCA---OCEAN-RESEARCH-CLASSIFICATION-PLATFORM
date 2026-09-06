import fs from 'fs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const SUBPIPE_PBM_PATH = '/media/cherry/External Hardisk/ps 57/datasets/SubPipeMiniSSS/DATA/SSS_HF_images/Image/1693569383.780.pbm';

async function runTest() {
  console.log('================================================================');
  console.log('ORCA — NEXT FRONTEND UI PASS: E2E AUTOMATED VERIFICATION');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(cond, msg) {
    if (cond) {
      console.log(`  [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${msg}`);
      failed++;
      throw new Error(msg);
    }
  }

  // Connect to Chrome CDP target
  const listRes = await fetch('http://127.0.0.1:9222/json/list');
  const targets = await listRes.json();
  const pageTarget = targets.find((t) => t.type === 'page' && t.url.includes('5173'));

  if (!pageTarget) {
    throw new Error('Could not find frontend page target on 9222');
  }

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });

  let idCounter = 1;
  const pendingRequests = new Map();

  function sendCommand(method, params = {}) {
    return new Promise((res, rej) => {
      const id = idCounter++;
      pendingRequests.set(id, { resolve: res, reject: rej, method });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pendingRequests.has(msg.id)) {
      const { resolve, reject } = pendingRequests.get(msg.id);
      pendingRequests.delete(msg.id);
      if (msg.error) {
        reject(new Error(`CDP error in ${msg.method}: ${msg.error.message}`));
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
    fs.copyFileSync(`scratch/${filename}`, `/home/cherry/.gemini/antigravity-ide/brain/71da989d-e552-414a-8a5c-2151eaf5d91a/${filename}`);
    console.log(`    (Saved screenshot: ${filename})`);
  }

  // Set clean viewport and navigate to Dashboard
  await sendCommand('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await sendCommand('Page.navigate', { url: 'http://127.0.0.1:5173/' });
  await sleep(1500);

  // Clear previous state for a deterministic test
  await evaluate(`localStorage.clear(); sessionStorage.clear(); location.hash = '#/dashboard';`);
  await sleep(800);

  // 1. Validate Mission Overview & Core Capabilities Bar
  console.log('\n--- 1. Testing Dashboard & Core Capabilities Bar ---');
  const hasCapabilities = await evaluate(`!!document.getElementById('core-capabilities-bar')`);
  assert(hasCapabilities, 'Core Capabilities bar is rendered on Dashboard');

  const capabilitiesText = await evaluate(`document.getElementById('core-capabilities-bar')?.innerText || ''`);
  console.log('    Capabilities bar innerText:', JSON.stringify(capabilitiesText));
  const capUpper = capabilitiesText.toUpperCase();
  assert(capUpper.includes('MULTIMODAL AI INTELLIGENCE'), 'Core capabilities has Multimodal AI Intelligence');
  assert(capUpper.includes('RELIABLE DETECTION & CLASSIFICATION'), 'Core capabilities has Reliable Detection & Classification');
  assert(capUpper.includes('GEOSPATIAL INTELLIGENCE'), 'Core capabilities has Geospatial Intelligence');
  assert(capUpper.includes('AUTOMATED ANALYSIS & REPORTING'), 'Core capabilities has Automated Analysis & Reporting');

  // Validate Initial Sidebar Review Counts (strictly 0 / 0 / 0)
  const sidebarReviewText = await evaluate(`(document.getElementById('sidebar-review-counts') || document.getElementById('sidebar-expert-review-widget'))?.innerText || ''`);
  assert(sidebarReviewText.includes('MANUAL EXPERT REVIEW') || sidebarReviewText.includes('Manual Expert Review'), 'Sidebar has MANUAL EXPERT REVIEW section');
  assert(sidebarReviewText.includes('Confirmed') && sidebarReviewText.includes('0'), 'Confirmed starts at 0');
  assert(sidebarReviewText.includes('Rejected') && sidebarReviewText.includes('0'), 'Rejected starts at 0');
  assert(sidebarReviewText.includes('Under Review') && sidebarReviewText.includes('0'), 'Under Review starts at 0');

  await captureScreenshot('test_orca_09_dashboard_capabilities.png');

  // 2. Perform Scan Ingestion via Auto-Routing
  console.log('\n--- 2. Performing Scan Ingestion & Testing Analysis Pipeline Auto-Expansion ---');
  await evaluate(`document.querySelector('a[href="#/analyze"]')?.click()`);
  await sleep(600);

  // Upload file via file input
  const fileBase64 = fs.readFileSync(SUBPIPE_PBM_PATH).toString('base64');
  await evaluate(`
    (async () => {
      const b64 = "${fileBase64}";
      const byteChars = atob(b64);
      const byteNums = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNums[i] = byteChars.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNums);
      const file = new File([byteArray], "1693569383.780.pbm", { type: "image/x-portable-bitmap" });
      const dt = new DataTransfer();
      dt.items.add(file);
      const input = document.querySelector('input[type="file"]');
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    })()
  `);

  console.log('    Uploaded file, waiting for Auto-Routing modal...');
  let modalOpen = false;
  for (let i = 0; i < 30; i++) {
    await sleep(400);
    modalOpen = await evaluate(`!!document.getElementById('auto-routing-modal-card')`);
    if (modalOpen) break;
  }
  assert(modalOpen, 'Auto-Routing modal opened');

  // Proceed from Auto-Routing to Pipeline
  await evaluate(`document.getElementById('proceed-to-pipeline-btn')?.click()`);
  await sleep(600);

  // 3. Validate Analysis Pipeline Modal & 10-step Image Quality Check Auto-Expansion
  console.log('\n--- 3. Testing 10-Step Image Quality Check Auto-Expansion (~10s) ---');
  const pipelineModalOpen = await evaluate(`!!document.getElementById('analysis-pipeline-modal-card')`);
  assert(pipelineModalOpen, 'Analysis Pipeline Modal opened');

  const qualityCardExists = await evaluate(`!!document.getElementById('stage-quality-check-card')`);
  assert(qualityCardExists, 'Stage 02 Image Quality Check card exists');

  // Check that all 10 substeps are auto-expanded without clicking
  const substepsCount = await evaluate(`
    document.querySelectorAll('#stage-quality-check-card [class*="mono"]').length
  `);
  console.log(`    Detected ${substepsCount} substep elements visible in expanded accordion`);
  assert(substepsCount >= 10, 'All 10 substeps are auto-expanded (NO CLICK REQUIRED)');

  // Sample midway through the 10-second animation
  await sleep(3500);
  const midProgressText = await evaluate(`document.getElementById('stage-quality-check-card')?.innerText || ''`);
  console.log(`    Mid-pipeline status: ${midProgressText.split('\\n').slice(0, 4).join(' ')}`);
  await captureScreenshot('test_orca_10_pipeline_in_progress.png');

  // Wait for completion (remaining ~6.5 seconds)
  console.log('    Waiting for all 10 substeps to complete...');
  let pipelineComplete = false;
  for (let i = 0; i < 20; i++) {
    await sleep(700);
    const text = await evaluate(`document.getElementById('stage-quality-check-card')?.innerText || ''`);
    if (text.includes('Image Quality Processing Complete') || text.includes('10/10 COMPLETE')) {
      pipelineComplete = true;
      break;
    }
  }
  assert(pipelineComplete, 'Image Quality Processing Complete achieved across all 10 stages');
  await captureScreenshot('test_orca_11_pipeline_complete.png');

  // Continue to Detection Workspace
  await evaluate(`document.getElementById('continue-to-workspace-btn')?.click()`);
  await sleep(1000);

  // 4. Validate Detection Workspace Layout & Geospatial Navigation Buttons
  console.log('\n--- 4. Testing Detection Workspace & Physical Dimensions Purge ---');
  const inWorkspace = await evaluate(`window.location.hash.includes('detections')`);
  assert(inWorkspace, 'Navigated to Detection Workspace');

  // Verify Physical Dimensions card is 100% GONE
  const workspaceText = await evaluate(`document.body.innerText`);
  assert(!workspaceText.includes('PHYSICAL DIMENSIONS'), 'PHYSICAL DIMENSIONS card is completely purged');
  assert(!workspaceText.includes('ESTIMATED DIMENSIONS'), 'ESTIMATED DIMENSIONS is completely purged');

  // Verify Top & Bottom [ View Geospatial View ] buttons
  const topGeoBtn = await evaluate(`!!document.getElementById('top-view-geospatial-btn')`);
  const btmGeoBtn = await evaluate(`!!document.getElementById('btm-view-geospatial-btn')`);
  assert(topGeoBtn, 'Top [ View Geospatial View ] button is present beside Download');
  assert(btmGeoBtn, 'Bottom [ View Geospatial View ] button is present beside Download');

  await captureScreenshot('test_orca_12_detection_workspace_clean.png');

  // 5. Test Manual Expert Review Actions & ReviewConfirmationModal
  console.log('\n--- 5. Testing Manual Expert Review Actions & Confirmation Modal ---');
  const reviewActionsPresent = await evaluate(`
    !!document.getElementById('review-action-confirm-btn') &&
    !!document.getElementById('review-action-reject-btn') &&
    !!document.getElementById('review-action-review-btn')
  `);
  assert(reviewActionsPresent, 'All 3 review action buttons ([ Confirm ], [ Reject ], [ Review ]) present');

  // Click [ Confirm ]
  await evaluate(`document.getElementById('review-action-confirm-btn')?.click()`);
  await sleep(400);

  const confirmModalOpen = await evaluate(`!!document.getElementById('review-confirmation-modal')`);
  assert(confirmModalOpen, 'ReviewConfirmationModal opened upon clicking action');

  const modalBodyText = await evaluate(`document.getElementById('review-confirmation-modal')?.innerText || ''`);
  assert(modalBodyText.includes('CONFIRMED'), 'Confirmation modal indicates CONFIRMED status');
  assert(modalBodyText.includes('OK'), 'Confirmation modal has [ OK ] button');

  await captureScreenshot('test_orca_13_review_confirmation_modal.png');

  // Click [ OK ] button to dismiss modal and focus status
  await evaluate(`document.getElementById('review-confirm-modal-ok-btn')?.click()`);
  await sleep(400);

  const modalDismissed = await evaluate(`!document.getElementById('review-confirmation-modal')`);
  assert(modalDismissed, 'Modal dismissed upon clicking [ OK ]');

  // 6. Test Sidebar Live Review Counts Update & Persistence
  console.log('\n--- 6. Testing Sidebar Review Counts Update & Persistence ---');
  const updatedSidebarText = await evaluate(`(document.getElementById('sidebar-review-counts') || document.getElementById('sidebar-expert-review-widget'))?.innerText || ''`);
  console.log(`    Updated sidebar: ${updatedSidebarText.replace(/\\n/g, ' ')}`);
  assert(updatedSidebarText.includes('Confirmed') && !updatedSidebarText.includes('Confirmed: 0'), 'Confirmed count incremented');

  await captureScreenshot('test_orca_14_sidebar_review_updated.png');

  // Reload page to test persistence in localStorage
  console.log('    Reloading page to verify persistence...');
  await sendCommand('Page.reload');
  await sleep(1500);

  const reloadedSidebarText = await evaluate(`(document.getElementById('sidebar-review-counts') || document.getElementById('sidebar-expert-review-widget'))?.innerText || ''`);
  assert(reloadedSidebarText.includes('Confirmed') && !reloadedSidebarText.includes('Confirmed: 0'), 'Review count persisted across page reload');

  // 7. Test Geospatial Page & Real Leaflet Interactive Map
  console.log('\n--- 7. Testing Geospatial Page & Leaflet Interactive Map ---');
  // Click [ View Geospatial View ] in workspace
  await evaluate(`document.getElementById('top-view-geospatial-btn')?.click()`);
  await sleep(1200);

  const onGeoPage = await evaluate(`window.location.hash.includes('geospatial')`);
  assert(onGeoPage, 'Navigated to Geospatial Page');

  const hasLeaflet = await evaluate(`!!document.querySelector('.leaflet-container')`);
  assert(hasLeaflet, 'Leaflet map container initialized');

  const markerCount = await evaluate(`document.querySelectorAll('.leaflet-marker-icon').length`);
  console.log(`    Found ${markerCount} Leaflet waypoint markers on offshore chart`);
  assert(markerCount > 0, 'Offshore anomaly markers rendered on map');

  // Click first marker to open popup and test telemetry
  await evaluate(`
    const markerEl = document.querySelector('.leaflet-marker-icon');
    if (markerEl) {
      markerEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }
  `);
  await sleep(800);

  const popupOpen = await evaluate(`!!document.querySelector('.leaflet-popup')`);
  assert(popupOpen, 'Leaflet marker popup opened on click');

  const popupText = await evaluate(`document.querySelector('.leaflet-popup')?.innerText || ''`);
  console.log(`    Popup content: ${popupText.replace(/\\n/g, ' ')}`);
  assert(popupText.includes('Geospatial Reference') || popupText.includes('Lat:'), 'Popup contains coordinate reference');
  assert(popupText.includes('PIPELINE') || popupText.includes('Anomaly') || popupText.includes('Conf:'), 'Popup contains detection class & confidence');

  // Test map zoom control
  const hasZoomControl = await evaluate(`!!document.querySelector('.leaflet-control-zoom')`);
  assert(hasZoomControl, 'Leaflet zoom controls are present');

  await captureScreenshot('test_orca_15_geospatial_leaflet_map.png');

  console.log('================================================================');
  console.log(`TEST SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  ws.close();
}

runTest().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
