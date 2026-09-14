"""Target-Aware Router Verification and Integrity Test Suite (Step 3).

Verifies target normalization, specialist model selection, ModelRegistry and ModelLoader integration,
singleton caching, semantic class preservation, standardized responses, zero-detection handling,
real inference smoke tests across all 3 domains, and checkpoint hash protection.
"""

import hashlib
import io
import json
import sys
from pathlib import Path
from typing import Any, Dict, List
import numpy as np
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.app.config import settings
from backend.app.models.loader import ModelLoader, compute_sha256
from backend.app.models.registry import ModelConfig, ModelRegistry
from backend.app.router import (
    SUPPORTED_TARGETS,
    TargetRouter,
    UnsupportedTargetError,
    normalize_target,
)

# Repository-local sample image paths
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SAMPLE_DATA_DIR = REPO_ROOT / "frontend" / "sample_data"
SUBPIPE_PBM_PATH = SAMPLE_DATA_DIR / "1693569383.780.pbm"
AQUASCAN_PNG_PATH = SAMPLE_DATA_DIR / "0a2be3cd-Screenshot_2025-08-03_14.26.49.png"
HARDWARE_JPG_PATH = SAMPLE_DATA_DIR / "cap_001.jpg"


def create_in_memory_blank_image() -> Image.Image:
    """Create a 640x640 blank black image in memory for deterministic zero-detection testing."""
    return Image.new("RGB", (640, 640), color="black")


