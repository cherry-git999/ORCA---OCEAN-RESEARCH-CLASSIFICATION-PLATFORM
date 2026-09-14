# ORCA — Quick Start Guide

A practical, step-by-step evaluation guide for judges, reviewers, and engineers to launch, test, and verify the **ORCA Multimodal Underwater Intelligence Platform** on a clean clone.

---

## 1. Prerequisites

Ensure your host system meets the following minimal requirements:
- **Operating System**: Linux (Ubuntu 20.04/22.04/24.04 recommended), macOS, or Windows (WSL2 recommended).
- **Python**: Version **3.10** or **3.12** (64-bit).
- **Node.js**: Version **18.x** or higher with `npm`.
- **Memory**: 4 GB RAM minimum (8 GB recommended).
- **Disk Space**: ~2 GB free disk space (excluding system tools).
- **GPU (Optional)**: NVIDIA GPU with CUDA 11.8/12.1+ drivers for hardware-accelerated deep learning. CPU execution is fully supported out of the box.

---

## 2. Clone the Repository

Clone the project to your local directory:

```bash
git clone <repository-url>
cd mldashbordproject
```

Verify that you are in the project root:
```bash
ls -F
# Expected output: backend/ frontend/ models/ scratch/ verify_installation.py README.md HOWTORUN.md
```

---

## 3. Creating & Managing the Python Virtual Environment (.venv)

A Python virtual environment (`.venv`) is an isolated execution directory containing its own Python interpreter, its own pip installer, and an independent `site-packages` directory. It guarantees that the ORCA backend dependencies do not interfere with or depend upon your operating system's global Python packages.

### Step 3.1: Create the Virtual Environment
From the repository root (`mldashbordproject/`), run:

```bash
# On Ubuntu / Debian / Linux:
# (If venv module is not pre-installed: sudo apt install python3-venv)
python3 -m venv .venv
```

This creates a local `.venv/` directory structured as:
- `.venv/bin/python`: Isolated Python executable
- `.venv/bin/pip`: Isolated package installer
- `.venv/lib/python3.x/site-packages/`: Isolated repository for installed packages

### Step 3.2: Activate the Virtual Environment
Activate the environment so your current shell session redirects `python` and `pip` commands to `.venv`:

```bash
# On Linux / macOS (bash or zsh):
source .venv/bin/activate

# On Windows (Command Prompt):
# .venv\Scripts\activate.bat

# On Windows (PowerShell):
# .venv\Scripts\Activate.ps1
```

### Step 3.3: Verify Environment Activation
After activation, your terminal prompt will be prefixed with `(.venv)`. Verify that the shell is using the virtual environment interpreter:

```bash
which python
# Output should point strictly to your workspace:
# /.../mldashbordproject/.venv/bin/python

python --version
# Output: Python 3.10.x or Python 3.12.x
```

---

## 4. Install Backend Dependencies & Libraries in .venv

The ORCA backend is powered by a high-performance machine learning and asynchronous REST microservice stack. All required libraries match the verified configuration of the team's development environment (`xai_env` on external HDD).

### Required Libraries in .venv (Inventory & Roles)

The table below details every library that must reside in your `.venv`, its operational role in ORCA, and its verified version:

| Package | Role in ORCA Platform | Verified Version (Team HDD Environment) |
| :--- | :--- | :--- |
| `fastapi` | High-throughput asynchronous REST API microservice framework | `0.141.1` (or `>=0.110.0`) |
| `uvicorn[standard]` | ASGI web server handling HTTP requests and WebSocket streams | `0.52.4` (or `>=0.29.0`) |
| `pydantic` | Strict request/response schema validation and telemetry serialization | `2.13.5` (or `>=2.0.0`) |
| `python-multipart` | Binary multipart form-data parser for image and sonar uploads | `0.0.12` (or `>=0.0.9`) |
| `torch` | PyTorch deep learning tensor runtime executing YOLO neural networks | `2.14.0+cu130` (or `>=2.0.0`) |
| `torchvision` | Computer vision transformations and tensor operations | `0.29.0+cu130` (or `>=0.15.0`) |
| `ultralytics` | Official YOLOv8 architecture running our 3 frozen specialist models | `8.4.138` (or `>=8.1.0`) |
| `opencv-python-headless` | Image decoding, color variance, and edge gradient calculation | `5.0.0` (or `>=4.8.0`) |
| `pillow` | Binary Netpbm side-scan sonar waterfall parser (`.pbm`, `.bpm`, `.png`) | `12.2.0` (or `>=10.0.0`) |
| `scikit-learn` | Multinomial Logistic Regression model for 17-feature domain routing | `1.9.0` (or `>=1.4.0`) |
| `joblib` | High-speed serializer for loading pre-trained router artifacts | `1.5.3` (or `>=1.3.0`) |
| `numpy` | High-dimensional array computations for visual invariant vectors | `2.5.2` (or `>=1.24.0`) |

