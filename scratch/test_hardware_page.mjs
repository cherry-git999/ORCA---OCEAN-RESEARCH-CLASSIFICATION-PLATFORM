import fs from 'fs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function verifyHardwarePage() {
  console.log('================================================================');
  console.log('STEP 9 — DEDICATED HARDWARE PAGE E2E VERIFICATION');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, msg) {
    if (condition) {
      console.log(`  [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${msg}`);
      failed++;
      throw new Error(msg);
    }
  }

  const listRes = await fetch('http://127.0.0.1:9222/json/list');
  const targets = await listRes.json();
  const pageTarget = targets.find((t) => t.type === 'page' && t.url.includes('5173'));

  if (!pageTarget) {
    throw new Error('Page target not found on 9222');
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

  // Set device viewport
  await sendCommand('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  // 1. Check Sidebar Navigation Item
  console.log('\n--- 1. Testing Sidebar Top-Level Hardware Navigation ---');
  await sendCommand('Page.navigate', { url: 'http://127.0.0.1:5173/#/dashboard' });
  await sleep(1000);

  const hasHardwareNav = await evaluate(`
    Array.from(document.querySelectorAll('.app-sidebar button')).some(b => b.innerText.includes('Hardware'))
  `);
  assert(hasHardwareNav, 'Hardware appears as a top-level item in Sidebar');

  // Clear any existing hardware capture in localStorage for clean empty state test
  await evaluate(`localStorage.removeItem('orca_latest_hardware_capture');`);

  // Navigate to Hardware page
  await evaluate(`
    const btn = Array.from(document.querySelectorAll('.app-sidebar button')).find(b => b.innerText.includes('Hardware'));
    if (btn) btn.click();
  `);
  await sleep(1000);

  const currentHash = await evaluate(`window.location.hash`);
  assert(currentHash.includes('hardware'), `Navigated to #/hardware (current hash: ${currentHash})`);

  // 2. Validate Empty State & Endpoint
  console.log('\n--- 2. Testing Hardware Page Empty State & Source Card ---');
  const sourceCardExists = await evaluate(`!!document.getElementById('hardware-source-status-card')`);
  assert(sourceCardExists, 'Hardware Source Status card exists');

  const sourceCardText = await evaluate(`document.getElementById('hardware-source-status-card')?.innerText || ''`);
  assert(sourceCardText.includes('10.169.191.69:5000'), 'Source card displays 10.169.191.69:5000');
  assert(sourceCardText.includes('WAITING FOR HARDWARE DATA') || sourceCardText.includes('CHECKING CONNECTIVITY'), 'Source card indicates waiting/checking status');

  const emptyPanelExists = await evaluate(`!!document.getElementById('hardware-empty-state-panel')`);
  assert(emptyPanelExists, 'Hardware Empty State panel is rendered');

  const emptyText = await evaluate(`document.getElementById('hardware-empty-state-panel')?.innerText || ''`);
  assert(emptyText.includes('LATEST HARDWARE CAPTURE'), 'Empty state has title LATEST HARDWARE CAPTURE');
  assert(emptyText.includes('No hardware capture received yet.'), 'Empty state text: No hardware capture received yet.');
  assert(emptyText.includes('JPG image') && emptyText.includes('TXT sonar data'), 'Empty state indicates waiting for JPG + TXT pair');

  // Verify NO fake distance or fake GPS
  assert(!emptyText.includes('Distance: 2.4 m') && !emptyText.includes('Distance:'), 'No fake distance shown');
  assert(!emptyText.includes('Latitude:') && !emptyText.includes('Longitude:'), 'No fake coordinates shown');

  await captureScreenshot('test_orca_16_hardware_empty_state.png');

  // 3. Test Loading Hardware Capture Pair
  console.log('\n--- 3. Testing JPG + TXT Hardware Capture Reception & Display ---');
  await evaluate(`document.getElementById('load-sample-hardware-btn')?.click()`);
  await sleep(800);

  const receivedViewExists = await evaluate(`!!document.getElementById('hardware-capture-received-view')`);
  assert(receivedViewExists, 'Hardware capture received view rendered');

  const receivedText = await evaluate(`document.getElementById('hardware-capture-received-view')?.innerText || ''`);
  assert(receivedText.includes('HARDWARE CAPTURE'), 'Grouped under HARDWARE CAPTURE header');
  assert(receivedText.includes('Image received') || receivedText.includes('✓ Image received'), 'Shows Image received checkmark');
  assert(receivedText.includes('Sonar data received') || receivedText.includes('✓ Sonar data received'), 'Shows Sonar data received checkmark');

  // Verify JPG Panel
  const hasImagePanel = await evaluate(`!!document.getElementById('hardware-image-panel')`);
  assert(hasImagePanel, 'HARDWARE IMAGE panel rendered');
  const imgPanelText = await evaluate(`document.getElementById('hardware-image-panel')?.innerText || ''`);
  assert(imgPanelText.includes('clip_009.jpg'), 'Image panel displays filename clip_009.jpg');
  assert(imgPanelText.includes('JPEG'), 'Image panel displays file type JPEG');
  assert(imgPanelText.includes('RECEIVED'), 'Image panel displays RECEIVED status');

  // Verify Sonar Panel & Expandable Raw Data
  const hasSonarPanel = await evaluate(`!!document.getElementById('hardware-sonar-panel')`);
  assert(hasSonarPanel, 'SONAR MEASUREMENT DATA panel rendered');
  const sonarPanelText = await evaluate(`document.getElementById('hardware-sonar-panel')?.innerText || ''`);
  assert(sonarPanelText.includes('capture_009.txt'), 'Sonar panel displays filename capture_009.txt');
  assert(sonarPanelText.includes('RECEIVED'), 'Sonar panel displays RECEIVED status');

  const rawSonarViewerExists = await evaluate(`!!document.getElementById('raw-sonar-data-viewer')`);
  assert(rawSonarViewerExists, 'Raw Sonar Data Viewer is rendered');
  const rawSonarContent = await evaluate(`document.getElementById('raw-sonar-data-viewer')?.innerText || ''`);
  assert(rawSonarContent.includes('HARDWARE TELEMETRY LOG') && rawSonarContent.includes('TRANSDUCER_ID'), 'Raw TXT content accurately displayed');

  // Verify Analysis Status is NOT STARTED (no Model 3 called)
  assert(receivedText.includes('NOT STARTED'), 'Analysis status explicitly shows NOT STARTED');

  await captureScreenshot('test_orca_17_hardware_capture_received.png');

  // 4. Test Persistence Across Navigation
  console.log('\n--- 4. Testing Persistence Across Page Navigation ---');
  // Navigate away to Reports
  await evaluate(`
    const reportsBtn = Array.from(document.querySelectorAll('.app-sidebar button')).find(b => b.innerText.includes('Reports'));
    if (reportsBtn) reportsBtn.click();
  `);
  await sleep(800);
  const onReports = await evaluate(`window.location.hash.includes('reports')`);
  assert(onReports, 'Navigated away to Reports page');

  // Navigate back to Hardware
  await evaluate(`
    const hwBtn = Array.from(document.querySelectorAll('.app-sidebar button')).find(b => b.innerText.includes('Hardware'));
    if (hwBtn) hwBtn.click();
  `);
  await sleep(800);

  const backOnHardware = await evaluate(`window.location.hash.includes('hardware')`);
  assert(backOnHardware, 'Navigated back to Hardware page');

  const persistedCapture = await evaluate(`!!document.getElementById('hardware-capture-received-view')`);
  assert(persistedCapture, 'Hardware capture remained persisted after page navigation');

  console.log('================================================================');
  console.log(`STEP 9 TEST SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  ws.close();
}

verifyHardwarePage().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
