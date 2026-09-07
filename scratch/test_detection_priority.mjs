import { spawn } from 'child_process';
import fs from 'fs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const SUBPIPE_PBM_PATH = '/media/cherry/External Hardisk/ps 57/datasets/SubPipeMiniSSS/DATA/SSS_HF_images/Image/1693569383.780.pbm';
const AQUASCAN_PNG_PATH = '/media/cherry/External Hardisk/ps 57/SIH26057/model2_experiments/datasets/aquascan_1k_clean/images/0002b00e-Screenshot_2025-08-10_23.00.36.png';
const HARDWARE_JPG_PATH = '/media/cherry/External Hardisk/ps 57/SIH26057/model3_experiments/datasets/esp_hardware_clean/images/clip_009.jpg';

async function runTest() {
  console.log('================================================================');
  console.log('ORCA DETECTION PRIORITY & CLEANUP/INSPECTION ORDER VERIFICATION');
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

  const chromeProc = spawn('/usr/bin/google-chrome', [
    '--headless=new',
    '--remote-debugging-port=9338',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    'about:blank',
  ]);

  await sleep(1500);

  try {
    const newTabRes = await fetch('http://127.0.0.1:9338/json/new', { method: 'PUT' });
    const target = await newTabRes.json();

    const ws = new WebSocket(target.webSocketDebuggerUrl);
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

    await sendCommand('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

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
      const artifactPath = `/home/cherry/.gemini/antigravity-ide/brain/71da989d-e552-414a-8a5c-2151eaf5d91a/${filename}`;
      fs.copyFileSync(`scratch/${filename}`, artifactPath);
      console.log(`    (Saved screenshot: ${filename})`);
    }

    async function uploadAndProceedToWorkspace(filePath) {
      await sendCommand('Page.navigate', { url: 'http://127.0.0.1:5173/#/analyze' });
      await sleep(1200);

      const doc = await sendCommand('DOM.getDocument');
      const fileInput = await sendCommand('DOM.querySelector', {
        nodeId: doc.root.nodeId,
        selector: '#sonar-file-input',
      });
      assert(fileInput.nodeId > 0, 'Found #sonar-file-input');

      await sendCommand('DOM.setFileInputFiles', {
        nodeId: fileInput.nodeId,
        files: [filePath],
      });

      // Dispatch change event to trigger React onChange handler
      await evaluate(`
        document.querySelector('#sonar-file-input')?.dispatchEvent(new Event('change', { bubbles: true }));
      `);

      // Wait for auto routing modal or manual transition
      let modalOpen = false;
      for (let i = 0; i < 40; i++) {
        await sleep(300);
        modalOpen = await evaluate(`!!document.getElementById('auto-routing-modal-card')`);
        if (modalOpen) break;
      }
      assert(modalOpen, 'Auto-routing modal appeared');

      // Click continue on AutoRoutingModal
      await evaluate(`document.getElementById('modal-continue-btn')?.click()`);
      await sleep(500);

      // Click continue on PipelineTransitionModal
      await evaluate(`document.getElementById('continue-to-workspace-btn')?.click()`);
      await sleep(1000);

      const isWorkspace = await evaluate(`location.hash.includes('detections')`);
      assert(isWorkspace, 'Successfully transitioned to #/detections');
    }

    // =========================================================================
    // TEST 1: Hardware Specialist Scan & Priority UI
    // =========================================================================
    console.log('\n--- TEST 1: Hardware Specialist Scan (clip_009.jpg) ---');
    await uploadAndProceedToWorkspace(HARDWARE_JPG_PATH);

    // Verify Cleanup / Inspection Order card exists
    const cleanupCardExists = await evaluate(`!!document.querySelector('#cleanup-inspection-order-card')`);
    assert(cleanupCardExists, 'Cleanup / Inspection Order card is rendered in Detection Workspace');

    const cleanupTitle = await evaluate(`document.querySelector('#cleanup-inspection-order-card h3')?.innerText`);
    assert(cleanupTitle === 'CLEANUP / INSPECTION ORDER', `Cleanup title is "${cleanupTitle}"`);

    // Verify Detection Intelligence panel exists in detail inspector
    const detIntelExists = await evaluate(`!!document.querySelector('#detection-intelligence-panel')`);
    assert(detIntelExists, 'Detection Intelligence panel is rendered in Detail Inspector');

    const hwHazard = await evaluate(`document.querySelector('#det-intel-hazard-badge')?.innerText`);
    assert(hwHazard?.toUpperCase() === 'MEDIUM' || hwHazard?.toUpperCase() === 'HIGH', `Hardware hazard is "${hwHazard}"`);

    const hwPriority = await evaluate(`parseInt(document.querySelector('#det-intel-priority-score')?.innerText)`);
    assert(hwPriority >= 60 && hwPriority <= 85, `Hardware clip priority is ${hwPriority} / 100`);

    const hwAction = await evaluate(`document.querySelector('#det-intel-action-text')?.innerText`);
    assert(hwAction.includes('Inspect') || hwAction.includes('Remove') || hwAction.includes('Confirmed'), `Hardware action is "${hwAction}"`);

    // Verify Candidate Detection Table contains PRIORITY column
    const tableHeaders = await evaluate(`
      Array.from(document.querySelectorAll('table th')).map(th => th.innerText)
    `);
    assert(tableHeaders.includes('PRIORITY'), 'Detection Table contains PRIORITY column');

    // Verify Manual Expert Review Confirm button exists
    const confirmBtn = await evaluate(`!!document.querySelector('#review-action-confirm')`);
    assert(confirmBtn, 'Manual Expert Review Confirm button exists');

    await captureScreenshot('test_orca_24_detection_priority_hardware.png');

    // =========================================================================
    // TEST 2: Pipeline Specialist Scan & Priority UI
    // =========================================================================
    console.log('\n--- TEST 2: Pipeline Specialist Scan (SubPipe) ---');
    await uploadAndProceedToWorkspace(SUBPIPE_PBM_PATH);

    const pipeHazard = await evaluate(`document.querySelector('#det-intel-hazard-badge')?.innerText`);
    assert(pipeHazard?.toUpperCase() === 'VERY HIGH' || pipeHazard?.toUpperCase() === 'HIGH', `Pipeline hazard is "${pipeHazard}"`);

    const pipePriority = await evaluate(`parseInt(document.querySelector('#det-intel-priority-score')?.innerText)`);
    assert(pipePriority >= 70 && pipePriority <= 100, `Pipeline priority is high/critical: ${pipePriority} / 100`);

    const pipeAction = await evaluate(`document.querySelector('#det-intel-action-text')?.innerText`);
    assert(pipeAction.includes('Inspect'), `Pipeline action is "${pipeAction}"`);

    await captureScreenshot('test_orca_25_detection_priority_pipeline.png');

    // =========================================================================
    // TEST 3: Human Specialist Context (Non-Cleanup Target)
    // =========================================================================
    console.log('\n--- TEST 3: Human Specialist Scan (Aquascan) ---');
    await uploadAndProceedToWorkspace(AQUASCAN_PNG_PATH);

    const humanHazard = await evaluate(`document.querySelector('#det-intel-hazard-badge')?.innerText`);
    assert(humanHazard?.toUpperCase() === 'CONTEXT-DEPENDENT', `Human hazard is "${humanHazard}"`);

    const humanAction = await evaluate(`document.querySelector('#det-intel-action-text')?.innerText`);
    assert(humanAction.toLowerCase().includes('operator review'), `Human recommended action is "${humanAction}"`);

    const cleanupSubtitle = await evaluate(`document.querySelector('#cleanup-inspection-order-card span')?.innerText`);
    assert(!cleanupSubtitle.toLowerCase().includes('cleanup target'), 'Human context is not labelled as cleanup target');

    await captureScreenshot('test_orca_26_detection_priority_human.png');

    // =========================================================================
    // TEST 4: Reports Page Integration
    // =========================================================================
    console.log('\n--- TEST 4: Reports Page Integration & Priorities ---');
    await sendCommand('Page.navigate', { url: 'http://127.0.0.1:5173/#/reports' });
    await sleep(1500);

    const reportCleanupCard = await evaluate(`!!document.querySelector('#report-cleanup-order-card')`);
    assert(reportCleanupCard, 'Reports page includes CLEANUP / INSPECTION ORDER card');

    const reportHeaders = await evaluate(`
      Array.from(document.querySelectorAll('#report-detections-table th')).map(th => th.innerText)
    `);
    assert(reportHeaders.includes('HAZARD'), 'Report table has HAZARD column');
    assert(reportHeaders.includes('LOCATION RISK'), 'Report table has LOCATION RISK column');
    assert(reportHeaders.includes('PRIORITY'), 'Report table has PRIORITY column');
    assert(reportHeaders.includes('RECOMMENDED ACTION'), 'Report table has RECOMMENDED ACTION column');

    await captureScreenshot('test_orca_27_report_priority_integration.png');

    console.log('\n================================================================');
    console.log(`ALL DETECTION PRIORITY TESTS PASSED! (${passed}/${passed + failed})`);
    console.log('================================================================');

    ws.close();
  } finally {
    chromeProc.kill();
  }
}

runTest().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
