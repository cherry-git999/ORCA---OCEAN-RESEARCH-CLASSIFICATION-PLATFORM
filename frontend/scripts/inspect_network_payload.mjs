import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SAMPLE_DATA_DIR = path.resolve(__dirname, '../sample_data');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function checkNetworkPayload() {
  console.log('=== CHECKING EXACT BYTE-FOR-BYTE /analyze NETWORK PAYLOAD ===');

  const listRes = await fetch('http://127.0.0.1:9222/json/list');
  const targets = await listRes.json();
  const pageTarget = targets.find((t) => t.type === 'page');

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  let idCounter = 1;
  const pendingRequests = new Map();

  function sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      pendingRequests.set(id, { resolve, reject, method });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  let analyzeRequestId = null;
  let analyzeResponseInfo = null;

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pendingRequests.has(msg.id)) {
      const { resolve, reject } = pendingRequests.get(msg.id);
      pendingRequests.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    } else if (msg.method) {
      if (msg.method === 'Network.responseReceived') {
        const resp = msg.params.response;
        if (resp.url.includes('/analyze')) {
          analyzeRequestId = msg.params.requestId;
          analyzeResponseInfo = resp;
          console.log('[NETWORK EVENT] Received response for /analyze, requestId:', analyzeRequestId);
        }
      }
    }
  };

  await new Promise((resolve) => { ws.onopen = resolve; });

  await sendCommand('Network.enable');

  // Trigger re-analysis of SubPipe
  await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.getElementById('nav-analyze');
      if (btn) btn.click();
      else window.location.hash = '#/analyze';
    })()`,
  });
  await sleep(1500);

  await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.getElementById('target-pipeline-btn');
      if (btn) btn.click();
    })()`,
  });
  await sleep(500);

  const doc = await sendCommand('DOM.getDocument', { depth: -1 });
  const fileInput = await sendCommand('DOM.querySelector', {
    nodeId: doc.root.nodeId,
    selector: '#sonar-file-input',
  });
  await sendCommand('DOM.setFileInputFiles', {
    files: [path.join(SAMPLE_DATA_DIR, '1693569383.780.pbm')],
    nodeId: fileInput.nodeId,
  });
  await sleep(2500);

  await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.getElementById('execute-analysis-button');
      if (btn) btn.click();
    })()`,
  });

  await sleep(4500);

  if (analyzeRequestId) {
    const bodyResult = await sendCommand('Network.getResponseBody', { requestId: analyzeRequestId });
    console.log('\n--- EXACT /analyze RESPONSE BODY FROM BROWSER NETWORK ---');
    console.log(bodyResult.body);

    const parsed = JSON.parse(bodyResult.body);
    console.log('\nParsed JSON Structure:');
    console.log('status:', parsed.status);
    console.log('model:', parsed.model);
    console.log('image:', parsed.image);
    console.log('analysis.detection_count:', parsed.analysis.detection_count);
    console.log('analysis.highest_confidence:', parsed.analysis.highest_confidence);
    console.log('detections:', JSON.stringify(parsed.analysis.detections, null, 2));

    // Now compare with SonarContext state in the React DOM
    const contextState = await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        // Find state in DOM / table
        const tr = document.querySelector('table tbody tr');
        const activeOption = document.querySelector('header select')?.value;
        return {
          activeOption,
          tableRow: tr ? tr.innerText.replace(/\\s+/g, ' ').trim() : null,
        };
      })()`,
      returnByValue: true,
    });
    console.log('\nReact UI State in DOM:', contextState.result.value);
  } else {
    console.error('No analyze request intercepted!');
  }

  ws.close();
}

checkNetworkPayload().catch(console.error);
