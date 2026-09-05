import fs from 'fs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runFullForensic() {
  console.log('=== STARTING FULL FORENSIC INVESTIGATION (TEST A + TEST B) ===');

  const listRes = await fetch('http://127.0.0.1:9222/json/list');
  const targets = await listRes.json();
  let pageTarget = targets.find((t) => t.type === 'page');

  if (!pageTarget) {
    const newRes = await fetch('http://127.0.0.1:9222/json/new?http://127.0.0.1:5173');
    pageTarget = await newRes.json();
  }

  const wsUrl = pageTarget.webSocketDebuggerUrl;
  console.log('Connecting to Chrome CDP WebSocket:', wsUrl);
  const ws = new WebSocket(wsUrl);

  let idCounter = 1;
  const pendingRequests = new Map();

  function sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      pendingRequests.set(id, { resolve, reject, method });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  const consoleLogs = [];
  const networkRequests = [];
  const networkResponses = [];

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pendingRequests.has(msg.id)) {
      const { resolve, reject } = pendingRequests.get(msg.id);
      pendingRequests.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    } else if (msg.method) {
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map((a) => a.value !== undefined ? a.value : JSON.stringify(a)).join(' ');
        consoleLogs.push({ type: msg.params.type, text });
        console.log(`[BROWSER CONSOLE ${msg.params.type.toUpperCase()}]:`, text);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        console.log('[BROWSER UNCAUGHT EXCEPTION]:', msg.params.exceptionDetails?.text, msg.params.exceptionDetails?.exception?.description);
      } else if (msg.method === 'Network.requestWillBeSent') {
        networkRequests.push(msg.params.request);
      } else if (msg.method === 'Network.responseReceived') {
        networkResponses.push(msg.params.response);
      }
    }
  };

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  await sendCommand('Page.enable');
  await sendCommand('DOM.enable');
  await sendCommand('Runtime.enable');
  await sendCommand('Network.enable');

  await sendCommand('Emulation.setDeviceMetricsOverride', {
    width: 1600,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });

  // Navigate to root
  console.log('Navigating to http://127.0.0.1:5173...');
  await sendCommand('Page.navigate', { url: 'http://127.0.0.1:5173' });
  await sleep(2500);

  // =========================================================================
  // TEST A: SubPipe 1693569383.780.pbm (Pipeline Specialist)
  // =========================================================================
  const testAFile = '/media/cherry/External Hardisk/ps 57/datasets/SubPipeMiniSSS/DATA/SSS_HF_images/Image/1693569383.780.pbm';
  console.log('\n============================================================');
  console.log('TEST A: SubPipe', testAFile);
  console.log('============================================================');

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
    files: [testAFile],
    nodeId: fileInput.nodeId,
  });

  await sleep(3000);

  await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.getElementById('execute-analysis-button');
      if (btn) btn.click();
    })()`,
  });

  await sleep(4500);

  // Capture Screenshot of Test A
  const ssA = await sendCommand('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('/tmp/forensic_test_a_full.png', Buffer.from(ssA.data, 'base64'));

  // Get Test A state
  const testAState = await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      const img = document.querySelector('img[alt="Side-Scan Sonar Scan"]');
      const svg = document.querySelector('.glass-panel svg[viewBox]');
      const rects = svg ? Array.from(svg.querySelectorAll('rect')).map(r => ({
        x: r.getAttribute('x'),
        y: r.getAttribute('y'),
        w: r.getAttribute('width'),
        h: r.getAttribute('height'),
        stroke: r.getAttribute('stroke'),
        strokeWidth: r.getAttribute('stroke-width'),
      })) : [];
      return {
        hash: window.location.hash,
        imgSrcLen: img ? img.src.length : 0,
        imgNatural: img ? { w: img.naturalWidth, h: img.naturalHeight } : null,
        imgDisplay: img ? { w: img.clientWidth, h: img.clientHeight } : null,
        svgViewBox: svg ? svg.getAttribute('viewBox') : null,
        rects,
      };
    })()`,
    returnByValue: true,
  });
  console.log('TEST A State:', JSON.stringify(testAState.result.value, null, 2));

  // =========================================================================
  // TEST B: AquaScan PNG (Human Specialist) WITHOUT REFRESH
  // =========================================================================
  const testBFile = '/media/cherry/External Hardisk/ps 57/SIH26057/model2_experiments/datasets/aquascan_1k_clean/images/0002b00e-Screenshot_2025-08-10_23.00.36.png';
  console.log('\n============================================================');
  console.log('TEST B: AquaScan (Without Refresh)', testBFile);
  console.log('============================================================');

  // Navigate to #/analyze without refreshing
  await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.getElementById('nav-analyze');
      if (btn) btn.click();
      else window.location.hash = '#/analyze';
    })()`,
  });
  await sleep(1500);

  // Select Human Specialist
  await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.getElementById('target-human-btn');
      if (btn) btn.click();
    })()`,
  });
  await sleep(500);

  const docB = await sendCommand('DOM.getDocument', { depth: -1 });
  const fileInputB = await sendCommand('DOM.querySelector', {
    nodeId: docB.root.nodeId,
    selector: '#sonar-file-input',
  });
  await sendCommand('DOM.setFileInputFiles', {
    files: [testBFile],
    nodeId: fileInputB.nodeId,
  });

  await sleep(3000);

  // Check dropzone state for AquaScan
  const dropzoneB = await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      const img = document.querySelector('.glass-panel-elevated img');
      return {
        src: img ? img.src.slice(0, 50) : null,
        naturalWidth: img ? img.naturalWidth : null,
        naturalHeight: img ? img.naturalHeight : null,
      };
    })()`,
    returnByValue: true,
  });
  console.log('TEST B Dropzone state:', dropzoneB.result.value);

  // Click Execute Real Analysis
  await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.getElementById('execute-analysis-button');
      if (btn) btn.click();
    })()`,
  });

  await sleep(4500);

  // Capture Screenshot of Test B
  const ssB = await sendCommand('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('/tmp/forensic_test_b_full.png', Buffer.from(ssB.data, 'base64'));

  // Get Test B state
  const testBState = await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      const img = document.querySelector('img[alt="Side-Scan Sonar Scan"]');
      const svg = document.querySelector('.glass-panel svg[viewBox]');
      const rects = svg ? Array.from(svg.querySelectorAll('rect')).map(r => ({
        x: r.getAttribute('x'),
        y: r.getAttribute('y'),
        w: r.getAttribute('width'),
        h: r.getAttribute('height'),
        stroke: r.getAttribute('stroke'),
        strokeWidth: r.getAttribute('stroke-width'),
      })) : [];
      const labels = Array.from(document.querySelectorAll('svg text')).map(t => t.textContent);
      const badges = Array.from(document.querySelectorAll('.badge')).map(b => b.innerText.trim());
      const tableRows = Array.from(document.querySelectorAll('table tbody tr')).map(tr => tr.innerText.replace(/\\s+/g, ' ').trim());

      return {
        hash: window.location.hash,
        imgSrcType: img ? (img.src.startsWith('blob:') ? 'blob_url' : img.src.startsWith('data:') ? 'data_url' : img.src) : null,
        imgNatural: img ? { w: img.naturalWidth, h: img.naturalHeight } : null,
        svgViewBox: svg ? svg.getAttribute('viewBox') : null,
        rects,
        labels,
        badges,
        tableRows,
      };
    })()`,
    returnByValue: true,
  });
  console.log('TEST B State:', JSON.stringify(testBState.result.value, null, 2));

  ws.close();
  console.log('=== FULL FORENSIC RUN FINISHED ===');
}

runFullForensic().catch(err => {
  console.error('Forensic error:', err);
  process.exit(1);
});
