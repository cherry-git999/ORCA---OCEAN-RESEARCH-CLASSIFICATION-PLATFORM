import { spawn } from 'child_process';
import fs from 'fs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function captureScrolledInspector() {
  const chromeProc = spawn('/usr/bin/google-chrome', [
    '--headless=new',
    '--remote-debugging-port=9339',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    'about:blank',
  ]);

  await sleep(1500);

  try {
    const newTabRes = await fetch('http://127.0.0.1:9339/json/new', { method: 'PUT' });
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
      height: 1080,
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

    await sendCommand('Page.navigate', { url: 'http://127.0.0.1:5173/#/analyze' });
    await sleep(1200);

    const doc = await sendCommand('DOM.getDocument');
    const fileInput = await sendCommand('DOM.querySelector', {
      nodeId: doc.root.nodeId,
      selector: '#sonar-file-input',
    });

    const HARDWARE_JPG_PATH = '/media/cherry/External Hardisk/ps 57/SIH26057/model3_experiments/datasets/esp_hardware_clean/images/clip_009.jpg';
    await sendCommand('DOM.setFileInputFiles', {
      nodeId: fileInput.nodeId,
      files: [HARDWARE_JPG_PATH],
    });

    await evaluate(`
      document.querySelector('#sonar-file-input')?.dispatchEvent(new Event('change', { bubbles: true }));
    `);

    for (let i = 0; i < 30; i++) {
      await sleep(300);
      const open = await evaluate(`!!document.getElementById('auto-routing-modal-card')`);
      if (open) break;
    }

    await evaluate(`document.getElementById('modal-continue-btn')?.click()`);
    await sleep(400);

    await evaluate(`document.getElementById('continue-to-workspace-btn')?.click()`);
    await sleep(1000);

    // Scroll right column down to show Anomaly Details & Detection Intelligence
    await evaluate(`
      const detPanel = document.getElementById('detection-intelligence-panel');
      if (detPanel) {
        detPanel.scrollIntoView({ behavior: 'instant', block: 'center' });
      }
    `);
    await sleep(600);

    const res = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/test_orca_28_detection_intelligence_inspector.png', Buffer.from(res.data, 'base64'));
    const artifactPath = '/home/cherry/.gemini/antigravity-ide/brain/71da989d-e552-414a-8a5c-2151eaf5d91a/test_orca_28_detection_intelligence_inspector.png';
    fs.copyFileSync('scratch/test_orca_28_detection_intelligence_inspector.png', artifactPath);
    console.log('Saved test_orca_28_detection_intelligence_inspector.png');

    ws.close();
  } finally {
    chromeProc.kill();
  }
}

captureScrolledInspector().catch(console.error);