### Step 4.1: Install Dependencies via Pip

With `(.venv)` active, upgrade `pip` and install the complete dependency manifest:

```bash
# Upgrade pip to latest
pip install --upgrade pip

# Option A: Standard Installation (CPU-Compatible / Auto-Detect)
pip install -r backend/requirements.txt
```

### Step 4.2: GPU Acceleration (Optional)
If you have an NVIDIA GPU and wish to accelerate YOLO inference with CUDA, install the PyTorch build tailored to your CUDA driver version:

```bash
# Example for CUDA 12.1+:
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121

# Example for CUDA 11.8:
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```
*(Note: If an NVIDIA GPU is not present or CUDA is not installed, PyTorch seamlessly runs on CPU with zero configuration changes).*

### Step 4.3: Verify Installed Libraries in .venv
Confirm that all core packages can be imported without errors:

```bash
python -c "import fastapi, uvicorn, pydantic, torch, torchvision, ultralytics, cv2, PIL, sklearn, joblib, numpy; print('✓ ALL ORCA BACKEND LIBRARIES VERIFIED IN .VENV!')"
```

---

## 5. Install Frontend Dependencies

In a separate step or terminal, install the frontend packages:

```bash
cd frontend
npm install
cd ..
```

---

## 6. Run the Verification Smoke Test

Before starting the web services, run the standalone verification script to ensure that all models, SHA256 hashes, router weights, and sample data are intact:

```bash
python verify_installation.py
```

Expected output:
```
========================================================================
      ORCA — REPOSITORY INTEGRITY & INSTALLATION SMOKE TEST             
========================================================================
  [PASS] Models directory exists
  [PASS] Model 1 — Pipeline Specialist SHA256 verified
  [PASS] Model 2 — Human Specialist SHA256 verified
  [PASS] Model 3 — Hardware Specialist SHA256 verified
  [PASS] Router config readable & valid
  [PASS] Sample images present (10 canonical images)
  [PASS] Core package imports available
========================================================================
  RESULT: ALL 28/28 CHECKS PASSED — REPOSITORY READY FOR JUDGING!
========================================================================
```

---

## 7. Start the Backend Server

Launch the FastAPI backend server:

```bash
# Ensure your virtual environment is active
source .venv/bin/activate

# Start Uvicorn
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

The backend server is now running at:
- **API Base URL**: `http://127.0.0.1:8000`
- **Interactive OpenAPI Documentation (Swagger UI)**: `http://127.0.0.1:8000/docs`
- **Health Check**: `http://127.0.0.1:8000/health`

---

## 8. Start the Frontend Application

Open a **new terminal window**, navigate to the project directory, and launch the Vite development server:

```bash
cd mldashbordproject/frontend
npm run dev
```

The frontend development server is now running at:
- **Dashboard URL**: `http://127.0.0.1:5173`

---

## 9. Open the Dashboard in Your Browser

Open your browser and navigate to:
```
http://127.0.0.1:5173
```

You will be greeted by the **ORCA Command Dashboard**, displaying:
- Operational telemetry KPI cards
- Active Specialist Model status badges (Pipeline, Human, Hardware)
- System health indicators

---

## 10. Test Automatic Domain Routing (/predict-auto)

Test ORCA's automatic routing using the included sample images:

