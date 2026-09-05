"""Integration and API verification test suite for /predict endpoint."""

import io
import json
import requests
from pathlib import Path

from backend.app.config import settings
from backend.app.models.loader import compute_sha256

BASE_URL = "http://127.0.0.1:8000"

# Real sonar test image paths on external HDD (read-only)
PIPELINE_IMAGE_PATH = Path(
    "/media/cherry/External Hardisk/ps 57/SIH26057/training_data/subpipe_yolo_temporal_v1_png/images/test/ACQ_000857_HF.png"
)
HUMAN_IMAGE_PATH = Path(
    "/media/cherry/External Hardisk/ps 57/SIH26057/model2_experiments/datasets/aquascan_1k_clean/images/0002b00e-Screenshot_2025-08-10_23.00.36.png"
)


def run_tests():
    print("==================================================")
    print("RUNNING /predict INTEGRATION TEST SUITE")
    print("==================================================")

    # 1. TEST A: Pipeline target with real Pipeline sonar image
    print("\n[TEST A] Testing target='pipeline' with real Pipeline sonar image...")
    assert PIPELINE_IMAGE_PATH.exists(), f"Missing test image: {PIPELINE_IMAGE_PATH}"
    with open(PIPELINE_IMAGE_PATH, "rb") as f:
        files = {"file": ("ACQ_000857_HF.png", f, "image/png")}
        data = {"target": "pipeline"}
        response = requests.post(f"{BASE_URL}/predict", files=files, data=data)

    print(f"  HTTP Status: {response.status_code}")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    res_a = response.json()
    print("  Response:", json.dumps(res_a, indent=2))
    assert res_a["success"] is True
    assert res_a["target"] == "pipeline"
    assert res_a["model"]["id"] == "model1"
    assert res_a["model"]["class_name"] == "Pipeline"
    assert "detections" in res_a
    assert "inference" in res_a
    print(f"  PASS: TEST A succeeded. Detections count: {res_a['detection_count']}")

    # 2. TEST B: Human target with real Human sonar image
    print("\n[TEST B] Testing target='human' with real Human sonar image...")
    assert HUMAN_IMAGE_PATH.exists(), f"Missing test image: {HUMAN_IMAGE_PATH}"
    with open(HUMAN_IMAGE_PATH, "rb") as f:
        files = {"file": ("0002b00e-Screenshot_2025-08-10_23.00.36.png", f, "image/png")}
        data = {"target": "human"}
        response = requests.post(f"{BASE_URL}/predict", files=files, data=data)

    print(f"  HTTP Status: {response.status_code}")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    res_b = response.json()
    print("  Response:", json.dumps(res_b, indent=2))
    assert res_b["success"] is True
    assert res_b["target"] == "human"
    assert res_b["model"]["id"] == "model2"
    assert res_b["model"]["class_name"] == "Human"
    assert "detections" in res_b
    assert "inference" in res_b
    print(f"  PASS: TEST B succeeded. Detections count: {res_b['detection_count']}")

    # 3. TEST C: Invalid target (e.g. 'ship') -> HTTP 400
    print("\n[TEST C] Testing target='ship' (unsupported target)...")
    with open(PIPELINE_IMAGE_PATH, "rb") as f:
        files = {"file": ("ACQ_000857_HF.png", f, "image/png")}
        data = {"target": "ship"}
        response = requests.post(f"{BASE_URL}/predict", files=files, data=data)

    print(f"  HTTP Status: {response.status_code}")
    assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
    res_c = response.json()
    print("  Response:", json.dumps(res_c, indent=2))
    assert res_c["error"] == "Unsupported detection target"
    assert res_c["requested_target"] == "ship"
    print("  PASS: TEST C rejected invalid target with HTTP 400.")

    # 4. TEST D: Unsupported / corrupt image file -> HTTP 400
    print("\n[TEST D] Testing corrupt / unsupported image file...")
    fake_corrupt_bytes = io.BytesIO(b"not an image text content 1234567890")
    files = {"file": ("corrupt.png", fake_corrupt_bytes, "image/png")}
    data = {"target": "pipeline"}
    response = requests.post(f"{BASE_URL}/predict", files=files, data=data)

    print(f"  HTTP Status: {response.status_code}")
    assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
    res_d = response.json()
    print("  Response:", json.dumps(res_d, indent=2))
    print("  PASS: TEST D rejected corrupt file with HTTP 400.")

    # 5. TEST E: Model SHA256 integrity check
    print("\n[TEST E] Verifying Model Checkpoint SHA256 Hashes...")
    h1 = compute_sha256(settings.MODEL_1_PATH)
    h2 = compute_sha256(settings.MODEL_2_PATH)
    assert h1 == settings.MODEL_1_EXPECTED_SHA256, f"Model 1 hash mismatch: {h1}"
    assert h2 == settings.MODEL_2_EXPECTED_SHA256, f"Model 2 hash mismatch: {h2}"
    print(f"  Model 1 SHA256: {h1} (MATCH)")
    print(f"  Model 2 SHA256: {h2} (MATCH)")
    print("  PASS: Frozen checkpoint hashes verified.")

    print("\n==================================================")
    print("ALL /predict INTEGRATION TESTS COMPLETED SUCCESSFULLY!")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
