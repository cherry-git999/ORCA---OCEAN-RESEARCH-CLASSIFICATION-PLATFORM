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
    print("RUNNING PHASE 6 /segment TEST SUITE")
    print("==================================================")

    # 1. POST /segment with valid SubPipe .pbm -> HTTP 501
    print("\n[TEST 1] POST /segment with valid SubPipe .pbm...")
    assert SUBPIPE_PBM_PATH.exists(), f"Missing file: {SUBPIPE_PBM_PATH}"
    with open(SUBPIPE_PBM_PATH, "rb") as f:
        files = {"file": (SUBPIPE_PBM_PATH.name, f, "application/octet-stream")}
        data = {"target": "pipeline"}
        resp = requests.post(f"{BASE_URL}/segment", files=files, data=data)

    print(f"  HTTP Status: {resp.status_code}")
    assert resp.status_code == 501, f"Expected 501, got {resp.status_code}: {resp.text}"
    json_1 = resp.json()
    print("  Response:", json.dumps(json_1, indent=2))
    assert json_1["success"] is False
    assert json_1["segmentation_available"] is False
    assert json_1["status"] == "conditional"
    assert "reason" in json_1
    assert "No verified pixel-level segmentation masks" in json_1["reason"]
    assert json_1["image"]["width"] == 5000
    assert json_1["image"]["height"] == 500
    print("  PASS: TEST 1 verified conditional 501 response with accurate image dimensions.")

    # 2. POST /segment with valid SubPipe .bpm -> HTTP 501
    print("\n[TEST 2] POST /segment with valid SubPipe .bpm...")
    if SUBPIPE_BPM_PATH.exists():
        with open(SUBPIPE_BPM_PATH, "rb") as f:
            files = {"file": (SUBPIPE_BPM_PATH.name, f, "application/octet-stream")}
            data = {"target": "pipeline"}
            resp = requests.post(f"{BASE_URL}/segment", files=files, data=data)
        assert resp.status_code == 501
        json_2 = resp.json()
        assert json_2["segmentation_available"] is False
        print("  PASS: TEST 2 verified BPM 501 response.")
    else:
        print("  SKIPPED: BPM sample not found.")

    # 3. POST /segment with valid PNG -> HTTP 501
    print("\n[TEST 3] POST /segment with valid PNG...")
    assert AQUASCAN_PNG_PATH.exists(), f"Missing file: {AQUASCAN_PNG_PATH}"
    with open(AQUASCAN_PNG_PATH, "rb") as f:
        files = {"file": (AQUASCAN_PNG_PATH.name, f, "image/png")}
        data = {"target": "human"}
        resp = requests.post(f"{BASE_URL}/segment", files=files, data=data)
    assert resp.status_code == 501
    assert resp.json()["segmentation_available"] is False
    print("  PASS: TEST 3 verified PNG 501 response.")

    # 4. POST /segment with valid JPG -> HTTP 501
    print("\n[TEST 4] POST /segment with valid JPG...")
    with open(GHOSTVISION_JPG_PATH, "rb") as f:
        files = {"file": (GHOSTVISION_JPG_PATH.name, f, "image/jpeg")}
        data = {"target": "pipeline"}
        resp = requests.post(f"{BASE_URL}/segment", files=files, data=data)
    assert resp.status_code == 501
    assert resp.json()["segmentation_available"] is False
    print("  PASS: TEST 4 verified JPG 501 response.")

    # 5. Corrupt image -> HTTP 400
    print("\n[TEST 5] Corrupt image...")
    corrupt_bytes = io.BytesIO(b"garbage invalid corrupt data 12345678")
    files = {"file": ("corrupt.png", corrupt_bytes, "image/png")}
    data = {"target": "pipeline"}
    resp = requests.post(f"{BASE_URL}/segment", files=files, data=data)
    assert resp.status_code == 400
    print("  PASS: TEST 5 correctly rejected corrupt image with HTTP 400.")

    # 6. Unsupported extension -> HTTP 400
    print("\n[TEST 6] Unsupported extension (.gif)...")
    fake_gif = io.BytesIO(b"GIF89a sample content")
    files = {"file": ("test.gif", fake_gif, "image/gif")}
    data = {"target": "pipeline"}
    resp = requests.post(f"{BASE_URL}/segment", files=files, data=data)
    assert resp.status_code == 400
    assert resp.json()["error"] == "Unsupported image format"
    print("  PASS: TEST 6 correctly rejected unsupported extension with HTTP 400.")

    # 7. Invalid target -> HTTP 400
    print("\n[TEST 7] Invalid target ('submarine')...")
    with open(SUBPIPE_PBM_PATH, "rb") as f:
        files = {"file": (SUBPIPE_PBM_PATH.name, f, "application/octet-stream")}
        data = {"target": "submarine"}
        resp = requests.post(f"{BASE_URL}/segment", files=files, data=data)
    assert resp.status_code == 400
    assert resp.json()["error"] == "Unsupported detection target"
    print("  PASS: TEST 7 correctly rejected invalid target with HTTP 400.")

    # 8. Verify response does NOT contain mask, polygon, segmentation coordinates, bbox-derived mask
    print("\n[TEST 8] Verifying absence of fake segmentation keys...")
    with open(SUBPIPE_PBM_PATH, "rb") as f:
        files = {"file": (SUBPIPE_PBM_PATH.name, f, "application/octet-stream")}
        data = {"target": "pipeline"}
        res = requests.post(f"{BASE_URL}/segment", files=files, data=data).json()

    prohibited_keys = [
        "mask",
        "masks",
        "polygon",
        "polygons",
        "segmentation",
        "segmentation_coordinates",
        "rle",
        "bbox_mask",
        "contour",
    ]
    for key in prohibited_keys:
        assert key not in res, f"Prohibited fake segmentation key '{key}' found in response!"
    print("  PASS: Confirmed zero fake segmentation artifacts or keys in response.")

    # 9. Verify no YOLO bounding box is converted into a mask
    print("\n[TEST 9] Verifying YOLO bounding boxes are NOT converted to masks...")
    assert "detections" not in res
    assert "bbox" not in res
    print("  PASS: Confirmed no bounding boxes are reinterpreted as masks.")

    # 10. Verify /predict still works (Regression Check)
    print("\n[TEST 10] Regression Check: /predict endpoint...")
    with open(SUBPIPE_PBM_PATH, "rb") as f:
        files = {"file": (SUBPIPE_PBM_PATH.name, f, "application/octet-stream")}
        data = {"target": "pipeline"}
        resp_pred = requests.post(f"{BASE_URL}/predict", files=files, data=data)
    assert resp_pred.status_code == 200
    assert resp_pred.json()["model"] == "pipeline"
    assert resp_pred.json()["target"] == "Pipeline"
    print("  PASS: /predict functions identically without regression.")

    # 11. Verify /analyze still works (Regression Check)
    print("\n[TEST 11] Regression Check: /analyze endpoint...")
    with open(SUBPIPE_PBM_PATH, "rb") as f:
        files = {"file": (SUBPIPE_PBM_PATH.name, f, "application/octet-stream")}
        data = {"target": "pipeline"}
        resp_ana = requests.post(f"{BASE_URL}/analyze", files=files, data=data)
    assert resp_ana.status_code == 200
    assert resp_ana.json()["success"] is True
    assert "analysis" in resp_ana.json()
    print("  PASS: /analyze functions identically without regression.")

    # 12. Checkpoint Hashes Check
    print("\n[TEST 12] Model Checkpoint Hashes...")
    h1 = compute_sha256(settings.MODEL_1_PATH)
    h2 = compute_sha256(settings.MODEL_2_PATH)
    assert h1 == settings.MODEL_1_EXPECTED_SHA256, f"Model 1 hash mismatch: {h1}"
    assert h2 == settings.MODEL_2_EXPECTED_SHA256, f"Model 2 hash mismatch: {h2}"
    print(f"  Model 1 SHA256: {h1} (MATCH)")
    print(f"  Model 2 SHA256: {h2} (MATCH)")
    print("  PASS: Frozen checkpoint hashes verified.")

    print("\n==================================================")
    print("ALL PHASE 6 /segment TESTS COMPLETED SUCCESSFULLY!")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