1. In the sidebar, click **Detection Workspace** (`#/analyze`).
2. Drag and drop any sample image from `frontend/sample_data/`:
   - **Pipeline Sonar Sample**: `frontend/sample_data/1693569383.780.pbm`
   - **Human Diver Sample**: `frontend/sample_data/0a2be3cd-Screenshot_2025-08-03_14.26.49.png`
   - **Hardware Sample**: `frontend/sample_data/cap_001.jpg`
3. Notice the **Auto-Routing Modal** appear:
   - The router extracts 17 visual invariant features.
   - It displays class probability bars (`pipeline`, `human`, `hardware`).
   - For valid samples, it confirms domain confidence (**>97%**) and automatically selects the specialist model.
4. Click **Proceed to Detection** to inspect the detected bounding boxes, confidence scores, and coordinate logs.

### Testing Degeneracy Abstention
Try dropping an uninformative or blank black frame:
- The router triggers the **UNCERTAIN State** (`reason: "degenerate_image"` or `confidence < 0.85`).
- It safely abstains from executing specialist models and presents a manual selection override.

---

## 11. Test Manual Specialist Routing (/predict)

You can also bypass automatic routing and query specialists directly via API or UI:

### Using cURL for Manual Pipeline Inference:
```bash
curl -X POST "http://127.0.0.1:8000/predict" \
  -F "image=@frontend/sample_data/1693569383.780.pbm" \
  -F "target=pipeline"
```
Response:
```json
{
  "model": "pipeline",
  "target": "Pipeline",
  "detections": [
    {
      "class": "Pipeline",
      "confidence": 0.7863,
      "bbox": [3631.51, 0.0, 4019.45, 246.82]
    }
  ]
}
```

### Using cURL for Automatic Inference:
```bash
curl -X POST "http://127.0.0.1:8000/predict-auto" \
  -F "file=@frontend/sample_data/cap_001.jpg"
```
Response:
```json
{
  "routing": {
    "status": "routed",
    "model": "hardware",
    "target": "Hardware",
    "confidence": 0.9979
  },
  "detections": [
    {
      "class": "cap",
      "confidence": 0.4658,
      "bbox": [132.8, 106.72, 586.75, 509.17]
    }
  ]
}
```

---

## 12. Run the Backend Automated Test Suite

With your virtual environment active, run the regression tests:

```bash
python backend/tests/test_model_registry.py
python backend/tests/test_model_loader.py
python backend/tests/test_router.py
python backend/tests/test_predict_auto.py
```

All tests will run against repository-local models and sample data with 0 external dataset dependencies.

---

## 13. Troubleshooting

### Port 8000 or 5173 is Already in Use
- **Backend**: You can run Uvicorn on another port:
  ```bash
  python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8080
  ```
  If changing the backend port, update `frontend/.env` with `VITE_API_BASE_URL=http://127.0.0.1:8080`.
- **Frontend**: Vite automatically offers the next free port (e.g. 5174) if 5173 is occupied.

### ModuleNotFoundError: No module named 'backend'
Ensure you run test scripts from the repository root, or that your `PYTHONPATH` includes the repository root:
```bash
export PYTHONPATH=.
```

### Model Checkpoint Hash Mismatch
Run `python verify_installation.py` to diagnose which file is modified. Checkpoints in `models/` must match their exact SHA256 checksums documented in the Model Integrity table.

---

## 14. Hardware Integration Notes

ORCA's **Hardware Ingestion Page** (`#/hardware`) connects to edge camera units or laptop ingestion servers:
- **Default Endpoint**: `http://localhost:5000` (configurable via `VITE_HARDWARE_API_URL` in `frontend/.env`).
- When an edge device posts a captured frame to the hardware endpoint, ORCA automatically surfaces the incoming capture card and offers one-click pipeline evaluation.

---

## 15. Development Environment Used by the ORCA Team

> [!NOTE]
> **Information for Evaluators**:  
> During active research and training for SIH 2026, the ORCA development team utilized a dedicated, pre-warmed virtual environment stored on an external SSD/HDD:
> `"/media/cherry/External Hardisk/py notebook/xai_env/bin/python"`
>
> **Judges and external users DO NOT need this external drive.**  
> The repository has been made fully portable: creating a standard `.venv` and installing `backend/requirements.txt` provides an identical runtime execution environment.
