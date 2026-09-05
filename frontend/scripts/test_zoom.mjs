import fs from 'fs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function testZoomAndInspect() {
  console.log('=== TESTING ZOOM AND INTERACTION IN DETECTION WORKSPACE ===');

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

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pendingRequests.has(msg.id)) {
      const { resolve, reject } = pendingRequests.get(msg.id);
      pendingRequests.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };

  await new Promise((resolve) => { ws.onopen = resolve; });

  // Currently we should be on #/detections with Test B or Test A.
  // Let's check what scan is currently loaded:
  const currentScan = await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      const select = document.querySelector('header select');
      return select ? select.value : 'NO_SELECT';
    })()`,
    returnByValue: true,
  });
  console.log('Currently active scan in DOM:', currentScan.result.value);

  // Switch to SCAN_PIPELINE if not already
  await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      const select = document.querySelector('header select');
      if (select) {
        const pipeOpt = Array.from(select.options).find(o => o.value.includes('PIPELINE'));
        if (pipeOpt) {
          select.value = pipeOpt.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    })()`,
  });
  await sleep(1000);

  // Take screenshot: initial fit
  const ssFit = await sendCommand('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('/tmp/zoom_1_fit.png', Buffer.from(ssFit.data, 'base64'));
  console.log('Saved /tmp/zoom_1_fit.png');

  // Now click Zoom In 3 times
  for (let i = 1; i <= 3; i++) {
    await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        const zoomInBtn = Array.from(document.querySelectorAll('button')).find(b => b.title && b.title.includes('Zoom In'));
        if (zoomInBtn) zoomInBtn.click();
      })()`,
    });
    await sleep(400);

    const zoomState = await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        const vp = document.querySelector('.sonar-grid-bg')?.parentElement;
        const cc = vp ? vp.querySelector('div[style*="transform"]') : null;
        const rect = document.querySelector('svg rect[stroke="#00f2fe"]');
        const b = rect ? rect.getBoundingClientRect() : null;
        const vpB = vp ? vp.getBoundingClientRect() : null;
        return {
          zoomText: document.querySelector('.app-content .mono')?.innerText,
          transform: cc ? cc.style.transform : null,
          boxOnScreen: b ? { left: Math.round(b.left), right: Math.round(b.right), top: Math.round(b.top), width: Math.round(b.width), height: Math.round(b.height) } : null,
          viewportRect: vpB ? { left: Math.round(vpB.left), right: Math.round(vpB.right), width: Math.round(vpB.width) } : null,
          isBoxInsideViewport: (b && vpB) ? (b.left >= vpB.left && b.right <= vpB.right) : false,
        };
      })()`,
      returnByValue: true,
    });
    console.log(`Zoom In #${i} State:`, JSON.stringify(zoomState.result.value, null, 2));

    const ssZoom = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`/tmp/zoom_${i + 1}.png`, Buffer.from(ssZoom.data, 'base64'));
  }

  // Now test clicking "Reset View"
  await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      const resetBtn = Array.from(document.querySelectorAll('button')).find(b => b.title && b.title.includes('Reset View'));
      if (resetBtn) resetBtn.click();
    })()`,
  });
  await sleep(500);

  const resetState = await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      const vp = document.querySelector('.sonar-grid-bg')?.parentElement;
      const cc = vp ? vp.querySelector('div[style*="transform"]') : null;
      const rect = document.querySelector('svg rect[stroke="#00f2fe"]');
      const b = rect ? rect.getBoundingClientRect() : null;
      const vpB = vp ? vp.getBoundingClientRect() : null;
      return {
        transform: cc ? cc.style.transform : null,
        boxOnScreen: b ? { left: Math.round(b.left), right: Math.round(b.right), width: Math.round(b.width) } : null,
        viewportRect: vpB ? { left: Math.round(vpB.left), right: Math.round(vpB.right), width: Math.round(vpB.width) } : null,
        isBoxInsideViewport: (b && vpB) ? (b.left >= vpB.left && b.right <= vpB.right) : false,
      };
    })()`,
    returnByValue: true,
  });
  console.log('Reset View State:', JSON.stringify(resetState.result.value, null, 2));

  const ssReset = await sendCommand('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('/tmp/zoom_reset.png', Buffer.from(ssReset.data, 'base64'));
  console.log('Saved /tmp/zoom_reset.png');

  ws.close();
}

testZoomAndInspect().catch(console.error);
