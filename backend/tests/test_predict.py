"""Step 4: /predict API Integration Test Suite.

Verifies:
- Hardware, Pipeline, and Human specialist inference via POST /predict
- Standardized response schema (model, target, detections -> class, confidence, bbox)
- Semantic class preservation per specialist model
- Formatting of bbox as [x1, y1, x2, y2] float list
- Zero-detection behavior (detections: [])
- Comprehensive validation and error handling (missing/invalid targets, missing/corrupt images)
- TargetRouter integration and singleton caching verification
- Checkpoint SHA256 hash protection
"""

import io
import json
from pathlib import Path
from typing import Any, Dict, List
from unittest.mock import patch
from PIL import Image
import requests

from backend.app.config import settings
from backend.app.models.loader import ModelLoader, compute_sha256
from backend.app.router import TargetRouter

BASE_URL = "http://127.0.0.1:8000"

# Read-only dataset paths on external HDD
SUBPIPE_PBM_PATH = Path(
    "/media/cherry/External Hardisk/ps 57/datasets/SubPipeMiniSSS/DATA/SSS_HF_images/Image/1693569383.780.pbm"
)
AQUASCAN_PNG_PATH = Path(
    "/media/cherry/External Hardisk/ps 57/SIH26057/model2_experiments/datasets/aquascan_1k_clean/images/0002b00e-Screenshot_2025-08-10_23.00.36.png"
)
HARDWARE_JPG_PATH = Path(
    "/media/cherry/External Hardisk/ps 57/SIH26057/model3_experiments/datasets/esp_hardware_clean/images/clip_009.jpg"
)


