"""Target-Aware Router Verification and Integrity Test Suite."""

import hashlib
import json
import sys
from pathlib import Path

from backend.app.config import settings
from backend.app.models.loader import ModelLoader, compute_sha256
from backend.app.router import (
    SUPPORTED_TARGETS,
    TargetRouter,
    UnsupportedTargetError,
    normalize_target,
)


def run_tests():
    print("==================================================")
    print("RUNNING TARGET-AWARE ROUTER TEST SUITE")
    print("==================================================")

    # 1. Test Valid Targets (Case Variants & Whitespace)
    valid_pipeline_cases = ["pipeline", "Pipeline", "PIPELINE", "  pipeline  ", "  PIPELINE\n"]
    valid_human_cases = ["human", "Human", "HUMAN", "  human  ", "  HUMAN\t"]

    print("\n[1] Testing Valid Pipeline Targets...")
    for target in valid_pipeline_cases:
        res = TargetRouter.route(target, load_model=True)
        assert res["target"] == "pipeline", f"Expected target 'pipeline', got {res['target']}"
        assert res["model"] == "model1", f"Expected model 'model1', got {res['model']}"
        assert res["model_role"] == "Pipeline Detection Model"
        assert res["class_name"] == "Pipeline"
        assert res["class_id"] == 0
        assert res["model_instance"] is not None
        # Verify Model 1 is NOT Model 2
        assert res["model"] != "model2", "Pipeline must NEVER route to Model 2!"
        print(f"  PASS: '{target}' -> {res['model']} ({res['model_role']} -> {res['class_name']})")

    print("\n[2] Testing Valid Human Targets...")
    for target in valid_human_cases:
        res = TargetRouter.route(target, load_model=True)
        assert res["target"] == "human", f"Expected target 'human', got {res['target']}"
        assert res["model"] == "model2", f"Expected model 'model2', got {res['model']}"
        assert res["model_role"] == "Human Detection Model"
        assert res["class_name"] == "Human"
        assert res["class_id"] == 0
        assert res["model_instance"] is not None
        # Verify Model 2 is NOT Model 1
        assert res["model"] != "model1", "Human must NEVER route to Model 1!"
        print(f"  PASS: '{target}' -> {res['model']} ({res['model_role']} -> {res['class_name']})")

    # 2. Test Invalid Targets
    invalid_cases = [
        "ship",
        "airplane",
        "fishing_net",
        "fishing-net",
        "crab_pot",
        "crab-pot",
        "object",
        "unknown",
        "banana",
        "",
        "   ",
        None,
        "pipe",
        "person",
        "pipeline_detection",
        "human_detection",
        123,
    ]

    print("\n[3] Testing Rejection of Invalid / Unsupported Targets...")
    for invalid in invalid_cases:
        try:
            TargetRouter.route(invalid, load_model=False)
            raise AssertionError(f"Router accepted invalid target: {invalid!r}")
        except UnsupportedTargetError as e:
            err_dict = e.to_dict()
            assert err_dict["error"] == "Unsupported detection target"
            assert err_dict["requested_target"] == invalid
            assert err_dict["supported_targets"] == ["pipeline", "human"]
            print(f"  PASS: Rejected {invalid!r} -> Error: {err_dict['error']}")

    # 3. Verify Semantic Separation
    print("\n[4] Verifying Semantic Separation...")
    m1_res = TargetRouter.route("pipeline", load_model=False)
    m2_res = TargetRouter.route("human", load_model=False)
    assert m1_res["class_name"] != m2_res["class_name"]
    assert m1_res["model"] != m2_res["model"]
    print(f"  PASS: Model 1 class 0 ('{m1_res['class_name']}') != Model 2 class 0 ('{m2_res['class_name']}')")

    # 4. Checkpoint Integrity & Hash Verification
    print("\n[5] Verifying Checkpoint SHA256 Hashes (Frozen Check)...")
    m1_hash = compute_sha256(settings.MODEL_1_PATH)
    m2_hash = compute_sha256(settings.MODEL_2_PATH)

    print(f"  Model 1 current SHA256: {m1_hash}")
    print(f"  Model 1 expected SHA256: {settings.MODEL_1_EXPECTED_SHA256}")
    assert m1_hash == settings.MODEL_1_EXPECTED_SHA256, "MODEL 1 SHA256 MISMATCH!"
    print("  PASS: Model 1 hash matches frozen checkpoint.")

    print(f"  Model 2 current SHA256: {m2_hash}")
    print(f"  Model 2 expected SHA256: {settings.MODEL_2_EXPECTED_SHA256}")
    assert m2_hash == settings.MODEL_2_EXPECTED_SHA256, "MODEL 2 SHA256 MISMATCH!"
    print("  PASS: Model 2 hash matches frozen checkpoint.")

    print("\n==================================================")
    print("ALL TESTS PASSED SUCCESSFULLY!")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
