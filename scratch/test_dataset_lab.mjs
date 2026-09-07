import { spawn } from 'child_process';
import fs from 'fs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTest() {
  console.log('================================================================');
  console.log('DATASET LAB E2E VERIFICATION TEST');
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

  // 1. Launch headless chrome
  console.log('Starting headless Chrome on port 9334...');
  const chromeProc = spawn('/usr/bin/google-chrome', [
    '--headless=new',
    '--remote-debugging-port=9334',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    'about:blank',
  ]);

  await sleep(1500);

  try {
    // 2. Open new tab or get existing target
    const newTabRes = await fetch('http://127.0.0.1:9334/json/new', { method: 'PUT' });
    const target = await newTabRes.json();
    console.log('Target created:', target.webSocketDebuggerUrl);

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

    await sendCommand('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // Test 1: Sidebar navigation item exists under Operations & Intelligence
    console.log('\n--- 1. Testing Sidebar Dataset Lab Navigation ---');
    await sendCommand('Page.navigate', { url: 'http://127.0.0.1:5173/#/dashboard' });
    await sleep(1500);

    const hasDatasetLabNav = await evaluate(`
      Array.from(document.querySelectorAll('.app-sidebar button')).some(b => b.innerText.includes('Dataset Lab'))
    `);
    assert(hasDatasetLabNav, 'Dataset Lab navigation item appears in sidebar');

    // Click Dataset Lab in sidebar
    await evaluate(`
      const btn = Array.from(document.querySelectorAll('.app-sidebar button')).find(b => b.innerText.includes('Dataset Lab'));
      if (btn) btn.click();
    `);
    await sleep(800);

    const currentHash = await evaluate(`window.location.hash`);
    assert(currentHash === '#/dataset-lab', 'Navigates to #/dataset-lab');

    // Test 2: Header, subtitle, badge
    console.log('\n--- 2. Testing Page Header & Status Badge ---');
    const headerTitle = await evaluate(`document.querySelector('#dataset-lab-page h1')?.innerText`);
    assert(headerTitle?.includes('DATASET LAB'), 'Header title contains DATASET LAB');

    const headerSub = await evaluate(`
      Array.from(document.querySelectorAll('#dataset-lab-page *')).some(el => el.innerText?.includes('Adapt ORCA to New Underwater Domains'))
    `);
    assert(headerSub, 'Subtitle Adapt ORCA to New Underwater Domains is rendered');

    const hasBadge = await evaluate(`
      Array.from(document.querySelectorAll('.badge')).some(b => b.innerText?.includes('DATASET ADAPTATION WORKSPACE'))
    `);
    assert(hasBadge, 'Status badge DATASET ADAPTATION WORKSPACE is present');

    // Test 3: Main Upload Area
    console.log('\n--- 3. Testing Upload Card & Drop Area ---');
    const hasUploadTitle = await evaluate(`
      Array.from(document.querySelectorAll('#dataset-lab-page h2')).some(h => h.innerText?.includes('UPLOAD ANNOTATED DATASET'))
    `);
    assert(hasUploadTitle, 'Card UPLOAD ANNOTATED DATASET is displayed');

    const hasExpectedStructure = await evaluate(`
      document.querySelector('#dataset-lab-page pre')?.innerText?.includes('data.yaml')
    `);
    assert(hasExpectedStructure, 'Expected structure (dataset/, images/, labels/, data.yaml) is displayed');

    await captureScreenshot('test_orca_18_dataset_lab_initial.png');

    // Test 4: All 6 workflow steps are visible
    console.log('\n--- 4. Testing 6 Always-Visible Workflow Steps ---');
    const stepTexts = await evaluate(`
      Array.from(document.querySelectorAll('#dataset-lab-page .app-card')).map(c => c.innerText)
    `);

    assert(stepTexts.some(t => t.includes('01') && t.includes('DATASET UPLOAD')), 'Step 01 DATASET UPLOAD is visible');
    assert(stepTexts.some(t => t.includes('02') && t.includes('DATASET VALIDATION')), 'Step 02 DATASET VALIDATION is visible');
    assert(stepTexts.some(t => t.includes('03') && t.includes('PREPROCESSING')), 'Step 03 PREPROCESSING is visible');
    assert(stepTexts.some(t => t.includes('04') && t.includes('MODEL ADAPTATION')), 'Step 04 MODEL ADAPTATION is visible');
    assert(stepTexts.some(t => t.includes('05') && t.includes('EVALUATION')), 'Step 05 EVALUATION is visible');
    assert(stepTexts.some(t => t.includes('06') && t.includes('MODEL REGISTRATION')), 'Step 06 MODEL REGISTRATION is visible');

    // Test 5: Validation checks list
    console.log('\n--- 5. Testing Validation Checks List ---');
    const hasPairingCheck = stepTexts.some(t => t.includes('Image / label pairing'));
    const hasLeakageCheck = stepTexts.some(t => t.includes('Train / validation / test leakage'));
    assert(hasPairingCheck && hasLeakageCheck, 'Validation checks (pairing, leakage, etc.) are present');

    // Test 6: Evaluation Metrics Placeholder Guarantee
    console.log('\n--- 6. Testing Evaluation Metrics Guarantee ---');
    const hasPlaceholderNotice = await evaluate(`
      Array.from(document.querySelectorAll('#dataset-lab-page *')).some(el => el.innerText?.includes('Metrics available after training'))
    `);
    assert(hasPlaceholderNotice, 'Metrics available after training notice is present');

    const hasNoFakeHighMetrics = await evaluate(`
      !document.querySelector('#dataset-lab-page')?.innerText?.includes('95%') &&
      !document.querySelector('#dataset-lab-page')?.innerText?.includes('99%')
    `);
    assert(hasNoFakeHighMetrics, 'No fake high metrics (95%, 99%) displayed');

    // Test 7: Model Registry Visualization
    console.log('\n--- 7. Testing Model Registry Visualization ---');
    const hasPipelineActive = stepTexts.some(t => t.includes('Pipeline Specialist') && t.includes('ACTIVE'));
    const hasHumanActive = stepTexts.some(t => t.includes('Human Specialist') && t.includes('ACTIVE'));
    const hasHardwareActive = stepTexts.some(t => t.includes('Hardware Specialist') && t.includes('ACTIVE'));
    const hasCandidate = stepTexts.some(t => t.includes('CANDIDATE'));

    assert(hasPipelineActive, 'Model 1: Pipeline Specialist is ACTIVE');
    assert(hasHumanActive, 'Model 2: Human Specialist is ACTIVE');
    assert(hasHardwareActive, 'Model 3: Hardware Specialist is ACTIVE');
    assert(hasCandidate, 'Candidate Specialist is marked CANDIDATE');

    // Test 8: Load Sample Dataset
    console.log('\n--- 8. Testing Load Sample Dataset Interaction ---');
    await evaluate(`
      (() => {
        const sampleBtn = document.querySelector('#btn-load-sample-dataset');
        if (sampleBtn) sampleBtn.click();
      })()
    `);
    await sleep(800);

    const hasSummaryCard = await evaluate(`
      Array.from(document.querySelectorAll('#dataset-lab-page h2')).some(h => h.innerText?.includes('DATASET SUMMARY'))
    `);
    assert(hasSummaryCard, 'DATASET SUMMARY card appears after loading sample');

    const summaryDetails = await evaluate(`
      document.querySelector('#dataset-lab-page')?.innerText
    `);
    assert(summaryDetails.includes('Marine_Debris_v1'), 'Dataset name Marine_Debris_v1 is displayed');
    assert(summaryDetails.includes('1,250'), 'Image count 1,250 is displayed');
    assert(summaryDetails.includes('1,180'), 'Annotation count 1,180 is displayed');
    assert(summaryDetails.includes('READY FOR VALIDATION'), 'Status READY FOR VALIDATION is displayed');

    await captureScreenshot('test_orca_19_dataset_lab_sample_loaded.png');

    // Test 9: Start Validation Simulation
    console.log('\n--- 9. Testing Workflow Simulation Lifecycle ---');
    await evaluate(`
      (() => {
        const startBtn = document.querySelector('#btn-start-dataset-validation');
        if (startBtn) startBtn.click();
      })()
    `);
    console.log('    Simulating workflow phases across 6.5 seconds...');
    await sleep(7000);

    const completedBanner = await evaluate(`
      document.querySelector('#simulation-completed-banner')?.innerText
    `);
    assert(completedBanner?.includes('Dataset adaptation & candidate evaluation workflow prepared'), 'Banner contains Dataset adaptation & candidate evaluation workflow prepared');

    // Verify Evaluation metrics are populated with simulated scores
    const evalScoresText = await evaluate(`
      document.querySelector('#dataset-lab-page')?.innerText
    `);
    assert(evalScoresText.includes('88.4%'), 'Precision score 88.4% is populated in Evaluation card');
    assert(evalScoresText.includes('84.2%'), 'Recall score 84.2% is populated in Evaluation card');
    assert(evalScoresText.includes('86.7%'), 'mAP50 score 86.7% is populated in Evaluation card');
    assert(evalScoresText.includes('61.5%'), 'mAP50-95 score 61.5% is populated in Evaluation card');
    assert(evalScoresText.includes('Candidate validation benchmark (Simulated)'), 'Validation benchmark notice is displayed');

    // Test 10: Architecture Statement at Bottom
    console.log('\n--- 10. Testing Architecture Statement at Bottom ---');
    const finalPageText = await evaluate(`
      document.querySelector('#dataset-lab-page')?.innerText
    `);
    const hasArchStatement = finalPageText.includes('Open & Dataset-Adaptive Architecture');
    const hasArchQuote = finalPageText.includes('controlled validation, adaptation and evaluation workflow');
    assert(hasArchStatement && hasArchQuote, 'Architecture statement is rendered at the bottom');

    await captureScreenshot('test_orca_20_dataset_lab_workflow_completed.png');

    console.log('\n================================================================');
    console.log(`ALL VERIFICATION TESTS PASSED! (${passed}/${passed + failed})`);
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