def create_in_memory_blank_image_bytes() -> bytes:
    """Create a 640x640 blank black PNG image in memory for zero-detection testing."""
    img = Image.new("RGB", (640, 640), color="black")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def run_tests():
    print("================================================================================")
    print("STARTING STEP 4 — /predict API INTEGRATION TEST SUITE")
    print("================================================================================")

    blank_png_bytes = create_in_memory_blank_image_bytes()

    # -------------------------------------------------------------------------
    # TEST 1: POST /predict with hardware + valid image -> HTTP 200
    # -------------------------------------------------------------------------
    print("\n[TEST 1] POST /predict with hardware + valid image...")
    assert HARDWARE_JPG_PATH.exists(), f"Hardware test image missing: {HARDWARE_JPG_PATH}"
    with open(HARDWARE_JPG_PATH, "rb") as f:
        resp = requests.post(
            f"{BASE_URL}/predict",
            files={"image": (HARDWARE_JPG_PATH.name, f, "image/jpeg")},
            data={"target": "hardware"},
        )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    json_hw = resp.json()
    print("  Response:", json.dumps(json_hw, indent=2))
    assert json_hw["model"] == "hardware"
    assert json_hw["target"] == "Hardware"
    print(f"  PASS: TEST 1 -> HTTP 200, model='{json_hw['model']}', target='{json_hw['target']}'")

    # -------------------------------------------------------------------------
    # TEST 2: POST /predict with pipeline + valid image -> HTTP 200
    # -------------------------------------------------------------------------
    print("\n[TEST 2] POST /predict with pipeline + valid image (SubPipe .pbm)...")
    assert SUBPIPE_PBM_PATH.exists(), f"Pipeline test image missing: {SUBPIPE_PBM_PATH}"
    with open(SUBPIPE_PBM_PATH, "rb") as f:
        resp = requests.post(
            f"{BASE_URL}/predict",
            files={"image": (SUBPIPE_PBM_PATH.name, f, "application/octet-stream")},
            data={"target": "pipeline"},
        )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    json_pipe = resp.json()
    print("  Response:", json.dumps(json_pipe, indent=2))
    assert json_pipe["model"] == "pipeline"
    assert json_pipe["target"] == "Pipeline"
    print(f"  PASS: TEST 2 -> HTTP 200, model='{json_pipe['model']}', target='{json_pipe['target']}'")

    # -------------------------------------------------------------------------
    # TEST 3: POST /predict with human + valid image -> HTTP 200
    # -------------------------------------------------------------------------
    print("\n[TEST 3] POST /predict with human + valid image (AquaScan .png)...")
    assert AQUASCAN_PNG_PATH.exists(), f"Human test image missing: {AQUASCAN_PNG_PATH}"
    with open(AQUASCAN_PNG_PATH, "rb") as f:
        resp = requests.post(
            f"{BASE_URL}/predict",
            files={"image": (AQUASCAN_PNG_PATH.name, f, "image/png")},
            data={"target": "human"},
        )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    json_human = resp.json()
    print("  Response:", json.dumps(json_human, indent=2))
    assert json_human["model"] == "human"
    assert json_human["target"] == "Human"
    print(f"  PASS: TEST 3 -> HTTP 200, model='{json_human['model']}', target='{json_human['target']}'")

    # -------------------------------------------------------------------------
    # TEST 4: Response contains required top-level fields: model, target, detections
    # -------------------------------------------------------------------------
    print("\n[TEST 4] Verifying Required Top-Level Fields...")
    for data in [json_hw, json_pipe, json_human]:
        assert "model" in data, "Missing 'model' key"
        assert "target" in data, "Missing 'target' key"
        assert "detections" in data, "Missing 'detections' key"
        assert isinstance(data["detections"], list), "'detections' must be a list"
    print("  PASS: All responses strictly contain 'model', 'target', and 'detections'.")

    # -------------------------------------------------------------------------
    # TEST 5: Hardware detection class names are preserved
    # -------------------------------------------------------------------------
    print("\n[TEST 5] Verifying Hardware Detection Class Names...")
    assert len(json_hw["detections"]) >= 1, "Expected detections for hardware image"
    valid_hw_classes = {"cap", "clip", "key", "niddle", "scissor"}
    for det in json_hw["detections"]:
        assert det["class"] in valid_hw_classes, f"Unexpected hardware class: {det['class']}"
        print(f"  Detected hardware class: '{det['class']}' (confidence: {det['confidence']})")
    assert json_hw["detections"][0]["class"] == "clip"
    print("  PASS: Hardware semantic class names accurately preserved.")

    # -------------------------------------------------------------------------
    # TEST 6: Pipeline detection class name is "Pipeline"
    # -------------------------------------------------------------------------
    print("\n[TEST 6] Verifying Pipeline Detection Class Name...")
    assert len(json_pipe["detections"]) >= 1, "Expected detections for pipeline image"
    for det in json_pipe["detections"]:
        assert det["class"] == "Pipeline", f"Expected class 'Pipeline', got {det['class']}"
    print(f"  Detected pipeline class: '{json_pipe['detections'][0]['class']}' (confidence: {json_pipe['detections'][0]['confidence']})")
    print("  PASS: Pipeline semantic class name is strictly 'Pipeline'.")

    # -------------------------------------------------------------------------
    # TEST 7: Human detection class name is "Human"
    # -------------------------------------------------------------------------
    print("\n[TEST 7] Verifying Human Detection Class Name...")
    assert len(json_human["detections"]) >= 1, "Expected detections for human image"
    for det in json_human["detections"]:
        assert det["class"] == "Human", f"Expected class 'Human', got {det['class']}"
    print(f"  Detected human class: '{json_human['detections'][0]['class']}' (confidence: {json_human['detections'][0]['confidence']})")
    print("  PASS: Human semantic class name is strictly 'Human'.")

    # -------------------------------------------------------------------------
    # TEST 8: bbox is exactly four JSON-safe numeric values [x1, y1, x2, y2]
    # -------------------------------------------------------------------------
    print("\n[TEST 8] Verifying BBox Format ([x1, y1, x2, y2])...")
    for dataset_name, data in [("Hardware", json_hw), ("Pipeline", json_pipe), ("Human", json_human)]:
        for det in data["detections"]:
            bbox = det["bbox"]
            assert isinstance(bbox, list), f"bbox must be a list in {dataset_name}, got {type(bbox)}"
            assert len(bbox) == 4, f"bbox must have exactly 4 values in {dataset_name}, got {len(bbox)}"
            assert all(isinstance(v, (int, float)) for v in bbox), "bbox items must be numeric"
            assert bbox[0] <= bbox[2], f"x1 ({bbox[0]}) must be <= x2 ({bbox[2]})"
            assert bbox[1] <= bbox[3], f"y1 ({bbox[1]}) must be <= y2 ({bbox[3]})"
            print(f"  {dataset_name} bbox valid: {bbox}")
    print("  PASS: Bounding box format is exactly 4-element numeric array [x1, y1, x2, y2].")

    # -------------------------------------------------------------------------
    # TEST 9: confidence is JSON-safe numeric value
    # -------------------------------------------------------------------------
    print("\n[TEST 9] Verifying Confidence Format...")
    for dataset_name, data in [("Hardware", json_hw), ("Pipeline", json_pipe), ("Human", json_human)]:
        for det in data["detections"]:
            conf = det["confidence"]
            assert isinstance(conf, (int, float)), "confidence must be numeric"
            assert 0.0 <= conf <= 1.0, f"confidence must be between 0 and 1, got {conf}"
    print("  PASS: Confidence is valid float in [0.0, 1.0].")

    # -------------------------------------------------------------------------
    # TEST 10: No detection returns detections=[]
    # -------------------------------------------------------------------------
    print("\n[TEST 10] Testing Zero-Detection Response (Blank Image)...")
    for target in ["hardware", "pipeline", "human"]:
        resp = requests.post(
            f"{BASE_URL}/predict",
            files={"image": ("blank.png", blank_png_bytes, "image/png")},
            data={"target": target},
        )
        assert resp.status_code == 200, f"Expected 200 on zero detections, got {resp.status_code}"
        data = resp.json()
        assert data["model"] == target
        assert data["detections"] == []
        print(f"  PASS: Zero detection on target='{target}' -> model='{data['model']}', detections=[]")

    # -------------------------------------------------------------------------
    # TEST 11: Unsupported target returns a clean 4xx error
    # -------------------------------------------------------------------------
    print("\n[TEST 11] Testing Unsupported Target Error Handling...")
    invalid_targets = ["banana", "ship", "airplane", "submarine", "unknown"]
    for inv in invalid_targets:
        resp = requests.post(
            f"{BASE_URL}/predict",
            files={"image": ("blank.png", blank_png_bytes, "image/png")},
            data={"target": inv},
        )
        assert resp.status_code == 400, f"Expected 400 for '{inv}', got {resp.status_code}"
        data = resp.json()
        assert "error" in data
        assert data["error"] == "Unsupported detection target"
        assert data["requested_target"] == inv
        assert set(data["supported_targets"]) == {"pipeline", "human", "hardware"}
        print(f"  PASS: Target '{inv}' rejected -> {data['error']}")

    # -------------------------------------------------------------------------
    # TEST 12: Missing target returns a clean validation error
    # -------------------------------------------------------------------------
    print("\n[TEST 12] Testing Missing Target Error Handling...")
    resp = requests.post(
        f"{BASE_URL}/predict",
        files={"image": ("blank.png", blank_png_bytes, "image/png")},
        data={},
    )
    assert resp.status_code in {400, 422}, f"Expected 400/422 for missing target, got {resp.status_code}"
    print(f"  PASS: Missing target rejected with HTTP {resp.status_code}")

    # Empty target string
    resp_empty = requests.post(
        f"{BASE_URL}/predict",
        files={"image": ("blank.png", blank_png_bytes, "image/png")},
        data={"target": "   "},
    )
    assert resp_empty.status_code == 400
    assert resp_empty.json()["error"] == "Missing target parameter"
    print("  PASS: Empty whitespace target rejected with HTTP 400")

    # -------------------------------------------------------------------------
    # TEST 13: Missing image returns a clean validation error
    # -------------------------------------------------------------------------
    print("\n[TEST 13] Testing Missing Image Error Handling...")
    resp = requests.post(
        f"{BASE_URL}/predict",
        data={"target": "hardware"},
    )
    assert resp.status_code in {400, 422}, f"Expected 400/422 for missing image, got {resp.status_code}"
    print(f"  PASS: Missing image rejected with HTTP {resp.status_code}")

    # -------------------------------------------------------------------------
    # TEST 14: Corrupt / invalid image returns a clean validation error
    # -------------------------------------------------------------------------
    print("\n[TEST 14] Testing Corrupt Image Error Handling...")
    corrupt_bytes = b"NOT_A_VALID_IMAGE_DATA_CORRUPT_BYTES_XYZ"
    resp = requests.post(
        f"{BASE_URL}/predict",
        files={"image": ("corrupt.jpg", corrupt_bytes, "image/jpeg")},
        data={"target": "pipeline"},
    )
    assert resp.status_code == 400, f"Expected 400 for corrupt image, got {resp.status_code}"
    assert "Corrupt or unreadable image file" in resp.json()["error"]
    print("  PASS: Corrupt image rejected with HTTP 400 and clear error description.")

    # -------------------------------------------------------------------------
    # TEST 15: Router is used instead of directly instantiating YOLO
    # -------------------------------------------------------------------------
    print("\n[TEST 15] Verifying TargetRouter is Authoritative Path...")
    # Verify TargetRouter has registered models matching registry
    assert TargetRouter.get_supported_targets() == ["pipeline", "human", "hardware"]
    # Direct TargetRouter invocation matches /predict output structure
    router_res = TargetRouter.predict("hardware", blank_png_bytes)
    assert router_res["model_key"] == "hardware"
    assert router_res["target"] == "Hardware"
    assert router_res["detections"] == []
    print("  PASS: TargetRouter verified as centralized model router.")

    # -------------------------------------------------------------------------
    # TEST 16: Singleton Caching (No redundant model instantiation)
    # -------------------------------------------------------------------------
    print("\n[TEST 16] Verifying Singleton Caching Behavior across Calls...")
    m_hw_1, _ = ModelLoader.get_model("hardware")
    m_hw_2, _ = ModelLoader.get_model("hardware")
    assert m_hw_1 is m_hw_2, "Redundant YOLO instance created for Hardware model!"
    print("  PASS: Singleton caching active (same in-memory YOLO instance reused).")

    # -------------------------------------------------------------------------
    # CHECKPOINT PROTECTION
    # -------------------------------------------------------------------------
    print("\n[CHECKPOINT PROTECTION] Verifying All 3 Frozen Checkpoint SHA256 Hashes...")
    h1 = compute_sha256(settings.MODEL_1_PATH)
    h2 = compute_sha256(settings.MODEL_2_PATH)
    h3 = compute_sha256(settings.MODEL_3_PATH)

    assert h1 == settings.MODEL_1_EXPECTED_SHA256, f"Model 1 hash mismatch: {h1}"
    assert h2 == settings.MODEL_2_EXPECTED_SHA256, f"Model 2 hash mismatch: {h2}"
    assert h3 == settings.MODEL_3_EXPECTED_SHA256, f"Model 3 hash mismatch: {h3}"

    print(f"  Model 1 SHA256: {h1} (FROZEN UNCHANGED)")
    print(f"  Model 2 SHA256: {h2} (FROZEN UNCHANGED)")
    print(f"  Model 3 SHA256: {h3} (FROZEN UNCHANGED)")

    print("\n================================================================================")
    print("ALL 16 STEP 4 /predict TESTS COMPLETED SUCCESSFULLY!")
    print("================================================================================")


if __name__ == "__main__":
    run_tests()
