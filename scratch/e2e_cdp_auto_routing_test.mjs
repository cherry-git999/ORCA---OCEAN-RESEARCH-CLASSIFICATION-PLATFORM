import fs from 'fs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const SUBPIPE_PBM_PATH = '/media/cherry/External Hardisk/ps 57/datasets/SubPipeMiniSSS/DATA/SSS_HF_images/Image/1693569383.780.pbm';
const HARDWARE_JPG_PATH = '/media/cherry/External Hardisk/ps 57/SIH26057/model3_experiments/datasets/esp_hardware_clean/images/clip_009.jpg';
const BLACK_PNG_PATH = '/home/cherry/Documents/workspace/mldashbordproject/scratch/black_test.png';

async function runCdpE2E() {
  console.log('================================================================================');
  console.log('STEP 8 END-TO-END CHROME CDP BROWSER VALIDATION');
  console.log('================================================================================');

  const listRes = await fetch('http://127.0.0.1:9222/json/list');
  const targets = await listRes.json();
  let pageTarget = targets.find((t) => t.type === 'page');

  if (!pageTarget) {
    const newRes = await fetch('http://127.0.0.1:9222/json/new?http://127.0.0.1:5173/#/analyze');
    pageTarget = await newRes.json();
  }

  const wsUrl = pageTarget.webSocketDebuggerUrl;
  console.log('Connecting to Chrome CDP WebSocket:', wsUrl);
  const ws = new WebSocket(wsUrl);

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
        reject(new Error(`CDP Error in ${msg.error.message}`));
      } else {
        resolve(msg.result);
      }
    }
  };

  await sendCommand('Page.enable');
  await sendCommand('DOM.enable');
  await sendCommand('Runtime.enable');

  // Navigate to Analyze Page
  console.log('\n[1] Navigating to http://127.0.0.1:5173/#/analyze...');
  await sendCommand('Page.navigate', { url: 'http://127.0.0.1:5173/#/analyze' });
  await sleep(2000);

  // Evaluate Detection Mode Buttons
  console.log('\n[2] Checking Detection Mode selector in DOM...');
  const checkButtonsResult = await sendCommand('Runtime.evaluate', {
    expression: `
      (() => {
        const autoBtn = document.querySelector('[data-testid="mode-auto-btn"]');
        const pipeBtn = document.querySelector('[data-testid="target-pipeline-btn"]');
        const humanBtn = document.querySelector('[data-testid="target-human-btn"]');
        const hwBtn = document.querySelector('[data-testid="target-hardware-btn"]');
        return {
          hasAuto: !!autoBtn,
          hasPipe: !!pipeBtn,
          hasHuman: !!humanBtn,
          hasHw: !!hwBtn,
          autoText: autoBtn ? autoBtn.innerText.trim() : null
        };
      })()
    `,
    returnByValue: true
  });
  const btnVals = checkButtonsResult.result?.value || checkButtonsResult.value || {};
  console.log('  Mode buttons found:', JSON.stringify(btnVals));
  if (!btnVals.hasAuto || !btnVals.hasPipe) {
    throw new Error('Detection mode buttons missing from DOM');
  }

  // TEST A: Upload Hardware Image in Automatic Mode
  console.log('\n[3] Testing Hardware Upload (Automatic Mode)...');
  const fileInputDoc = await sendCommand('DOM.getDocument');
  const fileInputNode = await sendCommand('DOM.querySelector', {
    nodeId: fileInputDoc.root.nodeId,
    selector: 'input[type="file"]'
  });

  await sendCommand('DOM.setFileInputFiles', {
    nodeId: fileInputNode.nodeId,
    files: [HARDWARE_JPG_PATH]
  });
  console.log('  Injected clip_009.jpg into file input. Waiting for auto-analysis...');

  // Wait for Modal to Appear
  let modalVisible = false;
  let modalData = null;
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    const evalModal = await sendCommand('Runtime.evaluate', {
      expression: `
        (() => {
          const card = document.querySelector('[data-testid="auto-routing-modal-card"]');
          if (!card) return null;
          const domain = document.querySelector('[data-testid="modal-selected-domain"]')?.innerText;
          const specialist = document.querySelector('[data-testid="modal-specialist-model"]')?.innerText;
          const confidence = document.querySelector('[data-testid="modal-routing-confidence"]')?.innerText;
          return { domain, specialist, confidence };
        })()
      `,
      returnByValue: true
    });
    const mVal = evalModal.result?.value || evalModal.value;
    if (mVal) {
      modalVisible = true;
      modalData = mVal;
      break;
    }
  }

  if (!modalVisible) throw new Error('AutoRoutingModal did not appear after hardware upload');
  console.log('  PASS: AutoRoutingModal appeared successfully!');
  console.log('  Modal Telemetry:', JSON.stringify(modalData, null, 2));
  if (modalData.domain !== 'HARDWARE' && modalData.domain !== 'hardware') {
    throw new Error(`Expected HARDWARE domain, got ${modalData.domain}`);
  }

  // Click [ View Results ]
  console.log('\n[4] Clicking [ View Results ] button in modal...');
  await sendCommand('Runtime.evaluate', {
    expression: `document.querySelector('[data-testid="modal-view-results-btn"]').click()`
  });
  await sleep(1000);

  // Verify Detection Results & Scaled Bounding Boxes
  const evalResults = await sendCommand('Runtime.evaluate', {
    expression: `
      (() => {
        const resultsSection = document.querySelector('[data-testid="predict-results-section"]');
        const boxes = document.querySelectorAll('[data-testid^="overlay-box-"]');
        const items = document.querySelectorAll('[data-testid^="detection-item-"]');
        const autoBadge = document.querySelector('[data-testid="auto-routed-badge"]');
        return {
          hasResults: !!resultsSection,
          boxCount: boxes.length,
          itemCount: items.length,
          hasAutoBadge: !!autoBadge,
          autoBadgeText: autoBadge ? autoBadge.innerText.trim() : null
        };
      })()
    `,
    returnByValue: true
  });
  const rVal = evalResults.result?.value || evalResults.value || {};
  console.log('  Detection Results Verification:', JSON.stringify(rVal, null, 2));
  if (!rVal.hasResults || rVal.boxCount === 0) {
    throw new Error('Bounding boxes or results section not rendered');
  }
  console.log(`  PASS: ${rVal.boxCount} bounding boxes rendered on detection viewer!`);

  // Take screenshot
  const shotHw = await sendCommand('Page.captureScreenshot', { format: 'png' });
  const shotData = shotHw.result?.data || shotHw.data;
  fs.writeFileSync('scratch/e2e_hardware_auto_result.png', Buffer.from(shotData, 'base64'));
  console.log('  Saved hardware detection screenshot to scratch/e2e_hardware_auto_result.png');

  // TEST B: Click "New Analysis" and upload Degenerate Black Image
  console.log('\n[5] Testing Degenerate Image Handling in Automatic Mode...');
  await sendCommand('Runtime.evaluate', {
    expression: `document.querySelector('[data-testid="reset-analysis-btn"]')?.click()`
  });
  await sleep(1000);

  const fileInputDoc2 = await sendCommand('DOM.getDocument');
  const fileInputNode2 = await sendCommand('DOM.querySelector', {
    nodeId: fileInputDoc2.result ? fileInputDoc2.result.root.nodeId : fileInputDoc2.root.nodeId,
    selector: 'input[type="file"]'
  });

  await sendCommand('DOM.setFileInputFiles', {
    nodeId: fileInputNode2.result ? fileInputNode2.result.nodeId : fileInputNode2.nodeId,
    files: [BLACK_PNG_PATH]
  });
  console.log('  Injected black_test.png into file input. Waiting for auto-analysis...');

  let uncertainModalVisible = false;
  let uncertainData = null;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    const evalUncertain = await sendCommand('Runtime.evaluate', {
      expression: `
        (() => {
          const card = document.querySelector('[data-testid="auto-routing-modal-card"]');
          if (!card) return null;
          const title = card.querySelector('h2')?.innerText;
          const reason = document.querySelector('[data-testid="modal-uncertain-reason"]')?.innerText;
          const conf = document.querySelector('[data-testid="modal-uncertain-confidence"]')?.innerText;
          const pipeBtn = document.querySelector('[data-testid="modal-fallback-pipeline-btn"]');
          const hwBtn = document.querySelector('[data-testid="modal-fallback-hardware-btn"]');
          return { title, reason, conf, hasFallbacks: !!(pipeBtn && hwBtn) };
        })()
      `,
      returnByValue: true
    });
    const uVal = evalUncertain.result?.value || evalUncertain.value;
    if (uVal && uVal.title?.includes('UNCERTAIN')) {
      uncertainModalVisible = true;
      uncertainData = uVal;
      break;
    }
  }

  if (!uncertainModalVisible) throw new Error('Uncertain modal did not appear for degenerate input');
  console.log('  PASS: Uncertain modal appeared with manual fallback options!');
  console.log('  Uncertain Telemetry:', JSON.stringify(uncertainData, null, 2));

  // Take screenshot of uncertain modal
  const shotUncertain = await sendCommand('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/e2e_uncertain_modal_result.png', Buffer.from(shotUncertain.data, 'base64'));
  console.log('  Saved uncertain modal screenshot to scratch/e2e_uncertain_modal_result.png');

  ws.close();
  console.log('\n================================================================================');
  console.log('CHROME CDP E2E BROWSER VALIDATION PASSED 100%!');
  console.log('================================================================================');
}

runCdpE2E().catch((err) => {
  console.error('Fatal CDP E2E Error:', err);
  process.exit(1);
});
