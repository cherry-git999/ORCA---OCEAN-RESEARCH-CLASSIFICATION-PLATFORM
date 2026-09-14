"""Phase 7 API Integration Test Suite (Steps 26–30).

Executes comprehensive client-facing HTTP API tests against /predict, /analyze, and /segment
using real sonar dataset images, invalid targets, corrupt files, and deterministic blank images.
"""

import io
import json
import sys
from pathlib import Path
from typing import Any, Dict, List
from PIL import Image
import requests

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.app.config import settings
from backend.app.models.loader import compute_sha256

BASE_URL = "http://127.0.0.1:8000"

# Repository-local sample image paths
SAMPLE_DATA_DIR = REPO_ROOT / "frontend" / "sample_data"
SUBPIPE_PBM_PATH = SAMPLE_DATA_DIR / "1693569383.780.pbm"
AQUASCAN_PNG_PATH = SAMPLE_DATA_DIR / "0a2be3cd-Screenshot_2025-08-03_14.26.49.png"


def create_in_memory_blank_image() -> bytes:
    """Create a 640x640 black RGB image in memory (no disk write)."""
    img = Image.new("RGB", (640, 640), color="black")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def run_phase7_tests() -> List[Dict[str, Any]]:
    print("================================================================================")
    print("STARTING SIH26057 PHASE 7 API INTEGRATION TESTING (STEPS 26–30)")
    print("================================================================================")

    test_records: List[Dict[str, Any]] = []

    def record_result(
        test_id: str,
        name: str,
        endpoint: str,
        method: str,
        target: Any,
        status_code: int,
        expected_status: int,
        success: bool,
        model_id: str = "N/A",
        class_name: str = "N/A",
        detection_count: Any = "N/A",
        error_behavior: str = "N/A",
        passed: bool = True,
        extra: str = "",
    ):
        rec = {
            "test_id": test_id,
            "name": name,
            "endpoint": endpoint,
            "method": method,
            "target": str(target),
            "status_code": status_code,
            "expected_status": expected_status,
            "success": success,
            "model_id": model_id,
            "class_name": class_name,
            "detection_count": detection_count,
            "error_behavior": error_behavior,
            "passed": passed and (status_code == expected_status),
            "extra": extra,
        }
        test_records.append(rec)
        status_tag = "PASS" if rec["passed"] else "FAIL"
        print(
            f"[{status_tag}] {test_id} - {name} ({method} {endpoint}) -> Status: {status_code} | "
            f"Model: {model_id} | Class: {class_name} | Detections: {detection_count} | {extra}"
        )
        assert rec["passed"], f"Test {test_id} FAILED! Received status {status_code}, expected {expected_status}."

    # -------------------------------------------------------------------------
    # TEST 26 — PIPELINE (Real SubPipeMiniSSS .pbm image)
    # -------------------------------------------------------------------------
    print("\n>>> TEST 26: Real Pipeline Sonar Image Testing...")
    assert SUBPIPE_PBM_PATH.exists(), f"Missing file: {SUBPIPE_PBM_PATH}"

    # 26.1 POST /predict with target=pipeline
    with open(SUBPIPE_PBM_PATH, "rb") as f:
        resp = requests.post(
            f"{BASE_URL}/predict",
            files={"file": (SUBPIPE_PBM_PATH.name, f, "application/octet-stream")},
            data={"target": "pipeline"},
        )
    data_26_1 = resp.json()
    assert data_26_1["model"] == "pipeline"
    assert data_26_1["target"] == "Pipeline"
    assert isinstance(data_26_1["detections"], list)
    for d in data_26_1["detections"]:
        assert d["confidence"] >= 0.25
        assert d["class"] == "Pipeline"
        b = d["bbox"]
        assert 0 <= b[0] <= 5000 and 0 <= b[2] <= 5000
        assert 0 <= b[1] <= 500 and 0 <= b[3] <= 500

    record_result(
        test_id="TEST-26A",
        name="Pipeline Real Sonar (/predict)",
        endpoint="/predict",
        method="POST",
        target="pipeline",
        status_code=resp.status_code,
        expected_status=200,
        success=True,
        model_id=data_26_1["model"],
        class_name="Pipeline",
        detection_count=len(data_26_1["detections"]),
        passed=True,
        extra=f"Target: {data_26_1['target']}, Model: {data_26_1['model']}",
    )

    # 26.2 POST /analyze with target=pipeline
    with open(SUBPIPE_PBM_PATH, "rb") as f:
        resp = requests.post(
            f"{BASE_URL}/analyze",
            files={"file": (SUBPIPE_PBM_PATH.name, f, "application/octet-stream")},
            data={"target": "pipeline"},
        )
    data_26_2 = resp.json()
    assert data_26_2["success"] is True
    assert data_26_2["model"]["id"] == "model1"
    assert data_26_2["analysis"]["detections_found"] is True
    record_result(
        test_id="TEST-26B",
        name="Pipeline Real Sonar (/analyze)",
        endpoint="/analyze",
        method="POST",
        target="pipeline",
        status_code=resp.status_code,
        expected_status=200,
        success=data_26_2["success"],
        model_id=data_26_2["model"]["id"],
        class_name=data_26_2["model"]["class_name"],
        detection_count=data_26_2["analysis"]["detection_count"],
        passed=True,
        extra=f"Highest Conf: {data_26_2['analysis']['highest_confidence']}",
    )

    # -------------------------------------------------------------------------
    # TEST 27 — HUMAN (Real AquaScan-1K image)
    # -------------------------------------------------------------------------
    print("\n>>> TEST 27: Real Human Sonar Image Testing...")
    assert AQUASCAN_PNG_PATH.exists(), f"Missing file: {AQUASCAN_PNG_PATH}"

    # 27.1 POST /predict with target=human
    with open(AQUASCAN_PNG_PATH, "rb") as f:
        resp = requests.post(
            f"{BASE_URL}/predict",
            files={"file": (AQUASCAN_PNG_PATH.name, f, "image/png")},
            data={"target": "human"},
        )
    data_27_1 = resp.json()
    assert data_27_1["model"] == "human"
    assert data_27_1["target"] == "Human"
    assert isinstance(data_27_1["detections"], list)
    for d in data_27_1["detections"]:
        assert d["confidence"] >= 0.25
        assert d["class"] == "Human"
        b = d["bbox"]
        assert 0 <= b[0] <= 1920 and 0 <= b[2] <= 1920
        assert 0 <= b[1] <= 1080 and 0 <= b[3] <= 1080

    record_result(
        test_id="TEST-27A",
        name="Human Real Sonar (/predict)",
        endpoint="/predict",
        method="POST",
        target="human",
        status_code=resp.status_code,
        expected_status=200,
        success=True,
        model_id=data_27_1["model"],
        class_name="Human",
        detection_count=len(data_27_1["detections"]),
        passed=True,
        extra=f"Target: {data_27_1['target']}, Model: {data_27_1['model']}",
    )

    # 27.2 POST /analyze with target=human
    with open(AQUASCAN_PNG_PATH, "rb") as f:
        resp = requests.post(
            f"{BASE_URL}/analyze",
            files={"file": (AQUASCAN_PNG_PATH.name, f, "image/png")},
            data={"target": "human"},
        )
    data_27_2 = resp.json()
    assert data_27_2["success"] is True
    assert data_27_2["model"]["id"] == "model2"
    assert data_27_2["analysis"]["detections_found"] is True
    record_result(
        test_id="TEST-27B",
        name="Human Real Sonar (/analyze)",
        endpoint="/analyze",
        method="POST",
        target="human",
        status_code=resp.status_code,
        expected_status=200,
        success=data_27_2["success"],
        model_id=data_27_2["model"]["id"],
        class_name=data_27_2["model"]["class_name"],
        detection_count=data_27_2["analysis"]["detection_count"],
        passed=True,
        extra=f"Highest Conf: {data_27_2['analysis']['highest_confidence']}",
    )

    # -------------------------------------------------------------------------
    # TEST 28 — INVALID TARGET
    # -------------------------------------------------------------------------
    print("\n>>> TEST 28: Invalid Target Rejection Testing...")
    invalid_targets = [
        "ship",
        "pipe",
        "person",
        "pipeline_detection",
        "human_detection",
        "submarine",
    ]

    for inv in invalid_targets:
        # /predict
        with open(SUBPIPE_PBM_PATH, "rb") as f:
            resp_p = requests.post(
                f"{BASE_URL}/predict",
                files={"file": (SUBPIPE_PBM_PATH.name, f, "application/octet-stream")},
                data={"target": inv},
            )
        assert resp_p.status_code == 400
        assert resp_p.json()["error"] == "Unsupported detection target"
        record_result(
            test_id=f"TEST-28-PRED-{inv.upper()}",
            name=f"Invalid Target '{inv}' (/predict)",
            endpoint="/predict",
            method="POST",
            target=inv,
            status_code=resp_p.status_code,
            expected_status=400,
            success=False,
            error_behavior="Rejected before inference (HTTP 400)",
            passed=True,
        )

        # /analyze
        with open(SUBPIPE_PBM_PATH, "rb") as f:
            resp_a = requests.post(
                f"{BASE_URL}/analyze",
                files={"file": (SUBPIPE_PBM_PATH.name, f, "application/octet-stream")},
                data={"target": inv},
            )
        assert resp_a.status_code == 400
        assert resp_a.json()["error"] == "Unsupported detection target"
        record_result(
            test_id=f"TEST-28-ANA-{inv.upper()}",
            name=f"Invalid Target '{inv}' (/analyze)",
            endpoint="/analyze",
            method="POST",
            target=inv,
            status_code=resp_a.status_code,
            expected_status=400,
            success=False,
            error_behavior="Rejected before inference (HTTP 400)",
            passed=True,
        )

    # -------------------------------------------------------------------------
    # TEST 29 — BAD IMAGE INPUTS
    # -------------------------------------------------------------------------
    print("\n>>> TEST 29: Bad Image Handling Testing...")

    # 29.A Corrupt .pbm bytes
    corrupt_pbm = io.BytesIO(b"P6\nCorrupt header 99999999999999999999")
    for ep in ["/predict", "/analyze"]:
        corrupt_pbm.seek(0)
        resp = requests.post(
            f"{BASE_URL}{ep}",
            files={"file": ("corrupt.pbm", corrupt_pbm, "application/octet-stream")},
            data={"target": "pipeline"},
        )
        assert resp.status_code == 400
        record_result(
            test_id=f"TEST-29A{ep.upper()}",
            name=f"Corrupt .pbm bytes ({ep})",
            endpoint=ep,
            method="POST",
            target="pipeline",
            status_code=resp.status_code,
            expected_status=400,
            success=False,
            error_behavior="Clean HTTP 400 decode error",
            passed=True,
        )

    # 29.B Random bytes with .png extension
    random_png = io.BytesIO(b"not a valid png file data at all 123456")
    for ep in ["/predict", "/analyze"]:
        random_png.seek(0)
        resp = requests.post(
            f"{BASE_URL}{ep}",
            files={"file": ("fake.png", random_png, "image/png")},
            data={"target": "human"},
        )
        assert resp.status_code == 400
        record_result(
            test_id=f"TEST-29B{ep.upper()}",
            name=f"Random bytes .png ({ep})",
            endpoint=ep,
            method="POST",
            target="human",
            status_code=resp.status_code,
            expected_status=400,
            success=False,
            error_behavior="Clean HTTP 400 decode error",
            passed=True,
        )

    # 29.C Unsupported extension (.xyz)
    xyz_bytes = io.BytesIO(b"some content")
    for ep in ["/predict", "/analyze"]:
        xyz_bytes.seek(0)
        resp = requests.post(
            f"{BASE_URL}{ep}",
            files={"file": ("unsupported.xyz", xyz_bytes, "application/octet-stream")},
            data={"target": "pipeline"},
        )
        assert resp.status_code == 400
        assert resp.json()["error"] == "Unsupported image format"
        record_result(
            test_id=f"TEST-29C{ep.upper()}",
            name=f"Unsupported format .xyz ({ep})",
            endpoint=ep,
            method="POST",
            target="pipeline",
            status_code=resp.status_code,
            expected_status=400,
            success=False,
            error_behavior="Clean HTTP 400 format rejection",
            passed=True,
        )

    # 29.D Empty file (0 bytes)
    empty_bytes = io.BytesIO(b"")
    for ep in ["/predict", "/analyze"]:
        empty_bytes.seek(0)
        resp = requests.post(
            f"{BASE_URL}{ep}",
            files={"file": ("empty.png", empty_bytes, "image/png")},
            data={"target": "pipeline"},
        )
        assert resp.status_code == 400
        record_result(
            test_id=f"TEST-29D{ep.upper()}",
            name=f"Empty 0-byte file ({ep})",
            endpoint=ep,
            method="POST",
            target="pipeline",
            status_code=resp.status_code,
            expected_status=400,
            success=False,
            error_behavior="Clean HTTP 400 empty file rejection",
            passed=True,
        )

    # -------------------------------------------------------------------------
    # TEST 30 — EMPTY DETECTION (Valid in-memory 640x640 Black Image)
    # -------------------------------------------------------------------------
    print("\n>>> TEST 30: Valid Image with Zero Detection Testing...")
    blank_bytes = create_in_memory_blank_image()

    # 30.1 POST /predict with blank image
    resp_30_1 = requests.post(
        f"{BASE_URL}/predict",
        files={"file": ("blank_test.png", io.BytesIO(blank_bytes), "image/png")},
        data={"target": "pipeline"},
    )
    assert resp_30_1.status_code == 200
    json_30_1 = resp_30_1.json()
    assert json_30_1["model"] == "pipeline"
    assert json_30_1["target"] == "Pipeline"
    assert json_30_1["detections"] == []
    record_result(
        test_id="TEST-30A",
        name="Empty Detection (/predict)",
        endpoint="/predict",
        method="POST",
        target="pipeline",
        status_code=resp_30_1.status_code,
        expected_status=200,
        success=True,
        model_id=json_30_1["model"],
        class_name="Pipeline",
        detection_count=0,
        passed=True,
        extra="detections=[] (HTTP 200)",
    )

    # 30.2 POST /analyze with blank image
    resp_30_2 = requests.post(
        f"{BASE_URL}/analyze",
        files={"file": ("blank_test.png", io.BytesIO(blank_bytes), "image/png")},
        data={"target": "pipeline"},
    )
    assert resp_30_2.status_code == 200
    json_30_2 = resp_30_2.json()
    assert json_30_2["success"] is True
    assert json_30_2["analysis"]["detection_count"] == 0
    assert json_30_2["analysis"]["detections_found"] is False
    assert json_30_2["analysis"]["highest_confidence"] is None
    assert json_30_2["analysis"]["detections"] == []
    assert "No objects detected" in json_30_2["message"]
    record_result(
        test_id="TEST-30B",
        name="Empty Detection (/analyze)",
        endpoint="/analyze",
        method="POST",
        target="pipeline",
        status_code=resp_30_2.status_code,
        expected_status=200,
        success=True,
        model_id=json_30_2["model"]["id"],
        class_name=json_30_2["model"]["class_name"],
        detection_count=0,
        passed=True,
        extra=f"detections_found: False, highest_confidence: None (HTTP 200)",
    )

    # -------------------------------------------------------------------------
    # MODEL CHECKPOINT INTEGRITY
    # -------------------------------------------------------------------------
    print("\n>>> VERIFYING MODEL CHECKPOINT HASHES...")
    h1 = compute_sha256(settings.MODEL_1_PATH)
    h2 = compute_sha256(settings.MODEL_2_PATH)
    assert h1 == settings.MODEL_1_EXPECTED_SHA256, f"Model 1 hash mismatch: {h1}"
    assert h2 == settings.MODEL_2_EXPECTED_SHA256, f"Model 2 hash mismatch: {h2}"
    print(f"  Model 1 SHA256: {h1} (MATCH)")
    print(f"  Model 2 SHA256: {h2} (MATCH)")

    print("\n================================================================================")
    print(f"PHASE 7 API INTEGRATION TESTING COMPLETE: ALL {len(test_records)} TESTS PASSED!")
    print("================================================================================")
    return test_records


if __name__ == "__main__":
    run_phase7_tests()
