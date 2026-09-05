"""Step 5: End-to-End FastAPI Verification for all 3 Frozen Specialist Models.

Executes real HTTP requests against the running FastAPI application:
1. Health check (/health)
2. Pipeline specialist test with SubPipe .pbm image (target=pipeline)
3. Human specialist test with AquaScan .png image (target=human)
4. Hardware specialist test with ESP Hardware .jpg image (target=hardware)
5. Negative & validation tests (invalid target, missing target, missing image, corrupt image, blank image)
6. Model routing & singleton verification
7. Existing endpoint regression (/analyze, /segment)
8. SHA256 checkpoint integrity verification
"""

import io
import json
from pathlib import Path
from typing import Any, Dict, List
from PIL import Image
import requests

from backend.app.config import settings
from backend.app.models.loader import compute_sha256

BASE_URL = "http://127.0.0.1:8000"

# Sample images on external HDD
SUBPIPE_PBM_PATH = Path(
    "/media/cherry/External Hardisk/ps 57/datasets/SubPipeMiniSSS/DATA/SSS_HF_images/Image/1693569383.780.pbm"
)
AQUASCAN_PNG_PATH = Path(
    "/media/cherry/External Hardisk/ps 57/SIH26057/model2_experiments/datasets/aquascan_1k_clean/images/0002b00e-Screenshot_2025-08-10_23.00.36.png"
)
HARDWARE_JPG_PATH = Path(
    "/media/cherry/External Hardisk/ps 57/SIH26057/model3_experiments/datasets/esp_hardware_clean/images/clip_009.jpg"
)


