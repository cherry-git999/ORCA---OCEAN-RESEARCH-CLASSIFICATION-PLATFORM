import http from 'http';
import fs from 'fs';

function cdpRequest(endpoint) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:9222${endpoint}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
      });
    }).on('error', reject);
  });
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    return new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
      this.ws.onmessage = (event) => {
        const parsed = JSON.parse(event.data);
        if (parsed.id && this.callbacks.has(parsed.id)) {
          const cb = this.callbacks.get(parsed.id);
          this.callbacks.delete(parsed.id);
          if (parsed.error) cb.reject(parsed.error);
          else cb.resolve(parsed.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expr) {
    const res = await this.send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  }

  async screenshot(filePath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(filePath, Buffer.from(res.data, 'base64'));
    console.log(`Saved screenshot to ${filePath}`);
  }
}

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});
process.on('exit', (code) => {
  console.log('Process exited with code:', code);
});

async function run() {
  const keepAlive = setInterval(() => {}, 1000);
  console.log('Starting run()...');
  const version = await cdpRequest('/json/version');
  console.log('Connected to Chrome version:', version['Browser']);

  const targets = await cdpRequest('/json');
  let target = targets.find(t => t.type === 'page');
  if (!target) {
    target = await cdpRequest('/json/new');
  }

  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.connect();
  console.log('CDP Connected.');

  await client.send('Page.enable');
  await client.send('DOM.enable');
  await client.send('Runtime.enable');

  // Set standard large 1080p viewport
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  // Navigate to frontend
  console.log('\n--- STEP 1: NAVIGATE TO FRONTEND ---');
  await client.send('Page.navigate', { url: 'http://127.0.0.1:5173/' });
  await new Promise(r => setTimeout(r, 2000));

  // TEST A: SubPipe .pbm
  console.log('\n--- STEP 2: TEST A - SUBPIPE .PBM LIVE INFERENCE ---');
  // Navigate to Analyze
  await client.eval(`window.location.hash = '#analyze'`);
  await new Promise(r => setTimeout(r, 800));

  // Select pipeline target
  await client.eval(`
    const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
    const pipeRadio = radios.find(r => r.value === 'pipeline');
    if (pipeRadio) { pipeRadio.click(); pipeRadio.dispatchEvent(new Event('change', { bubbles: true })); }
  `);

  // Upload file via file input
  const fileA = '/media/cherry/External Hardisk/ps 57/datasets/SubPipeMiniSSS/DATA/SSS_HF_images/Image/1693569383.780.pbm';
  const fileInputNode = await client.send('DOM.querySelector', {
    nodeId: (await client.send('DOM.getDocument')).root.nodeId,
    selector: 'input[type="file"]',
  });

  await client.send('DOM.setFileInputFiles', {
    nodeId: fileInputNode.nodeId,
    files: [fileA],
  });
  console.log('File A dispatched to file input.');
  await new Promise(r => setTimeout(r, 1500));

  // Click EXECUTE LIVE ANALYSIS
  await client.eval(`
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('EXECUTE LIVE ANALYSIS'));
    if (btn) btn.click();
  `);
  console.log('Clicked EXECUTE LIVE ANALYSIS. Waiting for inference...');

  // Wait for inference and navigation to workspace
  for (let i = 0; i < 30; i++) {
    const hash = await client.eval(`window.location.hash`);
    if (hash === '#workspace') break;
    await new Promise(r => setTimeout(r, 500));
  }
  await new Promise(r => setTimeout(r, 2500)); // allow layout & auto-focus

  // Capture DOM measurements for Test A
  const measurementsA = await client.eval(`
    (() => {
      const img = document.querySelector('img[alt="Sonar Acoustic Swath"]');
      const svg = document.querySelector('svg');
      const rect = svg ? svg.querySelector('rect') : null;
      const text = svg ? svg.querySelector('text') : null;
      const container = document.querySelector('#btn-focus-anomaly')?.closest('.glass-panel');
      const detailCoords = Array.from(document.querySelectorAll('.mono')).map(m => m.textContent.trim());

      const imgRect = img ? img.getBoundingClientRect() : null;
      const svgRect = svg ? svg.getBoundingClientRect() : null;
      const boxRect = rect ? rect.getBoundingClientRect() : null;

      return {
        hash: window.location.hash,
        img: img ? {
          srcType: img.src.startsWith('data:') ? 'dataURL' : img.src.startsWith('blob:') ? 'blobURL' : 'other',
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          displayedWidth: imgRect.width,
          displayedHeight: imgRect.height,
          top: imgRect.top,
          left: imgRect.left,
        } : null,
        svg: svg ? {
          viewBox: svg.getAttribute('viewBox'),
          widthAttr: svg.getAttribute('width'),
          heightAttr: svg.getAttribute('height'),
          rectWidth: svgRect.width,
          rectHeight: svgRect.height,
        } : null,
        anomalyBox: boxRect ? {
          left: boxRect.left,
          top: boxRect.top,
          width: boxRect.width,
          height: boxRect.height,
          inViewport: (boxRect.left >= 0 && boxRect.left + boxRect.width <= window.innerWidth),
        } : null,
        label: text ? text.textContent : null,
        zoomPercent: document.querySelector('.mono')?.textContent,
      };
    })()
  `);
  console.log('Test A Measurements:', JSON.stringify(measurementsA, null, 2));

  await client.screenshot('/tmp/verified_test_a_workspace.png');

  // Verify Centering: Check if anomaly box is within the viewport container
  const isCenteredA = await client.eval(`
    (() => {
      const rect = document.querySelector('svg rect');
      const container = document.querySelector('#btn-focus-anomaly')?.closest('.glass-panel');
      if (!rect || !container) return false;
      const rb = rect.getBoundingClientRect();
      const cb = container.getBoundingClientRect();
      return (rb.left >= cb.left && rb.right <= cb.right && rb.top >= cb.top && rb.bottom <= cb.bottom);
    })()
  `);
  console.log('Test A Anomaly is visually centered inside viewport container:', isCenteredA);

  // TEST B: AquaScan human image WITHOUT refresh
  console.log('\n--- STEP 3: TEST B - AQUASCAN HUMAN (WITHOUT REFRESH) ---');
  await client.eval(`window.location.hash = '#analyze'`);
  await new Promise(r => setTimeout(r, 800));

  // Select human target
  await client.eval(`
    const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
    const humanRadio = radios.find(r => r.value === 'human');
    if (humanRadio) { humanRadio.click(); humanRadio.dispatchEvent(new Event('change', { bubbles: true })); }
  `);

  const fileB = '/media/cherry/External Hardisk/ps 57/SIH26057/model2_experiments/datasets/aquascan_1k_clean/images/0002b00e-Screenshot_2025-08-10_23.00.36.png';
  const fileInputNodeB = await client.send('DOM.querySelector', {
    nodeId: (await client.send('DOM.getDocument')).root.nodeId,
    selector: 'input[type="file"]',
  });

  await client.send('DOM.setFileInputFiles', {
    nodeId: fileInputNodeB.nodeId,
    files: [fileB],
  });
  console.log('File B dispatched to file input.');
  await new Promise(r => setTimeout(r, 1500));

  await client.eval(`
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('EXECUTE LIVE ANALYSIS'));
    if (btn) btn.click();
  `);
  console.log('Clicked EXECUTE LIVE ANALYSIS for AquaScan. Waiting...');

  for (let i = 0; i < 30; i++) {
    const hash = await client.eval(`window.location.hash`);
    if (hash === '#workspace') break;
    await new Promise(r => setTimeout(r, 500));
  }
  await new Promise(r => setTimeout(r, 2500));

  const measurementsB = await client.eval(`
    (() => {
      const img = document.querySelector('img[alt="Sonar Acoustic Swath"]');
      const svg = document.querySelector('svg');
      const rect = svg ? svg.querySelector('rect') : null;
      const text = svg ? svg.querySelector('text') : null;
      const imgRect = img ? img.getBoundingClientRect() : null;
      const boxRect = rect ? rect.getBoundingClientRect() : null;

      return {
        hash: window.location.hash,
        img: img ? {
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          displayedWidth: imgRect.width,
          displayedHeight: imgRect.height,
        } : null,
        anomalyBox: boxRect ? {
          left: boxRect.left,
          top: boxRect.top,
          width: boxRect.width,
          height: boxRect.height,
        } : null,
        label: text ? text.textContent : null,
      };
    })()
  `);
  console.log('Test B Measurements:', JSON.stringify(measurementsB, null, 2));
  await client.screenshot('/tmp/verified_test_b_workspace.png');

  // TEST D: Blank Image
  console.log('\n--- STEP 4: TEST D - BLANK IMAGE (ZERO DETECTIONS) ---');
  await client.eval(`window.location.hash = '#analyze'`);
  await new Promise(r => setTimeout(r, 800));

  const fileD = '/home/cherry/Documents/workspace/mldashbordproject/frontend/public/blank_zero.png';
  const fileInputNodeD = await client.send('DOM.querySelector', {
    nodeId: (await client.send('DOM.getDocument')).root.nodeId,
    selector: 'input[type="file"]',
  });

  await client.send('DOM.setFileInputFiles', {
    nodeId: fileInputNodeD.nodeId,
    files: [fileD],
  });
  await new Promise(r => setTimeout(r, 1000));

  await client.eval(`
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('EXECUTE LIVE ANALYSIS'));
    if (btn) btn.click();
  `);

  for (let i = 0; i < 30; i++) {
    const hash = await client.eval(`window.location.hash`);
    if (hash === '#workspace') break;
    await new Promise(r => setTimeout(r, 500));
  }
  await new Promise(r => setTimeout(r, 2000));

  const measurementsD = await client.eval(`
    (() => {
      const svg = document.querySelector('svg');
      const rects = svg ? svg.querySelectorAll('rect') : [];
      const badge = document.querySelector('.badge-emerald, .badge-amber');
      return {
        rectCount: rects.length,
        badgeText: badge ? badge.textContent : null,
      };
    })()
  `);
  console.log('Test D Measurements (Blank image):', JSON.stringify(measurementsD, null, 2));
  await client.screenshot('/tmp/verified_test_d_blank.png');

  // TEST RELOAD: Test A reload persistence
  console.log('\n--- STEP 5: TEST RELOAD PERSISTENCE ---');
  // Switch back to Test A scan if available, or reload
  await client.eval(`
    const scans = JSON.parse(sessionStorage.getItem('aquasentinel_scans_v1') || '[]');
    console.log('Cached scans count in sessionStorage:', scans.length);
  `);

  await client.send('Page.reload');
  await new Promise(r => setTimeout(r, 2000));

  const reloadState = await client.eval(`
    (() => {
      const activeScanHeader = document.querySelector('.mono')?.textContent;
      const isLive = document.body.textContent.includes('LIVE INFERENCE');
      const hash = window.location.hash;
      return {
        hash,
        activeScanHeader,
        isLive,
      };
    })()
  `);
  console.log('Reload State:', JSON.stringify(reloadState, null, 2));

  console.log('\n--- ALL VERIFICATION PHASES COMPLETE ---');
  process.exit(0);
}

run().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
