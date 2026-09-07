# SIH 2026 — AquaSentinel AI Sonar ML Dashboard

**AI-Powered Automated Underwater Marine Debris and Anomaly Detection System using Side-Scan Sonar Imagery** (Problem Statement: SIH26057)

---

## Project Structure

```
mldashbordproject/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py               # FastAPI entry point
│   │   ├── config.py             # App configurations & checkpoint paths
│   │   ├── router.py             # Target-aware specialist router ('pipeline' / 'human')
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── loader.py         # YOLOv8 checkpoint loader (cuda/cpu)
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── health.py         # GET /health
│   │   │   ├── predict.py        # POST /predict (bounding-box detection)
│   │   │   ├── analyze.py        # POST /analyze (detection + metadata analysis)
│   │   │   └── segment.py        # POST /segment (conditional no-fake-masks endpoint)
│   │   └── services/
│   │       ├── __init__.py
│   │       └── inference.py      # Sonar Netpbm (.pbm/.bpm) & raster preprocessing
│   ├── tests/
│   │   ├── test_analyze.py
│   │   ├── test_api_phase7.py    # Comprehensive Phase 7 integration test suite
│   │   ├── test_predict.py
│   │   ├── test_predict_patch.py
│   │   ├── test_router.py
│   │   └── test_segment.py
│   └── requirements.txt
├── frontend/
│   ├── src/                      # React 19 + TypeScript + Vanilla CSS Dashboard
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

---

## Frozen ML Models (External HDD)
- **Model 1 (Pipeline Specialist)**: YOLOv8n trained on SubPipeMiniSSS  
  `/media/cherry/External Hardisk/ps 57/SIH26057/training_runs/yolov8n_v1_full/weights/best.pt`
- **Model 2 (Human Specialist)**: YOLOv8n trained on AquaScan-1K  
  `/media/cherry/External Hardisk/ps 57/SIH26057/model2_experiments/training_runs/aquascan_human_model2_v1/weights/best.pt`

---

## Quick Start Guide

### 1. Running the Frontend Dashboard

From the root project directory:

```bash
cd frontend
npm run dev
```

The frontend dashboard will be available at:
- **Dashboard URL**: [http://127.0.0.1:5173/](http://127.0.0.1:5173/)

To build the production bundle:
```bash
cd frontend
npm run build
```

---

### 2. Running the Backend API & Swagger UI

Run the FastAPI Uvicorn server using the ML Python environment on the external drive (which contains PyTorch, CUDA, and Ultralytics):

**Option A (Direct - Recommended):**
```bash
"/media/cherry/External Hardisk/py notebook/xai_env/bin/python" -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

**Option B (Export PATH):**
```bash
export PATH="/media/cherry/External Hardisk/py notebook/xai_env/bin:$PATH"
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

> **Note on `source .../activate`:** The `activate` script in the external HDD folder has an internal hardcoded path pointing to a different environment that lacks `ultralytics`. Use Option A or Option B above to ensure the correct Python binary is invoked.

Once running, access the interactive API documentation:
- **Interactive Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Alternative ReDoc UI**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **Health Check Endpoint**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

### 3. Running Backend Tests

With the FastAPI server running on `http://127.0.0.1:8000`:

```bash
"/media/cherry/External Hardisk/py notebook/xai_env/bin/python" -m backend.tests.test_api_phase7
```

---

### 4. Stopping / Killing All Running Terminals & Servers

To immediately kill and terminate all running frontend and backend development servers (releasing ports `8000` and `5173`):

**Recommended One-Liner:**
```bash
fuser -k 8000/tcp 5173/tcp
```

**Alternative (kill by process name):**
```bash
pkill -f "uvicorn" ; pkill -f "vite"
```

**Force Kill All (if processes are hanging):**
```bash
kill -9 $(lsof -t -i:8000 -i:5173 2>/dev/null) 2>/dev/null || pkill -9 -f "uvicorn|vite"
```

