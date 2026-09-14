import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SAMPLE_DATA_DIR = path.resolve(__dirname, '../sample_data');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function forensicAudit() {
  console.log('=== STARTING DEEP FORENSIC INVESTIGATION OF REAL BROWSER ===');

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

  console.log('Enabling Page, DOM, Runtime, Network domains...');
  await sendCommand('Page.enable');
  await sendCommand('DOM.enable');
  await sendCommand('Runtime.enable');
  await sendCommand('Network.enable');

  // Set standard desktop viewport
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

  // Take screenshot 1: Dashboard
  const ss1 = await sendCommand('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('/tmp/forensic_1_dashboard.png', Buffer.from(ss1.data, 'base64'));
  console.log('Saved screenshot 1: /tmp/forensic_1_dashboard.png');

  // Navigate to Analyze page
  console.log('Navigating to Analyze Page...');
  await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.getElementById('nav-analyze');
      if (btn) btn.click();
      else window.location.hash = '#/analyze';
    })()`,
  });
  await sleep(1500);

  // =========================================================================
  // TEST A: SubPipe 1693569383.780.pbm (Pipeline Specialist)
  // =========================================================================
  const testAFile = path.join(SAMPLE_DATA_DIR, '1693569383.780.pbm');
  console.log('\n============================================================');
  console.log('FORENSIC TEST A: Ingesting SubPipe', testAFile);
  console.log('============================================================');

  // Select Pipeline button
  await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.getElementById('target-pipeline-btn');
      if (btn) btn.click();
    })()`,
  });
  await sleep(500);

  // Inject file into #sonar-file-input
  const doc = await sendCommand('DOM.getDocument', { depth: -1 });
  const fileInput = await sendCommand('DOM.querySelector', {
    nodeId: doc.root.nodeId,
    selector: '#sonar-file-input',
  });
  if (!fileInput.nodeId) throw new Error('Could not find #sonar-file-input in DOM');

  console.log('Setting file input to:', testAFile);
  await sendCommand('DOM.setFileInputFiles', {
    files: [testAFile],
    nodeId: fileInput.nodeId,
  });

  // Wait for client-side preview generation
  console.log('Waiting for client-side image preview decode...');
  await sleep(3000);

  // Inspect the Dropzone preview state before clicking analyze
  const dropzonePreview = await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      const img = document.querySelector('.glass-panel-elevated img');
      const infoCard = document.querySelector('.glass-panel-elevated');
      return {
        hasInfoCard: !!infoCard,
        infoText: infoCard ? infoCard.innerText : null,
        imgSrcType: img ? (img.src.startsWith('data:') ? 'data_url (length: ' + img.src.length + ')' : img.src.slice(0, 50)) : 'NO_IMG',
        naturalWidth: img ? img.naturalWidth : null,
        naturalHeight: img ? img.naturalHeight : null,
        displayWidth: img ? img.clientWidth : null,
        displayHeight: img ? img.clientHeight : null,
        complete: img ? img.complete : null,
      };
    })()`,
    returnByValue: true,
  });
  console.log('Dropzone Preview State:\n', JSON.stringify(dropzonePreview.result.value, null, 2));

  // Take screenshot 2: Dropzone Ready
  const ss2 = await sendCommand('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('/tmp/forensic_2_dropzone_ready.png', Buffer.from(ss2.data, 'base64'));
  console.log('Saved screenshot 2: /tmp/forensic_2_dropzone_ready.png');

  // Trigger Execute Real Analysis
  console.log('Clicking Execute Real Analysis (/analyze)...');
  await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.getElementById('execute-analysis-button');
      if (btn) btn.click();
    })()`,
  });

  // Wait for network response and navigation
  console.log('Waiting for /analyze network call and navigation...');
  await sleep(4500);

  // Take screenshot 3: Detection Workspace View
  const ss3 = await sendCommand('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('/tmp/forensic_3_workspace_full.png', Buffer.from(ss3.data, 'base64'));
  console.log('Saved screenshot 3: /tmp/forensic_3_workspace_full.png');

  // Now perform comprehensive DOM & SVG inspection of Detection Workspace
  const workspaceInspection = await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      const hash = window.location.hash;
      const viewportContainer = document.querySelector('.glass-panel div[onmousedown]') || document.querySelector('.sonar-grid-bg')?.parentElement;
      const canvasContainer = viewportContainer ? viewportContainer.querySelector('div[style*="transform"]') : null;
      const img = canvasContainer ? canvasContainer.querySelector('img') : document.querySelector('img[alt="Side-Scan Sonar Scan"]');
      const svg = canvasContainer ? canvasContainer.querySelector('svg') : document.querySelector('.glass-panel svg[viewBox]');
      
      // All rects in SVG
      const rects = svg ? Array.from(svg.querySelectorAll('rect')).map((r, i) => {
        const b = r.getBoundingClientRect();
        return {
          index: i,
          xAttr: r.getAttribute('x'),
          yAttr: r.getAttribute('y'),
          wAttr: r.getAttribute('width'),
          hAttr: r.getAttribute('height'),
          stroke: r.getAttribute('stroke'),
          strokeWidth: r.getAttribute('stroke-width'),
          fill: r.getAttribute('fill'),
          rx: r.getAttribute('rx'),
          filter: r.getAttribute('filter'),
          onScreenRect: {
            left: Math.round(b.left * 10) / 10,
            top: Math.round(b.top * 10) / 10,
            width: Math.round(b.width * 10) / 10,
            height: Math.round(b.height * 10) / 10,
          },
          computedStyle: {
            display: window.getComputedStyle(r).display,
            visibility: window.getComputedStyle(r).visibility,
            opacity: window.getComputedStyle(r).opacity,
          }
        };
      }) : [];

      // All texts in SVG
      const texts = svg ? Array.from(svg.querySelectorAll('text')).map(t => {
        const b = t.getBoundingClientRect();
        return {
          content: t.textContent,
          x: t.getAttribute('x'),
          y: t.getAttribute('y'),
          fontSize: t.getAttribute('font-size'),
          fill: t.getAttribute('fill'),
          onScreenRect: {
            left: Math.round(b.left),
            top: Math.round(b.top),
            width: Math.round(b.width),
            height: Math.round(b.height),
          }
        };
      }) : [];

      // Circles (corner markers)
      const circles = svg ? Array.from(svg.querySelectorAll('circle')).map(c => ({
        cx: c.getAttribute('cx'),
        cy: c.getAttribute('cy'),
        r: c.getAttribute('r'),
        fill: c.getAttribute('fill'),
      })) : [];

      // Viewport & Canvas container layout
      const vpRect = viewportContainer ? viewportContainer.getBoundingClientRect() : null;
      const ccRect = canvasContainer ? canvasContainer.getBoundingClientRect() : null;
      const imgRect = img ? img.getBoundingClientRect() : null;
      const svgRect = svg ? svg.getBoundingClientRect() : null;

      // Badges
      const badges = Array.from(document.querySelectorAll('.badge')).map(b => b.innerText.trim());

      // Detail Panel content
      const detailCard = document.querySelector('.glass-panel-elevated');
      const detailText = detailCard ? detailCard.innerText : 'NO_DETAIL_CARD';

      // Table content
      const tableRows = Array.from(document.querySelectorAll('table tbody tr')).map(tr => tr.innerText.replace(/\\s+/g, ' ').trim());

      return {
        hash,
        viewportContainer: vpRect ? {
          clientWidth: viewportContainer.clientWidth,
          clientHeight: viewportContainer.clientHeight,
          rect: { left: vpRect.left, top: vpRect.top, width: vpRect.width, height: vpRect.height },
          overflow: window.getComputedStyle(viewportContainer).overflow,
        } : null,
        canvasContainer: ccRect ? {
          styleTransform: canvasContainer.style.transform,
          styleTransformOrigin: canvasContainer.style.transformOrigin,
          styleWidth: canvasContainer.style.width,
          styleHeight: canvasContainer.style.height,
          rect: { left: ccRect.left, top: ccRect.top, width: ccRect.width, height: ccRect.height },
        } : null,
        img: img ? {
          srcType: img.src.startsWith('data:') ? 'data_url (length: ' + img.src.length + ')' : img.src.slice(0, 60),
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          displayWidth: img.clientWidth,
          displayHeight: img.clientHeight,
          complete: img.complete,
          currentSrcLength: img.currentSrc ? img.currentSrc.length : 0,
          rect: { left: imgRect.left, top: imgRect.top, width: imgRect.width, height: imgRect.height },
          computedDisplay: window.getComputedStyle(img).display,
          computedVisibility: window.getComputedStyle(img).visibility,
          computedOpacity: window.getComputedStyle(img).opacity,
          computedZIndex: window.getComputedStyle(img).zIndex,
        } : 'NO_IMG_IN_VIEWPORT',
        svg: svg ? {
          viewBox: svg.getAttribute('viewBox'),
          rect: { left: svgRect.left, top: svgRect.top, width: svgRect.width, height: svgRect.height },
          computedDisplay: window.getComputedStyle(svg).display,
          computedVisibility: window.getComputedStyle(svg).visibility,
          computedOpacity: window.getComputedStyle(svg).opacity,
          computedZIndex: window.getComputedStyle(svg).zIndex,
          computedPointerEvents: window.getComputedStyle(svg).pointerEvents,
        } : 'NO_SVG_IN_VIEWPORT',
        rects,
        texts,
        circleCount: circles.length,
        badges,
        tableRows,
        detailTextSnippet: detailText.slice(0, 500),
      };
    })()`,
    returnByValue: true,
  });

  console.log('\n--- DETAILED WORKSPACE INSPECTION DATA ---');
  console.log(JSON.stringify(workspaceInspection.result.value, null, 2));

  // Also crop and save screenshot of just the viewport
  const vpBox = workspaceInspection.result.value.viewportContainer;
  if (vpBox) {
    const ssVp = await sendCommand('Page.captureScreenshot', {
      format: 'png',
      clip: {
        x: vpBox.rect.left,
        y: vpBox.rect.top,
        width: vpBox.rect.width,
        height: vpBox.rect.height,
        scale: 1,
      },
    });
    fs.writeFileSync('/tmp/forensic_4_viewport_only.png', Buffer.from(ssVp.data, 'base64'));
    console.log('Saved screenshot 4 (viewport only): /tmp/forensic_4_viewport_only.png');
  }

  // Check network request/response details for /analyze
  console.log('\n--- NETWORK TRACE (/analyze) ---');
  const analyzeReq = networkRequests.find(r => r.url.includes('/analyze'));
  const analyzeResp = networkResponses.find(r => r.url.includes('/analyze'));
  console.log('Request Method:', analyzeReq?.method);
  console.log('Request URL:', analyzeReq?.url);
  console.log('Response Status:', analyzeResp?.status);
  console.log('Response Headers:', analyzeResp?.headers);

  // Close connection
  ws.close();
  console.log('\n=== FORENSIC RUN 1 FINISHED ===');
}

forensicAudit().catch(err => {
  console.error('Forensic audit error:', err);
  process.exit(1);
});
