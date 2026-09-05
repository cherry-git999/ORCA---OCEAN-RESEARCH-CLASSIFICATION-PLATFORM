"""Comprehensive test suite for Phase 4 Patch (.pbm / .bpm format support)."""

import io
import json
import requests
from pathlib import Path

from backend.app.config import settings
from backend.app.models.loader import compute_sha256

BASE_URL = "http://127.0.0.1:8000"

# Original read-only dataset paths on external HDD
SUBPIPE_PBM_PATH = Path(
    "/media/cherry/External Hardisk/ps 57/datasets/SubPipeMiniSSS/DATA/SSS_HF_images/Image/1693569383.780.pbm"
)
SUBPIPE_BPM_PATH = Path(
    "/media/cherry/External Hardisk/ps 57/datasets/SubPipeMiniSSS/DATA/SSS_HF_images/Image/1693569280.759.bpm"
)
AQUASCAN_PNG_PATH = Path(
    "/media/cherry/External Hardisk/ps 57/SIH26057/model2_experiments/datasets/aquascan_1k_clean/images/0002b00e-Screenshot_2025-08-10_23.00.36.png"
)
GHOSTVISION_JPG_PATH = Path(
    "/media/cherry/External Hardisk/ps 57/datasets/01_ghostvision/test/baycove_07_06_png_jpg.rf.5a2e74f04f707fe66f050a3b61fcd7c2.jpg"
)


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
    assert json_a["success"] is True
    assert json_a["target"] == "pipeline"
    assert json_a["model"]["id"] == "model1"
    assert json_a["model"]["class_name"] == "Pipeline"
    assert json_a["image"]["width"] == 5000
    assert json_a["image"]["height"] == 500
    print(f"  PASS: TEST A succeeded. Image dimensions: {json_a['image']['width']}x{json_a['image']['height']}, Detections: {json_a['detection_count']}")

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
    assert json_b["success"] is True
    assert json_b["target"] == "pipeline"
    assert json_b["model"]["id"] == "model1"
    assert json_b["image"]["width"] == 5000
    assert json_b["image"]["height"] == 500
    print(f"  PASS: TEST B succeeded. Image dimensions: {json_b['image']['width']}x{json_b['image']['height']}, Detections: {json_b['detection_count']}")

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
    assert json_c["success"] is True
    assert json_c["target"] == "human"
    assert json_c["model"]["id"] == "model2"
    print(f"  PASS: TEST C succeeded. Detections: {json_c['detection_count']}")

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
    assert json_d["success"] is True
    print(f"  PASS: TEST D succeeded. Detections: {json_d['detection_count']}")

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
    assert resp.json()["model"]["id"] == "model1"
    assert resp.json()["model"]["class_name"] == "Pipeline"
    print("  PASS: TEST H confirmed routing to Model 1 (Pipeline).")

    # I. Valid .pbm with target=human routes to Model 2
    print("\n[TEST I] Valid .pbm with target=human -> Model 2...")
    with open(SUBPIPE_PBM_PATH, "rb") as f:
        files = {"file": (SUBPIPE_PBM_PATH.name, f, "application/octet-stream")}
        data = {"target": "human"}
        resp = requests.post(f"{BASE_URL}/predict", files=files, data=data)
    assert resp.status_code == 200
    assert resp.json()["model"]["id"] == "model2"
    assert resp.json()["model"]["class_name"] == "Human"
    print("  PASS: TEST I confirmed routing to Model 2 (Human).")

    # J. Frozen Checkpoint Hashes Check
    print("\n[TEST J] Verifying Model Checkpoint Hashes...")
    h1 = compute_sha256(settings.MODEL_1_PATH)
    h2 = compute_sha256(settings.MODEL_2_PATH)
    assert h1 == settings.MODEL_1_EXPECTED_SHA256, f"Model 1 hash mismatch: {h1}"
    assert h2 == settings.MODEL_2_EXPECTED_SHA256, f"Model 2 hash mismatch: {h2}"
    print(f"  Model 1 SHA256: {h1} (MATCH)")
    print(f"  Model 2 SHA256: {h2} (MATCH)")
    print("  PASS: Frozen checkpoint hashes verified.")

    print("\n==================================================")
    print("ALL PHASE 4 PATCH TESTS COMPLETED SUCCESSFULLY!")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