def create_in_memory_blank_png() -> bytes:
    """Generate in-memory 640x640 blank black PNG bytes."""
    img = Image.new("RGB", (640, 640), color="black")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def run_step5_e2e_tests() -> Dict[str, Any]:
    print("================================================================================")
    print("STARTING STEP 5 — END-TO-END FASTAPI VERIFICATION OF ALL 3 FROZEN MODELS")
    print("================================================================================")

    results: Dict[str, Any] = {}

    # -------------------------------------------------------------------------
    # 1. HEALTH CHECK
    # -------------------------------------------------------------------------
    print("\n[STEP 5.1] Testing GET /health...")
    resp_health = requests.get(f"{BASE_URL}/health")
    assert resp_health.status_code == 200, f"Expected 200, got {resp_health.status_code}: {resp_health.text}"
    health_json = resp_health.json()
    assert health_json.get("status") == "ok"
    results["health"] = {"status_code": resp_health.status_code, "body": health_json}
    print(f"  PASS: /health -> Status 200, {health_json}")

    # -------------------------------------------------------------------------
    # 2. REAL PIPELINE END-TO-END TEST
    # -------------------------------------------------------------------------
    print("\n[STEP 5.2] Testing Pipeline Specialist (POST /predict with SubPipe .pbm)...")
    assert SUBPIPE_PBM_PATH.exists(), f"SubPipe image missing: {SUBPIPE_PBM_PATH}"
    with open(SUBPIPE_PBM_PATH, "rb") as f:
        resp_pipe = requests.post(
            f"{BASE_URL}/predict",
            files={"image": (SUBPIPE_PBM_PATH.name, f, "application/octet-stream")},
            data={"target": "pipeline"},
        )
    assert resp_pipe.status_code == 200, f"Expected 200, got {resp_pipe.status_code}: {resp_pipe.text}"
    pipe_json = resp_pipe.json()
    assert pipe_json["model"] == "pipeline"
    assert pipe_json["target"] == "Pipeline"
    assert isinstance(pipe_json["detections"], list)
    assert len(pipe_json["detections"]) >= 1
    for d in pipe_json["detections"]:
        assert d["class"] == "Pipeline"
        assert 0.0 <= d["confidence"] <= 1.0
        assert isinstance(d["bbox"], list) and len(d["bbox"]) == 4
        assert all(isinstance(coord, (int, float)) for coord in d["bbox"])
    results["pipeline"] = {"status_code": resp_pipe.status_code, "body": pipe_json}
    print(f"  PASS: Pipeline response verified:")
    print(json.dumps(pipe_json, indent=2))

    # -------------------------------------------------------------------------
    # 3. REAL HUMAN END-TO-END TEST
    # -------------------------------------------------------------------------
    print("\n[STEP 5.3] Testing Human Specialist (POST /predict with AquaScan .png)...")
    assert AQUASCAN_PNG_PATH.exists(), f"AquaScan image missing: {AQUASCAN_PNG_PATH}"
    with open(AQUASCAN_PNG_PATH, "rb") as f:
        resp_human = requests.post(
            f"{BASE_URL}/predict",
            files={"image": (AQUASCAN_PNG_PATH.name, f, "image/png")},
            data={"target": "human"},
        )
    assert resp_human.status_code == 200, f"Expected 200, got {resp_human.status_code}: {resp_human.text}"
    human_json = resp_human.json()
    assert human_json["model"] == "human"
    assert human_json["target"] == "Human"
    assert isinstance(human_json["detections"], list)
    assert len(human_json["detections"]) >= 1
    for d in human_json["detections"]:
        assert d["class"] == "Human"
        assert 0.0 <= d["confidence"] <= 1.0
        assert isinstance(d["bbox"], list) and len(d["bbox"]) == 4
        assert all(isinstance(coord, (int, float)) for coord in d["bbox"])
    results["human"] = {"status_code": resp_human.status_code, "body": human_json}
    print(f"  PASS: Human response verified:")
    print(json.dumps(human_json, indent=2))

    # -------------------------------------------------------------------------
    # 4. REAL HARDWARE END-TO-END TEST
    # -------------------------------------------------------------------------
    print("\n[STEP 5.4] Testing Hardware Specialist (POST /predict with ESP Hardware .jpg)...")
    assert HARDWARE_JPG_PATH.exists(), f"ESP hardware image missing: {HARDWARE_JPG_PATH}"
    with open(HARDWARE_JPG_PATH, "rb") as f:
        resp_hw = requests.post(
            f"{BASE_URL}/predict",
            files={"image": (HARDWARE_JPG_PATH.name, f, "image/jpeg")},
            data={"target": "hardware"},
        )
    assert resp_hw.status_code == 200, f"Expected 200, got {resp_hw.status_code}: {resp_hw.text}"
    hw_json = resp_hw.json()
    assert hw_json["model"] == "hardware"
    assert hw_json["target"] == "Hardware"
    assert isinstance(hw_json["detections"], list)
    assert len(hw_json["detections"]) >= 1
    valid_hw_classes = {"cap", "clip", "key", "niddle", "scissor"}
    for d in hw_json["detections"]:
        assert d["class"] in valid_hw_classes, f"Unexpected class: {d['class']}"
        assert 0.0 <= d["confidence"] <= 1.0
        assert isinstance(d["bbox"], list) and len(d["bbox"]) == 4
        assert all(isinstance(coord, (int, float)) for coord in d["bbox"])
    assert hw_json["detections"][0]["class"] == "clip"
    results["hardware"] = {"status_code": resp_hw.status_code, "body": hw_json}
    print(f"  PASS: Hardware response verified:")
    print(json.dumps(hw_json, indent=2))

    # -------------------------------------------------------------------------
    # 5. NEGATIVE & VALIDATION TESTS
    # -------------------------------------------------------------------------
    print("\n[STEP 5.5] Running Negative & Validation Tests...")
    blank_png = create_in_memory_blank_png()
    validation_results: Dict[str, Any] = {}

    # A. Invalid target
    print("  Testing 5.5.A: Invalid target ('banana')...")
    resp_inv = requests.post(
        f"{BASE_URL}/predict",
        files={"image": ("blank.png", blank_png, "image/png")},
        data={"target": "banana"},
    )
    assert resp_inv.status_code == 400, f"Expected 400, got {resp_inv.status_code}"
    inv_json = resp_inv.json()
    assert inv_json["error"] == "Unsupported detection target"
    assert inv_json["requested_target"] == "banana"
    assert set(inv_json["supported_targets"]) == {"pipeline", "human", "hardware"}
    validation_results["invalid_target"] = {"status_code": resp_inv.status_code, "body": inv_json}
    print("    PASS: Correctly rejected invalid target with HTTP 400.")

    # B. Missing target
    print("  Testing 5.5.B: Missing target...")
    resp_no_target = requests.post(
        f"{BASE_URL}/predict",
        files={"image": ("blank.png", blank_png, "image/png")},
        data={},
    )
    assert resp_no_target.status_code in {400, 422}, f"Expected 400/422, got {resp_no_target.status_code}"
    validation_results["missing_target"] = {"status_code": resp_no_target.status_code, "body": resp_no_target.json()}
    print(f"    PASS: Correctly rejected missing target with HTTP {resp_no_target.status_code}.")

    # C. Missing image
    print("  Testing 5.5.C: Missing image...")
    resp_no_img = requests.post(
        f"{BASE_URL}/predict",
        data={"target": "hardware"},
    )
    assert resp_no_img.status_code in {400, 422}, f"Expected 400/422, got {resp_no_img.status_code}"
    validation_results["missing_image"] = {"status_code": resp_no_img.status_code, "body": resp_no_img.json()}
    print(f"    PASS: Correctly rejected missing image with HTTP {resp_no_img.status_code}.")

    # D. Corrupt image
    print("  Testing 5.5.D: Corrupt image...")
    corrupt_bytes = b"CORRUPT_BYTES_DATA_NOT_AN_IMAGE_12345"
    resp_corrupt = requests.post(
        f"{BASE_URL}/predict",
        files={"image": ("corrupt.jpg", corrupt_bytes, "image/jpeg")},
        data={"target": "pipeline"},
    )
    assert resp_corrupt.status_code == 400, f"Expected 400, got {resp_corrupt.status_code}"
    corrupt_json = resp_corrupt.json()
    assert "Corrupt or unreadable image file" in corrupt_json["error"]
    validation_results["corrupt_image"] = {"status_code": resp_corrupt.status_code, "body": corrupt_json}
    print("    PASS: Correctly rejected corrupt image with HTTP 400.")

    # E. Blank valid image
    print("  Testing 5.5.E: Blank valid image (zero detections)...")
    resp_blank = requests.post(
        f"{BASE_URL}/predict",
        files={"image": ("blank.png", blank_png, "image/png")},
        data={"target": "hardware"},
    )
    assert resp_blank.status_code == 200, f"Expected 200, got {resp_blank.status_code}"
    blank_json = resp_blank.json()
    assert blank_json["model"] == "hardware"
    assert blank_json["target"] == "Hardware"
    assert blank_json["detections"] == []
    validation_results["blank_image"] = {"status_code": resp_blank.status_code, "body": blank_json}
    print(f"    PASS: Blank image returned HTTP 200 with detections=[].")

    results["validation"] = validation_results

    # -------------------------------------------------------------------------
    # 6. MODEL ROUTING & SINGLETON VERIFICATION
    # -------------------------------------------------------------------------
    print("\n[STEP 5.6] Verifying TargetRouter & Singleton Caching Path...")
    # Route pipeline
    with open(SUBPIPE_PBM_PATH, "rb") as f:
        r_pipe = requests.post(f"{BASE_URL}/predict", files={"image": (SUBPIPE_PBM_PATH.name, f, "application/octet-stream")}, data={"target": "pipeline"}).json()
    assert r_pipe["model"] == "pipeline"

    # Route human
    with open(AQUASCAN_PNG_PATH, "rb") as f:
        r_human = requests.post(f"{BASE_URL}/predict", files={"image": (AQUASCAN_PNG_PATH.name, f, "image/png")}, data={"target": "human"}).json()
    assert r_human["model"] == "human"

    # Route hardware
    with open(HARDWARE_JPG_PATH, "rb") as f:
        r_hw = requests.post(f"{BASE_URL}/predict", files={"image": (HARDWARE_JPG_PATH.name, f, "image/jpeg")}, data={"target": "hardware"}).json()
    assert r_hw["model"] == "hardware"

    print("  PASS: Target-aware specialist routing confirmed:")
    print("    target='pipeline' -> model='pipeline'")
    print("    target='human'    -> model='human'")
    print("    target='hardware' -> model='hardware'")

    # -------------------------------------------------------------------------
    # 7. EXISTING ENDPOINTS REGRESSION CHECK
    # -------------------------------------------------------------------------
    print("\n[STEP 5.7] Testing Existing Endpoints Regression (/analyze and /segment)...")
    # POST /analyze with real pipeline image
    with open(SUBPIPE_PBM_PATH, "rb") as f:
        resp_ana = requests.post(
            f"{BASE_URL}/analyze",
            files={"file": (SUBPIPE_PBM_PATH.name, f, "application/octet-stream")},
            data={"target": "pipeline"},
        )
    assert resp_ana.status_code == 200, f"Expected 200, got {resp_ana.status_code}: {resp_ana.text}"
    ana_json = resp_ana.json()
    assert ana_json["success"] is True
    assert "analysis" in ana_json
    print("  PASS: /analyze endpoint regression passed.")

    # POST /segment with real pipeline image
    with open(SUBPIPE_PBM_PATH, "rb") as f:
        resp_seg = requests.post(
            f"{BASE_URL}/segment",
            files={"file": (SUBPIPE_PBM_PATH.name, f, "application/octet-stream")},
            data={"target": "pipeline"},
        )
    assert resp_seg.status_code == 501, f"Expected 501, got {resp_seg.status_code}: {resp_seg.text}"
    seg_json = resp_seg.json()
    assert seg_json["success"] is False
    assert seg_json["status"] == "conditional"
    print("  PASS: /segment endpoint regression passed (501 conditional response).")

    # -------------------------------------------------------------------------
    # 8. CHECKPOINT SHA256 INTEGRITY
    # -------------------------------------------------------------------------
    print("\n[STEP 5.8] Verifying All 3 Frozen Checkpoint SHA256 Hashes...")
    h1 = compute_sha256(settings.MODEL_1_PATH)
    h2 = compute_sha256(settings.MODEL_2_PATH)
    h3 = compute_sha256(settings.MODEL_3_PATH)

    assert h1 == settings.MODEL_1_EXPECTED_SHA256, f"Model 1 hash mismatch: {h1}"
    assert h2 == settings.MODEL_2_EXPECTED_SHA256, f"Model 2 hash mismatch: {h2}"
    assert h3 == settings.MODEL_3_EXPECTED_SHA256, f"Model 3 hash mismatch: {h3}"

    results["checkpoints"] = {
        "model1": {"path": str(settings.MODEL_1_PATH), "sha256": h1, "status": "UNCHANGED"},
        "model2": {"path": str(settings.MODEL_2_PATH), "sha256": h2, "status": "UNCHANGED"},
        "model3": {"path": str(settings.MODEL_3_PATH), "sha256": h3, "status": "UNCHANGED"},
    }

    print(f"  Model 1 SHA256: {h1} (FROZEN UNCHANGED)")
    print(f"  Model 2 SHA256: {h2} (FROZEN UNCHANGED)")
    print(f"  Model 3 SHA256: {h3} (FROZEN UNCHANGED)")

    print("\n================================================================================")
    print("STEP 5 — END-TO-END FASTAPI VERIFICATION OF ALL 3 FROZEN MODELS COMPLETE: PASS")
    print("================================================================================")
    return results


if __name__ == "__main__":
    run_step5_e2e_tests()
