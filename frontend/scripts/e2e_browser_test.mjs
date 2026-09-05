import fs from 'fs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runE2ETests() {
  console.log('================================================================');
  console.log('STARTING PHASE 8.2 FRONTEND END-TO-END BROWSER VALIDATION');
  console.log('================================================================');

  // Check Chrome CDP endpoint
  let pageTarget = null;
  try {
    const listRes = await fetch('http://127.0.0.1:9222/json/list');
    const targets = await listRes.json();
    pageTarget = targets.find((t) => t.type === 'page');
  } catch (e) {
    console.error('Failed to query Chrome on port 9222:', e.message);
    process.exit(1);
  }

  if (!pageTarget) {
    console.log('Creating new page target on Chrome...');
    const newTargetRes = await fetch('http://127.0.0.1:9222/json/new?http://127.0.0.1:5173');
    pageTarget = await newTargetRes.json();
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

  const browserLogs = [];

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pendingRequests.has(msg.id)) {
      const { resolve, reject } = pendingRequests.get(msg.id);
      pendingRequests.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      const text = msg.params.args.map((a) => a.value || JSON.stringify(a)).join(' ');
      browserLogs.push(text);
      if (text.includes('Real Backend Analysis Success') || text.includes('error')) {
        console.log('[BROWSER LOG]:', text);
      }
    }
  };

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  console.log('WebSocket connected. Enabling CDP domains...');
  await sendCommand('Page.enable');
  await sendCommand('DOM.enable');
  console.log('Domains enabled.');

  // Navigate to root
  console.log('Navigating to http://127.0.0.1:5173...');
  await sendCommand('Page.navigate', { url: 'http://127.0.0.1:5173' });
  await sleep(3000);

  // Check initial Topbar telemetry
  const topbarInfo = await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      const badges = Array.from(document.querySelectorAll('.app-topbar .glass-panel, .app-topbar .badge'));
      const text = document.querySelector('.app-topbar')?.innerText || '';
      return {
        topbarText: text,
        hasBackendOnline: text.includes('BACKEND ONLINE'),
        hasEngineBadge: text.includes('ENGINE:'),
      };
    })()`,
    returnByValue: true,
  });
  console.log('\n[TOPBAR TELEMETRY CHECK]:');
  console.log('  Backend Online:', topbarInfo.result.value.hasBackendOnline ? 'PASS' : 'FAIL');
  console.log('  Engine Telemetry:', topbarInfo.result.value.hasEngineBadge ? 'PASS' : 'FAIL');

  const testResults = [];

  /**
   * Helper to execute scan ingestion and inference
   */
  async function runScanWorkflow(testNum, testTitle, filePath, target, expectedClass, minExpectedConf, maxExpectedConf, expectedDetections) {
    console.log(`\n============================================================`);
    console.log(`TEST ${testNum}: ${testTitle}`);
    console.log(`File: ${filePath}`);
    console.log(`Specialist Target: ${target}`);
    console.log(`============================================================`);

    // 1. Navigate to analyze tab WITHOUT refreshing browser
    await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        const navBtn = document.getElementById('nav-analyze');
        if (navBtn) navBtn.click();
        else window.location.hash = '#/analyze';
      })()`,
    });
    await sleep(1500);

    // 2. Select target specialist
    const targetBtnId = target === 'pipeline' ? 'target-pipeline-btn' : 'target-human-btn';
    await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.getElementById('${targetBtnId}');
        if (btn) btn.click();
      })()`,
    });
    await sleep(500);

    // 3. Inject file into file input
    const doc = await sendCommand('DOM.getDocument', { depth: -1 });
    const fileInput = await sendCommand('DOM.querySelector', {
      nodeId: doc.root.nodeId,
      selector: '#sonar-file-input',
    });

    if (!fileInput.nodeId) {
      throw new Error(`File input node not found for Test ${testNum}`);
    }

    console.log(`Setting file via CDP: ${filePath}`);
    await sendCommand('DOM.setFileInputFiles', {
      files: [filePath],
      nodeId: fileInput.nodeId,
    });

    // Wait for client-side preview decode
    console.log('Waiting for client-side preview generation...');
    await sleep(2500);

    // 4. Click 'Execute Real Analysis (/analyze)'
    console.log('Triggering Execute Real Analysis (/analyze)...');
    await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        const runBtn = document.getElementById('execute-analysis-button') ||
          Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Execute Real Analysis'));
        if (runBtn) runBtn.click();
      })()`,
    });

    // Wait for FastAPI inference & auto-navigation
    console.log('Waiting for backend response & auto-navigation to Detection Workspace...');
    await sleep(4000);

    // 5. Inspect Detection Workspace state
    const inspection = await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        const hash = window.location.hash;
        
        // Check badges in detail panel
        const detailPanel = document.querySelector('.glass-panel-elevated') || document.body;
        const allBadges = Array.from(document.querySelectorAll('.badge')).map(b => b.innerText.trim());
        const isLiveBadgePresent = allBadges.includes('LIVE YOLO DETECTION');
        const isDemoBadgePresent = allBadges.includes('DEMO DETECTION');
        
        // Filter panel stats
        const filterCards = Array.from(document.querySelectorAll('.glass-panel div'));
        const visibleDetDiv = filterCards.find(d => d.innerText.includes('VISIBLE DETECTIONS'));
        const rawCandDiv = filterCards.find(d => d.innerText.includes('RAW CANDIDATES'));
        const filteredOutDiv = filterCards.find(d => d.innerText.includes('FILTERED OUT'));
        
        // Detection Table rows
        const tableRows = Array.from(document.querySelectorAll('table tbody tr')).map(tr => tr.innerText.trim());
        
        // SVG Bounding Boxes in viewport
        const svgs = Array.from(document.querySelectorAll('svg'));
        const viewportSvg = svgs.find(s => s.getAttribute('viewBox') && s.getAttribute('viewBox') !== '0 0 24 24');
        let rectData = [];
        let labelTexts = [];
        let svgViewBox = null;
        
        if (viewportSvg) {
          svgViewBox = viewportSvg.getAttribute('viewBox');
          const groups = Array.from(viewportSvg.querySelectorAll('g'));
          
          // Find detection rects
          const rects = Array.from(viewportSvg.querySelectorAll('rect'));
          rectData = rects.map(r => {
            const domRect = r.getBoundingClientRect();
            return {
              x: parseFloat(r.getAttribute('x')),
              y: parseFloat(r.getAttribute('y')),
              width: parseFloat(r.getAttribute('width')),
              height: parseFloat(r.getAttribute('height')),
              stroke: r.getAttribute('stroke'),
              strokeWidth: r.getAttribute('stroke-width'),
              onScreenRect: {
                width: Math.round(domRect.width * 10) / 10,
                height: Math.round(domRect.height * 10) / 10,
                top: Math.round(domRect.top),
                left: Math.round(domRect.left),
              }
            };
          }).filter(r => !isNaN(r.x) && !isNaN(r.width) && r.width > 0);
          
          const texts = Array.from(viewportSvg.querySelectorAll('text'));
          labelTexts = texts.map(t => t.textContent.trim());
        }
        
        // Read active scan info from Topbar / header
        const activeSelect = document.querySelector('header select');
        const activeScanValue = activeSelect ? activeSelect.value : null;

        // Detail panel text snippet
        const detailText = document.querySelector('.glass-panel-elevated')?.innerText || '';

        return {
          hash,
          activeScanValue,
          isLiveBadgePresent,
          isDemoBadgePresent,
          svgViewBox,
          rectData,
          labelTexts,
          tableRows,
          detailTextSnippet: detailText.slice(0, 400),
          allBadges,
        };
      })()`,
      returnByValue: true,
    });

    const val = inspection.result.value;
    console.log(`Results for Test ${testNum}:`);
    console.log(`  Current Route Hash: ${val.hash}`);
    console.log(`  Active Scan ID: ${val.activeScanValue}`);
    console.log(`  LIVE YOLO DETECTION Badge: ${val.isLiveBadgePresent ? 'YES (CORRECT)' : 'NO'}`);
    console.log(`  Misleading DEMO DETECTION Badge: ${val.isDemoBadgePresent ? 'STILL PRESENT (ERROR)' : 'NONE (CORRECT)'}`);
    console.log(`  SVG ViewBox: ${val.svgViewBox}`);
    console.log(`  SVG Bounding Boxes Count: ${val.rectData.length}`);
    if (val.rectData.length > 0) {
      val.rectData.forEach((r, idx) => {
        console.log(`    Box #${idx + 1}: native [x=${r.x}, y=${r.y}, w=${r.width}, h=${r.height}]`);
        console.log(`             stroke: ${r.stroke}, stroke-width: ${r.strokeWidth}`);
        console.log(`             on-screen DOM rendered size: ${r.onScreenRect.width}px × ${r.onScreenRect.height}px`);
      });
    }
    console.log(`  SVG Labels:`, val.labelTexts);
    console.log(`  Table Rows:`, val.tableRows);

    // Acceptance checks
    let pass = true;
    const errors = [];

    if (expectedDetections > 0) {
      if (val.rectData.length === 0) {
        pass = false;
        errors.push(`Expected >= 1 bounding box in SVG, but found 0`);
      } else {
        // Check on-screen visibility (user criterion: visual alignment at fit-to-screen without extreme zoom)
        const primaryBox = val.rectData[0];
        if (primaryBox.onScreenRect.width < 5 || primaryBox.onScreenRect.height < 3) {
          pass = false;
          errors.push(`Bounding box is too small on-screen: ${primaryBox.onScreenRect.width}x${primaryBox.onScreenRect.height}`);
        }
      }

      if (!val.isLiveBadgePresent) {
        pass = false;
        errors.push('LIVE YOLO DETECTION badge missing');
      }

      if (val.isDemoBadgePresent) {
        pass = false;
        errors.push('Misleading DEMO DETECTION badge still present');
      }

      if (val.labelTexts.length > 0) {
        const foundExpected = val.labelTexts.some(txt => txt.toUpperCase().includes(expectedClass.toUpperCase()));
        if (!foundExpected) {
          pass = false;
          errors.push(`Expected label containing "${expectedClass}", got: ${val.labelTexts.join(', ')}`);
        }
      }
    } else {
      // Expected zero detections
      if (val.rectData.length > 0) {
        pass = false;
        errors.push(`Expected 0 bounding boxes, but found ${val.rectData.length}`);
      }
    }

    testResults.push({
      testNum,
      testTitle,
      pass,
      errors,
      details: val,
    });

    console.log(`TEST ${testNum} RESULT: ${pass ? '>>> PASS <<<' : '>>> FAIL <<< ' + errors.join('; ')}`);
    return pass;
  }

  // TEST 1: SubPipe PBM (Pipeline Specialist)
  await runScanWorkflow(
    1,
    'SubPipe 1693569383.780.pbm (Pipeline Specialist)',
    '/media/cherry/External Hardisk/ps 57/datasets/SubPipeMiniSSS/DATA/SSS_HF_images/Image/1693569383.780.pbm',
    'pipeline',
    'Pipeline',
    0.70,
    0.90,
    1
  );

  // TEST 2: AquaScan PNG (Human Specialist) - WITHOUT REFRESHING THE BROWSER
  console.log('\n>>> SWITCHING TO TEST 2 DIRECTLY WITHOUT PAGE REFRESH <<<');
  await runScanWorkflow(
    2,
    'AquaScan 0002b00e-Screenshot_2025-08-10_23.00.36.png (Human Specialist)',
    '/media/cherry/External Hardisk/ps 57/SIH26057/model2_experiments/datasets/aquascan_1k_clean/images/0002b00e-Screenshot_2025-08-10_23.00.36.png',
    'human',
    'Human',
    0.50,
    0.75,
    1
  );

  // TEST 3: BPM (Pipeline Specialist)
  await runScanWorkflow(
    3,
    'SubPipe 1693569573.819.bpm (Pipeline Specialist)',
    '/media/cherry/External Hardisk/ps 57/datasets/SubPipeMiniSSS/DATA/SSS_HF_images/Image/1693569573.819.bpm',
    'pipeline',
    'Pipeline',
    0.75,
    0.90,
    1
  );

  // TEST 4: Blank (Pipeline Specialist) -> Expected 0 detections
  await runScanWorkflow(
    4,
    'Blank blank_zero.png (Pipeline Specialist)',
    '/home/cherry/Documents/workspace/mldashbordproject/frontend/public/blank_zero.png',
    'pipeline',
    'None',
    0,
    0,
    0
  );

  // 5. Check Dashboard Session Stats
  console.log('\n============================================================');
  console.log('CHECKING DASHBOARD SESSION LIVE SCANS KPI');
  console.log('============================================================');
  await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      const navBtn = document.getElementById('nav-dashboard');
      if (navBtn) navBtn.click();
      else window.location.hash = '#/dashboard';
    })()`,
  });
  await sleep(1500);

  const dashboardStats = await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      const statCards = Array.from(document.querySelectorAll('.glass-panel')).map(c => c.innerText);
      const sessionCard = statCards.find(c => c.toUpperCase().includes('SESSION LIVE SCANS') || c.toUpperCase().includes('SCANS ANALYZED'));
      return {
        sessionCardText: sessionCard || 'NOT FOUND',
        allCards: statCards.slice(0, 5),
      };
    })()`,
    returnByValue: true,
  });

  console.log('Dashboard Session KPI:', dashboardStats.result.value.sessionCardText);

  // Summary
  console.log('\n================================================================');
  console.log('E2E TEST SUMMARY REPORT:');
  console.log('================================================================');
  let allPass = true;
  testResults.forEach(r => {
    console.log(`Test ${r.testNum} [${r.testTitle}]: ${r.pass ? 'PASS' : 'FAIL - ' + r.errors.join(', ')}`);
    if (!r.pass) allPass = false;
  });

  ws.close();
  console.log(`\nOVERALL STATUS: ${allPass ? 'ALL 4 TESTS PASSED (100%)' : 'SOME TESTS FAILED'}`);
  process.exit(allPass ? 0 : 1);
}

runE2ETests().catch(err => {
  console.error('Fatal E2E test execution error:', err);
  process.exit(1);
});
