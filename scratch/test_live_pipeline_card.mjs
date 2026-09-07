import { spawn } from 'child_process';
import fs from 'fs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTest() {
  console.log('================================================================');
  console.log('LIVE DATA PIPELINE UI VERIFICATION');
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
    '--remote-debugging-port=9336',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    'about:blank',
  ]);

  await sleep(1500);

  try {
    const newTabRes = await fetch('http://127.0.0.1:9336/json/new', { method: 'PUT' });
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

    await sendCommand('Page.navigate', { url: 'http://127.0.0.1:5173/#/hardware' });
    await sleep(1500);

    // 1. Verify component existence
    const cardTitle = await evaluate(`
      document.querySelector('#live-data-pipeline-card h3')?.innerText
    `);
    assert(cardTitle === 'LIVE DATA PIPELINE', 'Component LIVE DATA PIPELINE exists');

    // 2. Verify sub label
    const subLabel = await evaluate(`
      document.querySelector('#live-data-pipeline-card')?.innerText?.includes('Real-Time Hardware Data Flow')
    `);
    assert(subLabel, 'Real-Time Hardware Data Flow label is present');

    // 3. Verify 5 Flow nodes
    const cardText = await evaluate(`
      document.querySelector('#live-data-pipeline-card')?.innerText
    `);
    assert(cardText.includes('SONAR / HARDWARE'), 'Node SONAR / HARDWARE is present');
    assert(cardText.includes('IMAGE + SONAR DATA'), 'Node IMAGE + SONAR DATA is present');
    assert(cardText.includes('FASTAPI DATA INGESTION'), 'Node FASTAPI DATA INGESTION is present');
    assert(cardText.includes('ORCA AI ENGINE'), 'Node ORCA AI ENGINE is present');
    assert(cardText.includes('SHORE OPERATOR / DASHBOARD'), 'Node SHORE OPERATOR / DASHBOARD is present');

    // 4. Verify 4 status indicators
    assert(cardText.includes('Hardware Connected:'), 'Status indicator Hardware Connected exists');
    assert(cardText.includes('API Connected:'), 'Status indicator API Connected exists');
    assert(cardText.includes('Data Received:'), 'Status indicator Data Received exists');
    assert(cardText.includes('AI Processing:'), 'Status indicator AI Processing exists');

    // 5. Verify architecture wording
    assert(cardText.toUpperCase().includes('CURRENT:'), 'Current label exists');
    assert(cardText.includes('Local Network / FastAPI'), 'Wording Local Network / FastAPI is present');
    assert(cardText.toUpperCase().includes('DEPLOYMENT READY:'), 'Deployment Ready label exists');
    assert(cardText.includes('Cloud Gateway / Remote Shore Access'), 'Wording Cloud Gateway / Remote Shore Access is present');

    // 6. Verify NO fake "Cloud Connected" claims
    assert(!cardText.includes('Cloud Connected'), 'No "Cloud Connected" claim');
    assert(!cardText.includes('Cloud Active'), 'No "Cloud Active" claim');
    assert(!cardText.includes('Cloud Streaming'), 'No "Cloud Streaming" claim');

    await captureScreenshot('test_orca_23_live_pipeline_card.png');

    console.log('\n================================================================');
    console.log(`ALL LIVE DATA PIPELINE TESTS PASSED! (${passed}/${passed + failed})`);
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
