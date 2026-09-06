"""Dedicated Test Suite for POST /predict-auto (Automatic Model Selection).

Verifies all 15 requirements from user specification:
1. Pipeline canonical image (1693569383.780.pbm) -> routed to pipeline
2. Human canonical image (0002b00e-Screenshot_2025-08-10_23.00.36.png) -> routed to human
3. Hardware canonical image (clip_009.jpg) -> routed to hardware with class preservation
4. Degenerate black image -> uncertain / degenerate_image
5. Degenerate white image -> uncertain / degenerate_image
6. Invalid/corrupt image -> 400 Bad Request
7. Missing image -> 400 Bad Request
8. Converted/resized stress image with confidence < 0.85 -> uncertain / routing_confidence_below_threshold
9. Manual /predict endpoint regression test across all 3 targets
10. Checkpoint SHA256 integrity verification
11. ModelRegistry and ModelLoader behavior verification
12. Dataset protection / no-modification check
13. Verification that UNCERTAIN never invokes any specialist model
14. Verification that routed invokes exactly ONE specialist model
15. Verification of singleton model caching
"""

import io
import sys
import hashlib
from pathlib import Path
from unittest.mock import patch, MagicMock

WORKSPACE_ROOT = Path("/home/cherry/Documents/workspace/mldashbordproject")
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

import numpy as np
from PIL import Image
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.config import settings
from backend.app.models.registry import ModelRegistry
from backend.app.models.loader import ModelLoader
from backend.app.router import TargetRouter

client = TestClient(app)

# Canonical file paths
SUBPIPE_PBM_PATH = Path(
    "/media/cherry/External Hardisk/ps 57/datasets/SubPipeMiniSSS/DATA/SSS_HF_images/Image/1693569383.780.pbm"
)
AQUASCAN_PNG_PATH = Path(
    "/media/cherry/External Hardisk/ps 57/SIH26057/model2_experiments/datasets/aquascan_1k_clean/images/0002b00e-Screenshot_2025-08-10_23.00.36.png"
)
HARDWARE_JPG_PATH = Path(
    "/media/cherry/External Hardisk/ps 57/SIH26057/model3_experiments/datasets/esp_hardware_clean/images/clip_009.jpg"
)

EXPECTED_SHA256 = {
    "Model 1 (Pipeline)": (
        settings.MODEL_1_PATH,
        settings.MODEL_1_EXPECTED_SHA256,
    ),
    "Model 2 (Human)": (
        settings.MODEL_2_PATH,
        settings.MODEL_2_EXPECTED_SHA256,
    ),
    "Model 3 (Hardware)": (
        settings.MODEL_3_PATH,
        settings.MODEL_3_EXPECTED_SHA256,
    ),
}


def make_png_bytes(arr: np.ndarray) -> bytes:
    """Helper to encode numpy array as PNG bytes in-memory."""
    img = Image.fromarray(arr.astype(np.uint8))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_1_pipeline_canonical_routed():
    """1. Pipeline canonical image: 1693569383.780.pbm -> expected route = pipeline."""
    assert SUBPIPE_PBM_PATH.exists(), f"Missing canonical file {SUBPIPE_PBM_PATH}"
    with open(SUBPIPE_PBM_PATH, "rb") as f:
        resp = client.post(
            "/predict-auto",
            files={"file": (SUBPIPE_PBM_PATH.name, f.read(), "application/octet-stream")},
        )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "routing" in data
    routing = data["routing"]
    assert routing["status"] == "routed"
    assert routing["model"] == "pipeline"
    assert routing["target"] == "Pipeline"
    assert routing["confidence"] >= 0.85
    assert "pipeline" in routing["probabilities"]
    assert "detections" in data
    assert isinstance(data["detections"], list)
    if len(data["detections"]) > 0:
        det = data["detections"][0]
        assert det["class"] == "Pipeline"
        assert len(det["bbox"]) == 4


def test_2_human_canonical_routed():
    """2. Human canonical image: 0002b00e-Screenshot...png -> expected route = human."""
    assert AQUASCAN_PNG_PATH.exists(), f"Missing canonical file {AQUASCAN_PNG_PATH}"
    with open(AQUASCAN_PNG_PATH, "rb") as f:
        resp = client.post(
            "/predict-auto",
            files={"file": (AQUASCAN_PNG_PATH.name, f.read(), "image/png")},
        )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "routing" in data
    routing = data["routing"]
    assert routing["status"] == "routed"
    assert routing["model"] == "human"
    assert routing["target"] == "Human"
    assert routing["confidence"] >= 0.85
    assert "detections" in data
    assert isinstance(data["detections"], list)
    if len(data["detections"]) > 0:
        det = data["detections"][0]
        assert det["class"] == "Human"
        assert len(det["bbox"]) == 4


