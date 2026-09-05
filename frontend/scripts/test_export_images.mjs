import fs from 'fs';

// Since we have headless Chrome running with CDP, we can have the browser execute the EXACT downloadAnnotatedImage code or canvas drawing and return the base64 PNG data directly!
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function exportAndSavePngs() {
  console.log('=== TESTING ACTUAL ANNOTATED PNG EXPORT VIA CDP ===');

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

  // 1. In browser, invoke generateAnnotatedImageBlob for active scan (Test A or Test B)
  // Let's inspect the active scan and invoke export
  const exportResult = await sendCommand('Runtime.evaluate', {
    expression: `(async () => {
      // Find the active scan from context or window
      // In DetectionWorkspacePage, we can trigger the download button or evaluate downloadAnnotatedImage
      // But let's trigger the download button and intercept URL.createObjectURL!
      window.__exportedBlobs = [];
      const origCreateObjectURL = URL.createObjectURL;
      URL.createObjectURL = (blob) => {
        const url = origCreateObjectURL(blob);
        window.__exportedBlobs.push({ url, blob, size: blob.size, type: blob.type });
        return url;
      };

      const exportBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Download Annotated PNG'));
      if (exportBtn) {
        exportBtn.click();
        // Wait for export to complete
        await new Promise(r => setTimeout(r, 2000));
        
        if (window.__exportedBlobs.length > 0) {
          const item = window.__exportedBlobs[window.__exportedBlobs.length - 1];
          // Convert blob to base64
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve({
                success: true,
                size: item.size,
                type: item.type,
                base64: reader.result,
              });
            };
            reader.readAsDataURL(item.blob);
          });
        }
      }
      return { success: false, error: 'No export button or blob created' };
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });

  console.log('Export Result for current active scan:', {
    success: exportResult.result.value?.success,
    size: exportResult.result.value?.size,
    type: exportResult.result.value?.type,
  });

  if (exportResult.result.value?.base64) {
    const base64Data = exportResult.result.value.base64.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync('/tmp/exported_annotated_active.png', Buffer.from(base64Data, 'base64'));
    console.log('Saved exported annotated PNG to: /tmp/exported_annotated_active.png (bytes:', base64Data.length, ')');
  }

  ws.close();
}

exportAndSavePngs().catch(console.error);