def run_tests():
    print("================================================================================")
    print("STARTING STEP 3 — TARGET-AWARE MODEL ROUTER TEST SUITE")
    print("================================================================================")

    # -------------------------------------------------------------------------
    # TEST 1: Pipeline target selects Pipeline model
    # -------------------------------------------------------------------------
    print("\n[TEST 1] Verifying 'pipeline' target selects Pipeline Specialist...")
    route_pipe = TargetRouter.route("pipeline", load_model=True)
    assert route_pipe["target"] == "pipeline"
    assert route_pipe["model_key"] == "pipeline"
    assert route_pipe["model_name"] == "YOLOv8n Pipeline Detection Model"
    assert route_pipe["specialist_role"] == "pipeline"
    assert route_pipe["model_instance"] is not None
    assert route_pipe["model_key"] != "human"
    assert route_pipe["model_key"] != "hardware"
    print(f"  PASS: 'pipeline' -> {route_pipe['model_name']} ({route_pipe['model_key']})")

    # -------------------------------------------------------------------------
    # TEST 2: Human target selects Human model
    # -------------------------------------------------------------------------
    print("\n[TEST 2] Verifying 'human' target selects Human Specialist...")
    route_human = TargetRouter.route("human", load_model=True)
    assert route_human["target"] == "human"
    assert route_human["model_key"] == "human"
    assert route_human["model_name"] == "YOLOv8n Human Detection Model"
    assert route_human["specialist_role"] == "human"
    assert route_human["model_instance"] is not None
    assert route_human["model_key"] != "pipeline"
    assert route_human["model_key"] != "hardware"
    print(f"  PASS: 'human' -> {route_human['model_name']} ({route_human['model_key']})")

    # -------------------------------------------------------------------------
    # TEST 3: Hardware target selects Hardware model
    # -------------------------------------------------------------------------
    print("\n[TEST 3] Verifying 'hardware' target selects Hardware Specialist...")
    route_hw = TargetRouter.route("hardware", load_model=True)
    assert route_hw["target"] == "hardware"
    assert route_hw["model_key"] == "hardware"
    assert route_hw["model_name"] == "YOLOv8n Hardware Detection Model"
    assert route_hw["specialist_role"] == "hardware"
    assert route_hw["model_instance"] is not None
    assert route_hw["model_key"] != "pipeline"
    assert route_hw["model_key"] != "human"
    print(f"  PASS: 'hardware' -> {route_hw['model_name']} ({route_hw['model_key']})")

    # -------------------------------------------------------------------------
    # TEST 4: Case-insensitive target normalization & whitespace trimming
    # -------------------------------------------------------------------------
    print("\n[TEST 4] Testing Case-Insensitive Target Normalization...")
    norm_cases = [
        ("pipeline", "pipeline"),
        ("Pipeline", "pipeline"),
        ("PIPELINE", "pipeline"),
        ("  pipeline  ", "pipeline"),
        ("  PIPELINE\n", "pipeline"),
        ("human", "human"),
        ("Human", "human"),
        ("HUMAN", "human"),
        ("  human  ", "human"),
        ("  HUMAN\t", "human"),
        ("hardware", "hardware"),
        ("Hardware", "hardware"),
        ("HARDWARE", "hardware"),
        ("  hardware  ", "hardware"),
        ("  HARDWARE\n", "hardware"),
    ]
    for raw_target, expected_norm in norm_cases:
        actual_norm = normalize_target(raw_target)
        assert actual_norm == expected_norm, f"Failed normalization: {raw_target!r} -> {actual_norm}"
        routed = TargetRouter.route(raw_target, load_model=False)
        assert routed["model_key"] == expected_norm
        print(f"  PASS: {raw_target!r} -> '{actual_norm}' -> {routed['model_key']}")

    # -------------------------------------------------------------------------
    # TEST 5: Invalid / Unsupported target rejection
    # -------------------------------------------------------------------------
    print("\n[TEST 5] Testing Rejection of Invalid / Unsupported Targets...")
    invalid_cases = [
        "banana",
        "ship",
        "airplane",
        "fishing_net",
        "crab_pot",
        "unknown",
        "submarine",
        "",
        "   ",
        None,
        123,
        ["pipeline"],
        {"target": "human"},
    ]
    for invalid in invalid_cases:
        try:
            TargetRouter.route(invalid, load_model=False)
            raise AssertionError(f"Router accepted invalid target: {invalid!r}")
        except UnsupportedTargetError as e:
            err_dict = e.to_dict()
            assert err_dict["error"] == "Unsupported detection target"
            assert err_dict["requested_target"] == invalid
            assert set(err_dict["supported_targets"]) == {"pipeline", "human", "hardware"}
            print(f"  PASS: Correctly rejected {invalid!r} with UnsupportedTargetError")

    # -------------------------------------------------------------------------
    # TEST 6: Router uses existing ModelRegistry
    # -------------------------------------------------------------------------
    print("\n[TEST 6] Verifying Router uses ModelRegistry Single Source of Truth...")
    for key in ["pipeline", "human", "hardware"]:
        reg_cfg = ModelRegistry.get_model_config(key)
        routed = TargetRouter.route(key, load_model=False)
        assert routed["model_key"] == reg_cfg.key
        assert routed["target_title"] == reg_cfg.target
        assert routed["model_name"] == reg_cfg.name
        assert routed["model_role"] == reg_cfg.model_role
        assert routed["classes"] == reg_cfg.semantic_class_map
    print("  PASS: Router metadata strictly matches ModelRegistry for all models.")

    # -------------------------------------------------------------------------
    # TEST 7: Router uses existing ModelLoader
    # -------------------------------------------------------------------------
    print("\n[TEST 7] Verifying Router integrates with ModelLoader...")
    for key in ["pipeline", "human", "hardware"]:
        routed = TargetRouter.route(key, load_model=True)
        loader_instance, loader_meta = ModelLoader.get_model(key)
        assert routed["model_instance"] is loader_instance
        assert routed["metadata"] == loader_meta
        assert routed["metadata"]["sha256_verified"] is True
    print("  PASS: Router retrieves model instances directly from ModelLoader.")

    # -------------------------------------------------------------------------
    # TEST 8: Singleton Caching (No redundant instantiation)
    # -------------------------------------------------------------------------
    print("\n[TEST 8] Verifying Singleton Caching Behavior...")
    r1 = TargetRouter.route("hardware", load_model=True)
    r2 = TargetRouter.route("Hardware", load_model=True)
    r3 = TargetRouter.route("HARDWARE", load_model=True)
    assert r1["model_instance"] is r2["model_instance"], "Duplicate instance created on case-variant!"
    assert r2["model_instance"] is r3["model_instance"], "Duplicate instance created on uppercase!"
    print("  PASS: Identical memory instance returned across multiple routing calls.")

    # -------------------------------------------------------------------------
    # TEST 9: Pipeline Semantic Class Preservation
    # -------------------------------------------------------------------------
    print("\n[TEST 9] Verifying Pipeline Semantic Class Mapping...")
    r_pipe = TargetRouter.route("pipeline", load_model=False)
    assert r_pipe["class_id"] == 0
    assert r_pipe["class_name"] == "Pipeline"
    assert r_pipe["classes"] == {0: "Pipeline"}
    print(f"  PASS: Pipeline classes verified: {r_pipe['classes']}")

    # -------------------------------------------------------------------------
    # TEST 10: Human Semantic Class Preservation
    # -------------------------------------------------------------------------
    print("\n[TEST 10] Verifying Human Semantic Class Mapping...")
    r_human = TargetRouter.route("human", load_model=False)
    assert r_human["class_id"] == 0
    assert r_human["class_name"] == "Human"
    assert r_human["classes"] == {0: "Human"}
    print(f"  PASS: Human classes verified: {r_human['classes']}")

    # -------------------------------------------------------------------------
    # TEST 11: Hardware Semantic Class Preservation (0..4)
    # -------------------------------------------------------------------------
    print("\n[TEST 11] Verifying Hardware Semantic Class Mapping...")
    r_hw = TargetRouter.route("hardware", load_model=False)
    expected_hw = {
        0: "cap",
        1: "clip",
        2: "key",
        3: "niddle",
        4: "scissor",
    }
    assert r_hw["classes"] == expected_hw
    # Ensure Class 0 isolation
    assert r_pipe["classes"][0] == "Pipeline"
    assert r_human["classes"][0] == "Human"
    assert r_hw["classes"][0] == "cap"
    assert r_pipe["classes"][0] != r_human["classes"][0] != r_hw["classes"][0]
    print(f"  PASS: Hardware classes verified: {r_hw['classes']}")
    print("  PASS: Class 0 isolation confirmed (Pipeline != Human != cap).")

    # -------------------------------------------------------------------------
    # TEST 12: Zero-Detection Case
    # -------------------------------------------------------------------------
    print("\n[TEST 12] Testing Zero-Detection Handling (Black Image)...")
    blank_img = create_in_memory_blank_image()
    for target in ["pipeline", "human", "hardware"]:
        resp = TargetRouter.predict(target, blank_img)
        assert "model_key" in resp
        assert "target" in resp
        assert "detections" in resp
        assert isinstance(resp["detections"], list)
        assert len(resp["detections"]) == 0
        assert resp["detections"] == []
        print(f"  PASS: Zero-detection on '{target}' -> detections: [] (No error)")

    # -------------------------------------------------------------------------
    # TEST 13: Standardized Response Schema
    # -------------------------------------------------------------------------
    print("\n[TEST 13] Verifying Standardized Response Schema...")
    blank_img = create_in_memory_blank_image()
    schema_pipe = TargetRouter.predict("pipeline", blank_img)
    assert schema_pipe["model_key"] == "pipeline"
    assert schema_pipe["target"] == "Pipeline"
    assert schema_pipe["detections"] == []

    schema_human = TargetRouter.predict("human", blank_img)
    assert schema_human["model_key"] == "human"
    assert schema_human["target"] == "Human"
    assert schema_human["detections"] == []

    schema_hw = TargetRouter.predict("hardware", blank_img)
    assert schema_hw["model_key"] == "hardware"
    assert schema_hw["target"] == "Hardware"
    assert schema_hw["detections"] == []
    print("  PASS: Standardized response schema verified for all 3 specialist models.")

    # -------------------------------------------------------------------------
    # REAL INFERENCE SMOKE TESTS (1 Real Sample Image per Domain)
    # -------------------------------------------------------------------------
    print("\n[REAL INFERENCE SMOKE TESTS] Testing Real Sonar Inferences...")

    # 1. Pipeline: SubPipe .pbm image
    print("  Running Real Pipeline Inference (SubPipe .pbm)...")
    assert SUBPIPE_PBM_PATH.exists(), f"Missing file: {SUBPIPE_PBM_PATH}"
    res_pipe = TargetRouter.predict("pipeline", SUBPIPE_PBM_PATH)
    assert res_pipe["model_key"] == "pipeline"
    assert res_pipe["target"] == "Pipeline"
    assert len(res_pipe["detections"]) >= 1
    det_pipe = res_pipe["detections"][0]
    assert det_pipe["class_id"] == 0
    assert det_pipe["class_name"] == "Pipeline"
    assert 0.0 <= det_pipe["confidence"] <= 1.0
    assert "bbox" in det_pipe and {"x1", "y1", "x2", "y2"}.issubset(det_pipe["bbox"].keys())
    print(f"    PASS: Pipeline Detection -> Class: {det_pipe['class_name']} ({det_pipe['class_id']}), Conf: {det_pipe['confidence']}, BBox: {det_pipe['bbox']}")

    # 2. Human: AquaScan .png image
    print("  Running Real Human Inference (AquaScan .png)...")
    assert AQUASCAN_PNG_PATH.exists(), f"Missing file: {AQUASCAN_PNG_PATH}"
    res_human = TargetRouter.predict("human", AQUASCAN_PNG_PATH)
    assert res_human["model_key"] == "human"
    assert res_human["target"] == "Human"
    assert len(res_human["detections"]) >= 1
    det_human = res_human["detections"][0]
    assert det_human["class_id"] == 0
    assert det_human["class_name"] == "Human"
    assert 0.0 <= det_human["confidence"] <= 1.0
    assert "bbox" in det_human and {"x1", "y1", "x2", "y2"}.issubset(det_human["bbox"].keys())
    print(f"    PASS: Human Detection -> Class: {det_human['class_name']} ({det_human['class_id']}), Conf: {det_human['confidence']}, BBox: {det_human['bbox']}")

    # 3. Hardware: ESP Hardware .jpg image
    print("  Running Real Hardware Inference (ESP Hardware .jpg)...")
    assert HARDWARE_JPG_PATH.exists(), f"Missing file: {HARDWARE_JPG_PATH}"
    res_hw = TargetRouter.predict("hardware", HARDWARE_JPG_PATH)
    assert res_hw["model_key"] == "hardware"
    assert res_hw["target"] == "Hardware"
    assert len(res_hw["detections"]) >= 1
    det_hw = res_hw["detections"][0]
    assert det_hw["class_name"] in ["cap", "clip", "key", "niddle", "scissor"]
    assert det_hw["class_id"] in [0, 1, 2, 3, 4]
    assert 0.0 <= det_hw["confidence"] <= 1.0
    assert "bbox" in det_hw and {"x1", "y1", "x2", "y2"}.issubset(det_hw["bbox"].keys())
    print(f"    PASS: Hardware Detection -> Class: {det_hw['class_name']} ({det_hw['class_id']}), Conf: {det_hw['confidence']}, BBox: {det_hw['bbox']}")

    # -------------------------------------------------------------------------
    # CHECKPOINT SHA256 INTEGRITY VERIFICATION (Frozen Check)
    # -------------------------------------------------------------------------
    print("\n[CHECKPOINT PROTECTION] Verifying Checkpoint SHA256 Hashes...")
    h1 = compute_sha256(settings.MODEL_1_PATH)
    h2 = compute_sha256(settings.MODEL_2_PATH)
    h3 = compute_sha256(settings.MODEL_3_PATH)

    assert h1 == settings.MODEL_1_EXPECTED_SHA256, f"Model 1 hash mismatch! Got: {h1}"
    assert h2 == settings.MODEL_2_EXPECTED_SHA256, f"Model 2 hash mismatch! Got: {h2}"
    assert h3 == settings.MODEL_3_EXPECTED_SHA256, f"Model 3 hash mismatch! Got: {h3}"

    print(f"  Model 1 SHA256: {h1} (FROZEN UNCHANGED)")
    print(f"  Model 2 SHA256: {h2} (FROZEN UNCHANGED)")
    print(f"  Model 3 SHA256: {h3} (FROZEN UNCHANGED)")

    print("\n================================================================================")
    print("ALL STEP 3 TARGET-AWARE ROUTER TESTS PASSED SUCCESSFULLY!")
    print("================================================================================")


if __name__ == "__main__":
    run_tests()
