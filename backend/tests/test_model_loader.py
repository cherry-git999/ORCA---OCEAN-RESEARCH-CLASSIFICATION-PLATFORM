"""Comprehensive test suite for Backend Model Loader (Step 1).

Verifies loading, singleton caching, integrity checksums, class semantics,
and error handling for Model 1 (Pipeline), Model 2 (Human), and Model 3 (Hardware).
"""

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.app.config import settings
from backend.app.models.loader import ModelLoader, compute_sha256


def run_tests():
    print("================================================================================")
    print("STARTING BACKEND MODEL LOADER INTEGRITY & FUNCTIONALITY TESTS")
    print("================================================================================")

    # Clear cache before starting
    ModelLoader.clear_cache()

    # -------------------------------------------------------------------------
    # TEST 1: Model 1 (Pipeline Specialist) Loading & Semantics
    # -------------------------------------------------------------------------
    print("\n[TEST 1] Loading Model 1 (Pipeline Specialist)...")
    assert settings.MODEL_1_PATH.exists(), f"Model 1 path missing: {settings.MODEL_1_PATH}"
    m1, meta1 = ModelLoader.load_model1(verify_hash=True)
    assert m1 is not None
    assert meta1["loaded"] is True
    assert meta1["key"] == "pipeline"
    assert meta1["name"] == settings.MODEL_1_NAME
    assert meta1["role"] == "Pipeline Specialist"
    assert meta1["model_role"] == "Pipeline Detection Model"
    assert meta1["num_classes"] == 1
    assert meta1["classes"] == {0: "Pipeline"}
    assert meta1["semantic_class_map"] == {0: "Pipeline"}
    assert meta1["sha256"] == settings.MODEL_1_EXPECTED_SHA256
    assert meta1["sha256_verified"] is True
    print(f"  PASS: Model 1 loaded successfully. Classes: {meta1['classes']}, SHA256: {meta1['sha256']}")

    # -------------------------------------------------------------------------
    # TEST 2: Model 2 (Human Specialist) Loading & Semantics
    # -------------------------------------------------------------------------
    print("\n[TEST 2] Loading Model 2 (Human Specialist)...")
    assert settings.MODEL_2_PATH.exists(), f"Model 2 path missing: {settings.MODEL_2_PATH}"
    m2, meta2 = ModelLoader.load_model2(verify_hash=True)
    assert m2 is not None
    assert meta2["loaded"] is True
    assert meta2["key"] == "human"
    assert meta2["name"] == settings.MODEL_2_NAME
    assert meta2["role"] == "Human Specialist"
    assert meta2["model_role"] == "Human Detection Model"
    assert meta2["num_classes"] == 1
    assert meta2["classes"] == {0: "Human"}
    assert meta2["semantic_class_map"] == {0: "Human"}
    assert meta2["sha256"] == settings.MODEL_2_EXPECTED_SHA256
    assert meta2["sha256_verified"] is True
    print(f"  PASS: Model 2 loaded successfully. Classes: {meta2['classes']}, SHA256: {meta2['sha256']}")

    # -------------------------------------------------------------------------
    # TEST 3: Model 3 (Hardware Specialist) Loading & Semantics
    # -------------------------------------------------------------------------
    print("\n[TEST 3] Loading Model 3 (Hardware Specialist)...")
    assert settings.MODEL_3_PATH.exists(), f"Model 3 path missing: {settings.MODEL_3_PATH}"
    m3, meta3 = ModelLoader.load_model3(verify_hash=True)
    assert m3 is not None
    assert meta3["loaded"] is True
    assert meta3["key"] == "hardware"
    assert meta3["name"] == settings.MODEL_3_NAME
    assert meta3["role"] == "Hardware Specialist"
    assert meta3["model_role"] == "Hardware Detection Model"
    assert meta3["num_classes"] == 5
    expected_m3_classes = {0: "cap", 1: "clip", 2: "key", 3: "niddle", 4: "scissor"}
    assert meta3["classes"] == expected_m3_classes
    assert meta3["semantic_class_map"] == expected_m3_classes
    assert meta3["sha256"] == settings.MODEL_3_EXPECTED_SHA256
    assert meta3["sha256_verified"] is True
    print(f"  PASS: Model 3 loaded successfully. Classes: {meta3['classes']}, SHA256: {meta3['sha256']}")

    # -------------------------------------------------------------------------
    # TEST 4: Unified Registry Interface (get_model)
    # -------------------------------------------------------------------------
    print("\n[TEST 4] Testing Registry Interface (ModelLoader.get_model)...")
    inst_pipe, _ = ModelLoader.get_model("pipeline")
    inst_pipe_alias, _ = ModelLoader.get_model("model1")
    assert inst_pipe is m1
    assert inst_pipe_alias is m1

    inst_human, _ = ModelLoader.get_model("human")
    inst_human_alias, _ = ModelLoader.get_model("model2")
    assert inst_human is m2
    assert inst_human_alias is m2

    inst_hw, _ = ModelLoader.get_model("hardware")
    inst_hw_alias, _ = ModelLoader.get_model("model3")
    assert inst_hw is m3
    assert inst_hw_alias is m3

    # Unknown model identifier rejection
    try:
        ModelLoader.get_model("unknown_specialist")
        raise AssertionError("Expected KeyError for unknown model identifier!")
    except KeyError as e:
        print(f"  PASS: Correctly rejected unknown model identifier: {e}")

    print("  PASS: Registry lookup works identically for canonical names and aliases.")

    # -------------------------------------------------------------------------
    # TEST 5: Caching & Singleton Behavior (No redundant loading)
    # -------------------------------------------------------------------------
    print("\n[TEST 5] Testing Singleton Caching Behavior...")
    m1_again, _ = ModelLoader.load_model1()
    m2_again, _ = ModelLoader.load_model2()
    m3_again, _ = ModelLoader.load_model3()

    assert m1_again is m1, "Model 1 was re-instantiated instead of using cached instance!"
    assert m2_again is m2, "Model 2 was re-instantiated instead of using cached instance!"
    assert m3_again is m3, "Model 3 was re-instantiated instead of using cached instance!"
    assert ModelLoader.is_loaded("pipeline") is True
    assert ModelLoader.is_loaded("human") is True
    assert ModelLoader.is_loaded("hardware") is True
    print("  PASS: Singleton caching confirmed. Identical memory instances returned.")

    # -------------------------------------------------------------------------
    # TEST 6: Missing Checkpoint Handling
    # -------------------------------------------------------------------------
    print("\n[TEST 6] Testing Missing Checkpoint Error Handling...")
    non_existent_path = REPO_ROOT / "models" / "non_existent_model_checkpoint.pt"
    try:
        compute_sha256(non_existent_path)
        raise AssertionError("Expected FileNotFoundError for non-existent file!")
    except FileNotFoundError as e:
        print(f"  PASS: Clear FileNotFoundError raised: {e}")

    # -------------------------------------------------------------------------
    # TEST 7: Semantic Class Isolation
    # -------------------------------------------------------------------------
    print("\n[TEST 7] Testing Semantic Class Isolation...")
    # Model 1 class 0 = 'Pipeline'
    # Model 2 class 0 = 'Human'
    # Model 3 class 0 = 'cap'
    assert meta1["classes"][0] == "Pipeline"
    assert meta2["classes"][0] == "Human"
    assert meta3["classes"][0] == "cap"
    assert meta1["classes"][0] != meta2["classes"][0]
    assert meta1["classes"][0] != meta3["classes"][0]
    assert meta2["classes"][0] != meta3["classes"][0]
    print("  PASS: Confirmed class 0 has strictly separate semantic meaning across all 3 models.")

    # -------------------------------------------------------------------------
    # TEST 8: Full System Verification Report (verify_all_models)
    # -------------------------------------------------------------------------
    print("\n[TEST 8] Running ModelLoader.verify_all_models()...")
    verification = ModelLoader.verify_all_models()
    assert verification["all_models_verified"] is True
    assert verification["semantic_separation_verified"] is True
    print("  Verification summary:")
    print(json.dumps({k: v for k, v in verification.items() if not k.startswith("model")}, indent=2))

    # -------------------------------------------------------------------------
    # TEST 9: SHA256 Checkpoint Verification
    # -------------------------------------------------------------------------
    print("\n[TEST 9] Verifying Checkpoint Hashes against Frozen Expectations...")
    h1 = compute_sha256(settings.MODEL_1_PATH)
    h2 = compute_sha256(settings.MODEL_2_PATH)
    h3 = compute_sha256(settings.MODEL_3_PATH)

    assert h1 == settings.MODEL_1_EXPECTED_SHA256, f"Model 1 hash mismatch! Got: {h1}"
    assert h2 == settings.MODEL_2_EXPECTED_SHA256, f"Model 2 hash mismatch! Got: {h2}"
    assert h3 == settings.MODEL_3_EXPECTED_SHA256, f"Model 3 hash mismatch! Got: {h3}"

    print(f"  Model 1 SHA256: {h1} (MATCH)")
    print(f"  Model 2 SHA256: {h2} (MATCH)")
    print(f"  Model 3 SHA256: {h3} (MATCH)")

    print("\n================================================================================")
    print("ALL BACKEND MODEL LOADER TESTS COMPLETED SUCCESSFULLY!")
    print("================================================================================")


if __name__ == "__main__":
    run_tests()
