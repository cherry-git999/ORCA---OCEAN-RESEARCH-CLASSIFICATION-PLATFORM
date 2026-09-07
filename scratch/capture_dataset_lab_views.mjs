import { spawn } from 'child_process';
import fs from 'fs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function captureFullPage() {
  const chromeProc = spawn('/usr/bin/google-chrome', [
    '--headless=new',
    '--remote-debugging-port=9335',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    'about:blank',
  ]);

  await sleep(1500);

  try {
    const newTabRes = await fetch('http://127.0.0.1:9335/json/new', { method: 'PUT' });
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

    await sendCommand('Page.navigate', { url: 'http://127.0.0.1:5173/#/dataset-lab' });
    await sleep(1000);

    // Click sample dataset and simulate
    await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('#btn-load-sample-dataset');
        if (btn) btn.click();
      })()`,
    });
    await sleep(500);

    await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('#btn-start-dataset-validation');
        if (btn) btn.click();
      })()`,
    });
    await sleep(6200);

    // Scroll down to show 6 cards and Model Registry
    await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        const el = document.querySelector('.app-main');
        if (el) el.scrollTop = 550;
      })()`,
    });
    await sleep(600);

    const shot1 = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/test_orca_21_dataset_lab_workflow_cards.png', Buffer.from(shot1.data, 'base64'));
    fs.copyFileSync('scratch/test_orca_21_dataset_lab_workflow_cards.png', '/home/cherry/.gemini/antigravity-ide/brain/71da989d-e552-414a-8a5c-2151eaf5d91a/test_orca_21_dataset_lab_workflow_cards.png');

    // Scroll to bottom to show Model Registry & Architecture Statement
    await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        const el = document.querySelector('.app-main');
        if (el) el.scrollTop = 1200;
      })()`,
    });
    await sleep(600);

    const shot2 = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/test_orca_22_dataset_lab_registry_and_footer.png', Buffer.from(shot2.data, 'base64'));
    fs.copyFileSync('scratch/test_orca_22_dataset_lab_registry_and_footer.png', '/home/cherry/.gemini/antigravity-ide/brain/71da989d-e552-414a-8a5c-2151eaf5d91a/test_orca_22_dataset_lab_registry_and_footer.png');

    ws.close();
  } finally {
    chromeProc.kill();
  }
}

captureFullPage().catch(console.error);