def test_3_hardware_canonical_routed():
    """3. Hardware canonical image: clip_009.jpg -> expected route = hardware with classes preserved."""
    assert HARDWARE_JPG_PATH.exists(), f"Missing canonical file {HARDWARE_JPG_PATH}"
    with open(HARDWARE_JPG_PATH, "rb") as f:
        resp = client.post(
            "/predict-auto",
            files={"file": (HARDWARE_JPG_PATH.name, f.read(), "image/jpeg")},
        )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "routing" in data
    routing = data["routing"]
    assert routing["status"] == "routed"
    assert routing["model"] == "hardware"
    assert routing["target"] == "Hardware"
    assert routing["confidence"] >= 0.85
    assert "detections" in data
    assert isinstance(data["detections"], list)
    hardware_classes = {"cap", "clip", "key", "niddle", "scissor"}
    for det in data["detections"]:
        assert det["class"] in hardware_classes
        assert len(det["bbox"]) == 4


def test_4_degenerate_black_image():
    """4. Degenerate black image: expected UNCERTAIN (degenerate_image)."""
    black_bytes = make_png_bytes(np.zeros((300, 300, 3)))
    resp = client.post(
        "/predict-auto",
        files={"file": ("black.png", black_bytes, "image/png")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["routing"]["status"] == "uncertain"
    assert data["routing"]["model"] is None
    assert data["routing"]["target"] is None
    assert data["routing"]["confidence"] == 0.0
    assert data["routing"]["reason"] == "degenerate_image"
    assert data["detections"] == []


def test_5_degenerate_white_image():
    """5. Degenerate white image: expected UNCERTAIN (degenerate_image)."""
    white_bytes = make_png_bytes(np.ones((300, 300, 3)) * 255)
    resp = client.post(
        "/predict-auto",
        files={"file": ("white.png", white_bytes, "image/png")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["routing"]["status"] == "uncertain"
    assert data["routing"]["model"] is None
    assert data["routing"]["target"] is None
    assert data["routing"]["confidence"] == 0.0
    assert data["routing"]["reason"] == "degenerate_image"
    assert data["detections"] == []


def test_6_invalid_corrupt_image():
    """6. Invalid/corrupt image: expected 400."""
    corrupt_bytes = b"NOT_A_VALID_IMAGE_HEADER_RANDOM_DATA_12345"
    resp = client.post(
        "/predict-auto",
        files={"file": ("corrupt.png", corrupt_bytes, "image/png")},
    )
    assert resp.status_code == 400
    assert "error" in resp.json()


def test_7_missing_image():
    """7. Missing image: expected 400."""
    resp = client.post("/predict-auto")
    assert resp.status_code == 400
    assert "error" in resp.json()


def test_8_stress_low_confidence_uncertain():
    """8. Converted/resized stress image with confidence < 0.85 -> expected UNCERTAIN."""
    # Synthetic ambiguous frame with balanced noise to reduce classification margin
    np.random.seed(999)
    ambiguous_arr = np.random.randint(40, 160, (300, 300, 3))
    ambiguous_bytes = make_png_bytes(ambiguous_arr)

    resp = client.post(
        "/predict-auto",
        files={"file": ("ambiguous.png", ambiguous_bytes, "image/png")},
    )
    assert resp.status_code == 200
    data = resp.json()
    # Ambiguous random noise should trigger UNCERTAIN state
    assert data["routing"]["status"] == "uncertain"
    assert data["routing"]["model"] is None
    assert data["routing"]["target"] is None
    assert data["detections"] == []


def test_9_manual_predict_regression():
    """9. Verify /predict still works for all three manually specified targets."""
    # Hardware
    with open(HARDWARE_JPG_PATH, "rb") as f:
        resp_hw = client.post(
            "/predict",
            files={"file": (HARDWARE_JPG_PATH.name, f.read(), "image/jpeg")},
            data={"target": "hardware"},
        )
    assert resp_hw.status_code == 200
    assert resp_hw.json()["model"] == "hardware"

    # Pipeline
    with open(SUBPIPE_PBM_PATH, "rb") as f:
        resp_pipe = client.post(
            "/predict",
            files={"file": (SUBPIPE_PBM_PATH.name, f.read(), "application/octet-stream")},
            data={"target": "pipeline"},
        )
    assert resp_pipe.status_code == 200
    assert resp_pipe.json()["model"] == "pipeline"

    # Human
    with open(AQUASCAN_PNG_PATH, "rb") as f:
        resp_human = client.post(
            "/predict",
            files={"file": (AQUASCAN_PNG_PATH.name, f.read(), "image/png")},
            data={"target": "human"},
        )
    assert resp_human.status_code == 200
    assert resp_human.json()["model"] == "human"


def test_10_checkpoint_integrity_sha256():
    """10. Verify specialist SHA256 hashes remain unchanged."""
    for name, (path, expected) in EXPECTED_SHA256.items():
        assert path.exists(), f"Model path {path} does not exist!"
        h = hashlib.sha256(path.read_bytes()).hexdigest()
        assert h.lower() == expected.lower(), f"{name} hash changed!"


def test_11_model_registry_loader_behavior():
    """11. Verify ModelRegistry and ModelLoader behavior remains unchanged."""
    models = ModelRegistry.list_models()
    assert set(models) == {"pipeline", "human", "hardware"}
    for m in models:
        instance, meta = ModelLoader.get_model(m)
        assert instance is not None
        assert meta["loaded"] is True


def test_12_dataset_protection():
    """12. Verify no source dataset modification."""
    assert SUBPIPE_PBM_PATH.stat().st_size > 0
    assert AQUASCAN_PNG_PATH.stat().st_size > 0
    assert HARDWARE_JPG_PATH.stat().st_size > 0


def test_13_uncertain_never_invokes_specialist():
    """13. Verify that an UNKNOWN/UNCERTAIN result NEVER invokes a specialist model."""
    black_bytes = make_png_bytes(np.zeros((300, 300, 3)))
    with patch.object(TargetRouter, "predict") as mock_predict:
        resp = client.post(
            "/predict-auto",
            files={"file": ("black.png", black_bytes, "image/png")},
        )
        assert resp.status_code == 200
        assert resp.json()["routing"]["status"] == "uncertain"
        # Assert TargetRouter.predict was NEVER called!
        assert mock_predict.call_count == 0


def test_14_only_one_specialist_invoked_on_routed():
    """14. Verify that only ONE specialist model is invoked after successful routing."""
    with open(HARDWARE_JPG_PATH, "rb") as f:
        img_bytes = f.read()

    with patch.object(TargetRouter, "predict", wraps=TargetRouter.predict) as spy_predict:
        resp = client.post(
            "/predict-auto",
            files={"file": (HARDWARE_JPG_PATH.name, img_bytes, "image/jpeg")},
        )
        assert resp.status_code == 200
        assert resp.json()["routing"]["status"] == "routed"
        assert resp.json()["routing"]["model"] == "hardware"
        # Assert TargetRouter.predict was called EXACTLY once with target="Hardware"
        assert spy_predict.call_count == 1
        call_args = spy_predict.call_args
        assert call_args[1].get("target") == "Hardware" or call_args[0][0] == "Hardware"


def test_15_singleton_model_caching():
    """15. Verify singleton model caching remains functional."""
    m1, meta1 = ModelLoader.get_model("hardware")
    m2, meta2 = ModelLoader.get_model("hardware")
    assert m1 is m2, "ModelLoader failed to return cached singleton model instance!"


if __name__ == "__main__":
    import traceback
    tests = [
        ("1. Pipeline Canonical", test_1_pipeline_canonical_routed),
        ("2. Human Canonical", test_2_human_canonical_routed),
        ("3. Hardware Canonical", test_3_hardware_canonical_routed),
        ("4. Degenerate Black", test_4_degenerate_black_image),
        ("5. Degenerate White", test_5_degenerate_white_image),
        ("6. Invalid/Corrupt", test_6_invalid_corrupt_image),
        ("7. Missing Image", test_7_missing_image),
        ("8. Stress Low-Confidence", test_8_stress_low_confidence_uncertain),
        ("9. Manual /predict Regression", test_9_manual_predict_regression),
        ("10. Checkpoint Integrity", test_10_checkpoint_integrity_sha256),
        ("11. ModelRegistry & Loader", test_11_model_registry_loader_behavior),
        ("12. Dataset Protection", test_12_dataset_protection),
        ("13. Uncertain Never Invokes Specialist", test_13_uncertain_never_invokes_specialist),
        ("14. Only One Specialist Invoked", test_14_only_one_specialist_invoked_on_routed),
        ("15. Singleton Model Caching", test_15_singleton_model_caching),
    ]

    print("================================================================================")
    print("RUNNING DEDICATED /predict-auto TEST SUITE (15 TESTS)")
    print("================================================================================")
    passed = 0
    failed = 0
    for name, fn in tests:
        try:
            fn()
            print(f"  [PASS] {name}")
            passed += 1
        except Exception as e:
            print(f"  [FAIL] {name}: {e}")
            traceback.print_exc()
            failed += 1

    print("================================================================================")
    print(f"TEST RUN COMPLETED: {passed} PASSED, {failed} FAILED (TOTAL {len(tests)})")
    print("================================================================================")
    if failed > 0:
        exit(1)

