import io
import json
import sys
import requests
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.app.config import settings
from backend.app.models.loader import compute_sha256

BASE_URL = "http://127.0.0.1:8000"

# Repository-local sample image paths
SAMPLE_DATA_DIR = REPO_ROOT / "frontend" / "sample_data"
SUBPIPE_PBM_PATH = SAMPLE_DATA_DIR / "1693569383.780.pbm"
SUBPIPE_BPM_PATH = SAMPLE_DATA_DIR / "1693569385.780.pbm"
AQUASCAN_PNG_PATH = SAMPLE_DATA_DIR / "0a2be3cd-Screenshot_2025-08-03_14.26.49.png"
GHOSTVISION_JPG_PATH = SAMPLE_DATA_DIR / "cap_001.jpg"


def run_tests():
    print("==================================================")
    print("RUNNING PHASE 4 PATCH (.PBM / .BPM) TEST SUITE")
    print("==================================================")

    # A. Valid .pbm SubPipe image -> HTTP 200
    print("\n[TEST A] Valid .pbm SubPipe HF image (target=pipeline)...")
    assert SUBPIPE_PBM_PATH.exists(), f"File missing: {SUBPIPE_PBM_PATH}"
    with open(SUBPIPE_PBM_PATH, "rb") as f:
        files = {"file": (SUBPIPE_PBM_PATH.name, f, "application/octet-stream")}
        data = {"target": "pipeline"}
        resp = requests.post(f"{BASE_URL}/predict", files=files, data=data)

    print(f"  HTTP Status: {resp.status_code}")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    json_a = resp.json()
    print("  Response:", json.dumps(json_a, indent=2))
    assert json_a["model"] == "pipeline"
    assert json_a["target"] == "Pipeline"
    assert len(json_a["detections"]) >= 1
    assert json_a["detections"][0]["class"] == "Pipeline"
    print(f"  PASS: TEST A succeeded. Detections count: {len(json_a['detections'])}")

    # B. Valid .bpm SubPipe image -> HTTP 200
    print("\n[TEST B] Valid .bpm SubPipe image (target=pipeline)...")
    assert SUBPIPE_BPM_PATH.exists(), f"File missing: {SUBPIPE_BPM_PATH}"
    with open(SUBPIPE_BPM_PATH, "rb") as f:
        files = {"file": (SUBPIPE_BPM_PATH.name, f, "application/octet-stream")}
        data = {"target": "pipeline"}
        resp = requests.post(f"{BASE_URL}/predict", files=files, data=data)

    print(f"  HTTP Status: {resp.status_code}")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    json_b = resp.json()
    print("  Response:", json.dumps(json_b, indent=2))
    assert json_b["model"] == "pipeline"
    assert json_b["target"] == "Pipeline"
    assert json_b["detections"] == []
    print("  PASS: TEST B succeeded. Zero detections correctly returned as []")

    # C. Existing .png -> HTTP 200
    print("\n[TEST C] Existing .png image (target=human)...")
    assert AQUASCAN_PNG_PATH.exists(), f"File missing: {AQUASCAN_PNG_PATH}"
    with open(AQUASCAN_PNG_PATH, "rb") as f:
        files = {"file": (AQUASCAN_PNG_PATH.name, f, "image/png")}
        data = {"target": "human"}
        resp = requests.post(f"{BASE_URL}/predict", files=files, data=data)

    print(f"  HTTP Status: {resp.status_code}")
    assert resp.status_code == 200
    json_c = resp.json()
    assert json_c["model"] == "human"
    assert json_c["target"] == "Human"
    print(f"  PASS: TEST C succeeded. Detections: {len(json_c['detections'])}")

    # D. Existing .jpg -> HTTP 200
    print("\n[TEST D] Existing .jpg image (target=pipeline)...")
    assert GHOSTVISION_JPG_PATH.exists(), f"File missing: {GHOSTVISION_JPG_PATH}"
    with open(GHOSTVISION_JPG_PATH, "rb") as f:
        files = {"file": (GHOSTVISION_JPG_PATH.name, f, "image/jpeg")}
        data = {"target": "pipeline"}
        resp = requests.post(f"{BASE_URL}/predict", files=files, data=data)

    print(f"  HTTP Status: {resp.status_code}")
    assert resp.status_code == 200
    json_d = resp.json()
    assert json_d["model"] == "pipeline"
    assert json_d["target"] == "Pipeline"
    print(f"  PASS: TEST D succeeded. Detections: {len(json_d['detections'])}")

    # E. Corrupt .pbm -> HTTP 400
    print("\n[TEST E] Corrupt .pbm image...")
    corrupt_pbm_bytes = io.BytesIO(b"P6\nCorrupted header and junk data 99999")
    files = {"file": ("corrupt_sonar.pbm", corrupt_pbm_bytes, "application/octet-stream")}
    data = {"target": "pipeline"}
    resp = requests.post(f"{BASE_URL}/predict", files=files, data=data)
    print(f"  HTTP Status: {resp.status_code}")
    assert resp.status_code == 400
    print("  PASS: TEST E correctly returned HTTP 400.")

    # F. Unsupported extension -> HTTP 400
    print("\n[TEST F] Unsupported extension (.gif / .xyz)...")
    fake_bytes = io.BytesIO(b"GIF89a sample image")
    files = {"file": ("unsupported_sonar.xyz", fake_bytes, "application/octet-stream")}
    data = {"target": "pipeline"}
    resp = requests.post(f"{BASE_URL}/predict", files=files, data=data)
    print(f"  HTTP Status: {resp.status_code}")
    assert resp.status_code == 400
    assert resp.json()["error"] == "Unsupported image format"
    print("  PASS: TEST F correctly rejected unsupported extension with HTTP 400.")

    # G. Invalid target -> HTTP 400
    print("\n[TEST G] Invalid target ('submarine')...")
    with open(SUBPIPE_PBM_PATH, "rb") as f:
        files = {"file": (SUBPIPE_PBM_PATH.name, f, "application/octet-stream")}
        data = {"target": "submarine"}
        resp = requests.post(f"{BASE_URL}/predict", files=files, data=data)
    print(f"  HTTP Status: {resp.status_code}")
    assert resp.status_code == 400
    assert resp.json()["error"] == "Unsupported detection target"
    print("  PASS: TEST G correctly rejected invalid target with HTTP 400.")

    # H. Valid .pbm with target=pipeline routes to Model 1
    print("\n[TEST H] Valid .pbm with target=pipeline -> Model 1...")
    with open(SUBPIPE_PBM_PATH, "rb") as f:
        files = {"file": (SUBPIPE_PBM_PATH.name, f, "application/octet-stream")}
        data = {"target": "pipeline"}
        resp = requests.post(f"{BASE_URL}/predict", files=files, data=data)
    assert resp.status_code == 200
    assert resp.json()["model"] == "pipeline"
    assert resp.json()["target"] == "Pipeline"
    assert resp.json()["detections"][0]["class"] == "Pipeline"
    print("  PASS: TEST H confirmed routing to Model 1 (Pipeline).")

    # I. Valid .pbm with target=human routes to Model 2
    print("\n[TEST I] Valid .pbm with target=human -> Model 2...")
    with open(SUBPIPE_PBM_PATH, "rb") as f:
        files = {"file": (SUBPIPE_PBM_PATH.name, f, "application/octet-stream")}
        data = {"target": "human"}
        resp = requests.post(f"{BASE_URL}/predict", files=files, data=data)
    assert resp.status_code == 200
    assert resp.json()["model"] == "human"
    assert resp.json()["target"] == "Human"
    print("  PASS: TEST I confirmed routing to Model 2 (Human).")

    # J. Frozen Checkpoint Hashes Check
    print("\n[TEST J] Verifying Model Checkpoint Hashes...")
    h1 = compute_sha256(settings.MODEL_1_PATH)
    h2 = compute_sha256(settings.MODEL_2_PATH)
    h3 = compute_sha256(settings.MODEL_3_PATH)
    assert h1 == settings.MODEL_1_EXPECTED_SHA256, f"Model 1 hash mismatch: {h1}"
    assert h2 == settings.MODEL_2_EXPECTED_SHA256, f"Model 2 hash mismatch: {h2}"
    assert h3 == settings.MODEL_3_EXPECTED_SHA256, f"Model 3 hash mismatch: {h3}"
    print(f"  Model 1 SHA256: {h1} (MATCH)")
    print(f"  Model 2 SHA256: {h2} (MATCH)")
    print(f"  Model 3 SHA256: {h3} (MATCH)")
    print("  PASS: Frozen checkpoint hashes verified.")

    print("\n==================================================")
    print("ALL PHASE 4 PATCH TESTS COMPLETED SUCCESSFULLY!")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
