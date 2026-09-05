"""Comprehensive test suite for Phase 5 /analyze endpoint and regression testing."""

import io
import json
import requests
from pathlib import Path
from PIL import Image

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
    print("RUNNING PHASE 5 /analyze TEST SUITE")
    print("==================================================")

    # 1. Real SubPipe .pbm + target=pipeline -> HTTP 200
    print("\n[TEST 1] Real SubPipe .pbm + target=pipeline...")
    assert SUBPIPE_PBM_PATH.exists(), f"Missing file: {SUBPIPE_PBM_PATH}"
    with open(SUBPIPE_PBM_PATH, "rb") as f:
        files = {"file": (SUBPIPE_PBM_PATH.name, f, "application/octet-stream")}
        data = {"target": "pipeline"}
        resp = requests.post(f"{BASE_URL}/analyze", files=files, data=data)

    print(f"  HTTP Status: {resp.status_code}")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    json_1 = resp.json()
    print("  Response:", json.dumps(json_1, indent=2))
    assert json_1["success"] is True
    assert json_1["target"] == "pipeline"
    assert json_1["model"]["id"] == "model1"
    assert json_1["model"]["class_name"] == "Pipeline"
    assert json_1["image"]["width"] == 5000
    assert json_1["image"]["height"] == 500
    assert "analysis" in json_1
    assert json_1["analysis"]["detections_found"] is True
    assert json_1["analysis"]["detection_count"] >= 1
    assert json_1["analysis"]["highest_confidence"] is not None
    print(f"  PASS: TEST 1 succeeded. Highest confidence: {json_1['analysis']['highest_confidence']}")

    # 2. Real SubPipe .bpm + target=pipeline -> HTTP 200
    print("\n[TEST 2] Real SubPipe .bpm + target=pipeline...")
    if SUBPIPE_BPM_PATH.exists():
        with open(SUBPIPE_BPM_PATH, "rb") as f:
            files = {"file": (SUBPIPE_BPM_PATH.name, f, "application/octet-stream")}
            data = {"target": "pipeline"}
            resp = requests.post(f"{BASE_URL}/analyze", files=files, data=data)
        assert resp.status_code == 200
        json_2 = resp.json()
        assert json_2["success"] is True
        assert json_2["model"]["id"] == "model1"
        print(f"  PASS: TEST 2 succeeded. Detection count: {json_2['analysis']['detection_count']}")
    else:
        print("  SKIPPED: BPM sample not present.")

    # 3. Real AquaScan image + target=human -> HTTP 200
    print("\n[TEST 3] Real AquaScan image + target=human...")
    assert AQUASCAN_PNG_PATH.exists(), f"Missing file: {AQUASCAN_PNG_PATH}"
    with open(AQUASCAN_PNG_PATH, "rb") as f:
        files = {"file": (AQUASCAN_PNG_PATH.name, f, "image/png")}
        data = {"target": "human"}
        resp = requests.post(f"{BASE_URL}/analyze", files=files, data=data)

    assert resp.status_code == 200
    json_3 = resp.json()
    print("  Response:", json.dumps(json_3, indent=2))
    assert json_3["success"] is True
    assert json_3["target"] == "human"
    assert json_3["model"]["id"] == "model2"
    assert json_3["model"]["class_name"] == "Human"
    assert json_3["analysis"]["detections_found"] is True
    assert json_3["analysis"]["detection_count"] >= 1
    print(f"  PASS: TEST 3 succeeded. Highest confidence: {json_3['analysis']['highest_confidence']}")

    # 4. Existing PNG -> HTTP 200
    print("\n[TEST 4] Existing PNG image...")
    with open(AQUASCAN_PNG_PATH, "rb") as f:
        files = {"file": (AQUASCAN_PNG_PATH.name, f, "image/png")}
        data = {"target": "human"}
        resp = requests.post(f"{BASE_URL}/analyze", files=files, data=data)
    assert resp.status_code == 200
    print("  PASS: TEST 4 succeeded.")

    # 5. Existing JPG -> HTTP 200
    print("\n[TEST 5] Existing JPG image...")
    with open(GHOSTVISION_JPG_PATH, "rb") as f:
        files = {"file": (GHOSTVISION_JPG_PATH.name, f, "image/jpeg")}
        data = {"target": "pipeline"}
        resp = requests.post(f"{BASE_URL}/analyze", files=files, data=data)
    assert resp.status_code == 200
    print("  PASS: TEST 5 succeeded.")

    # 6. Blank image -> HTTP 200, detection_count=0, detections_found=False, highest_confidence=None
    print("\n[TEST 6] Blank image (zero detections)...")
    blank_img = Image.new("RGB", (640, 640), color="black")
    buf = io.BytesIO()
    blank_img.save(buf, format="PNG")
    buf.seek(0)
    files = {"file": ("blank_analysis.png", buf, "image/png")}
    data = {"target": "pipeline"}
    resp = requests.post(f"{BASE_URL}/analyze", files=files, data=data)
    assert resp.status_code == 200
    json_6 = resp.json()
    assert json_6["success"] is True
    assert json_6["analysis"]["detection_count"] == 0
    assert json_6["analysis"]["detections_found"] is False
    assert json_6["analysis"]["highest_confidence"] is None
    assert json_6["analysis"]["detections"] == []
    assert "No objects detected" in json_6["message"]
    print(f"  PASS: TEST 6 verified clean zero-detection response.")

    # 7. Corrupt image -> HTTP 400
    print("\n[TEST 7] Corrupt image...")
    corrupt_bytes = io.BytesIO(b"random corrupt header bytes 00000000")
    files = {"file": ("corrupt.png", corrupt_bytes, "image/png")}
    data = {"target": "pipeline"}
    resp = requests.post(f"{BASE_URL}/analyze", files=files, data=data)
    assert resp.status_code == 400
    print("  PASS: TEST 7 rejected corrupt image with HTTP 400.")

    # 8. Unsupported extension -> HTTP 400
    print("\n[TEST 8] Unsupported extension (.gif)...")
    fake_gif = io.BytesIO(b"GIF89a sample content")
    files = {"file": ("test.gif", fake_gif, "image/gif")}
    data = {"target": "pipeline"}
    resp = requests.post(f"{BASE_URL}/analyze", files=files, data=data)
    assert resp.status_code == 400
    assert resp.json()["error"] == "Unsupported image format"
    print("  PASS: TEST 8 rejected unsupported extension with HTTP 400.")

    # 9. Invalid target -> HTTP 400
    print("\n[TEST 9] Invalid target ('airplane')...")
    with open(SUBPIPE_PBM_PATH, "rb") as f:
        files = {"file": (SUBPIPE_PBM_PATH.name, f, "application/octet-stream")}
        data = {"target": "airplane"}
        resp = requests.post(f"{BASE_URL}/analyze", files=files, data=data)
    assert resp.status_code == 400
    assert resp.json()["error"] == "Unsupported detection target"
    print("  PASS: TEST 9 rejected invalid target with HTTP 400.")

    # 10. .pbm + target=pipeline -> Model 1 -> class_name Pipeline
    print("\n[TEST 10] .pbm + target=pipeline -> Model 1...")
    with open(SUBPIPE_PBM_PATH, "rb") as f:
        files = {"file": (SUBPIPE_PBM_PATH.name, f, "application/octet-stream")}
        data = {"target": "pipeline"}
        resp = requests.post(f"{BASE_URL}/analyze", files=files, data=data)
    assert resp.status_code == 200
    assert resp.json()["model"]["id"] == "model1"
    assert resp.json()["model"]["class_name"] == "Pipeline"
    print("  PASS: TEST 10 confirmed routing to Model 1 (Pipeline).")

    # 11. .pbm + target=human -> Model 2 -> class_name Human
    print("\n[TEST 11] .pbm + target=human -> Model 2...")
    with open(SUBPIPE_PBM_PATH, "rb") as f:
        files = {"file": (SUBPIPE_PBM_PATH.name, f, "application/octet-stream")}
        data = {"target": "human"}
        resp = requests.post(f"{BASE_URL}/analyze", files=files, data=data)
    assert resp.status_code == 200
    assert resp.json()["model"]["id"] == "model2"
    assert resp.json()["model"]["class_name"] == "Human"
    print("  PASS: TEST 11 confirmed routing to Model 2 (Human).")

    # 12. Verify every returned bbox is within original image dimensions
    print("\n[TEST 12] Bounding Box Localization Verification...")
    for test_name, file_path, target in [
        ("SubPipe Pipeline", SUBPIPE_PBM_PATH, "pipeline"),
        ("AquaScan Human", AQUASCAN_PNG_PATH, "human"),
    ]:
        with open(file_path, "rb") as f:
            files = {"file": (file_path.name, f, "application/octet-stream")}
            data = {"target": target}
            res = requests.post(f"{BASE_URL}/analyze", files=files, data=data).json()

        w = res["image"]["width"]
        h = res["image"]["height"]
        for d in res["analysis"]["detections"]:
            b = d["bbox"]
            assert 0 <= b["x1"] <= w, f"x1 ({b['x1']}) out of range [0, {w}]"
            assert 0 <= b["x2"] <= w, f"x2 ({b['x2']}) out of range [0, {w}]"
            assert 0 <= b["y1"] <= h, f"y1 ({b['y1']}) out of range [0, {h}]"
            assert 0 <= b["y2"] <= h, f"y2 ({b['y2']}) out of range [0, {h}]"
            assert b["x1"] <= b["x2"], f"x1 ({b['x1']}) > x2 ({b['x2']})"
            assert b["y1"] <= b["y2"], f"y1 ({b['y1']}) > y2 ({b['y2']})"
        print(f"  PASS: {test_name} bounding boxes verified within original dimensions ({w}x{h}).")

    # 13. Verify confidence values are >= 0.25
    print("\n[TEST 13] Confidence Filtering Verification...")
    for file_path, target in [(SUBPIPE_PBM_PATH, "pipeline"), (AQUASCAN_PNG_PATH, "human")]:
        with open(file_path, "rb") as f:
            files = {"file": (file_path.name, f, "application/octet-stream")}
            data = {"target": target}
            res = requests.post(f"{BASE_URL}/analyze", files=files, data=data).json()
        for d in res["analysis"]["detections"]:
            assert d["confidence"] >= 0.25, f"Confidence {d['confidence']} < 0.25 threshold!"
    print("  PASS: All detections strictly satisfy confidence >= 0.25.")

    # 14. Verify /predict still works after /analyze is added (Regression check)
    print("\n[TEST 14] Regression Check: /predict endpoint...")
    with open(SUBPIPE_PBM_PATH, "rb") as f:
        files = {"file": (SUBPIPE_PBM_PATH.name, f, "application/octet-stream")}
        data = {"target": "pipeline"}
        resp_pred = requests.post(f"{BASE_URL}/predict", files=files, data=data)
    assert resp_pred.status_code == 200
    json_pred = resp_pred.json()
    assert json_pred["success"] is True
    assert json_pred["model"]["id"] == "model1"
    assert "detections" in json_pred
    print("  PASS: /predict functions identically without regression.")

    # 15. Verify Frozen Checkpoint Hashes
    print("\n[TEST 15] Model Checkpoint Hashes...")
    h1 = compute_sha256(settings.MODEL_1_PATH)
    h2 = compute_sha256(settings.MODEL_2_PATH)
    assert h1 == settings.MODEL_1_EXPECTED_SHA256, f"Model 1 hash mismatch: {h1}"
    assert h2 == settings.MODEL_2_EXPECTED_SHA256, f"Model 2 hash mismatch: {h2}"
    print(f"  Model 1 SHA256: {h1} (MATCH)")
    print(f"  Model 2 SHA256: {h2} (MATCH)")
    print("  PASS: Frozen checkpoint hashes verified.")

    print("\n==================================================")
    print("ALL 14 PHASE 5 TESTS COMPLETED SUCCESSFULLY!")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
