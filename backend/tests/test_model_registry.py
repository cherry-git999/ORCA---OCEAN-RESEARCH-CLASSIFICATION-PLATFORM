"""Comprehensive test suite for Step 2: Centralized Model Registry.

Verifies canonical model definitions, immutability, semantic class isolation,
metadata retrieval APIs, and checkpoint SHA256 integrity.
"""

from pathlib import Path
from backend.app.models.loader import compute_sha256
from backend.app.models.registry import CANONICAL_MODEL_KEYS, ModelConfig, ModelRegistry


def run_tests():
    print("================================================================================")
    print("STARTING STEP 2 — CENTRALIZED MODEL REGISTRY TESTS")
    print("================================================================================")

    # -------------------------------------------------------------------------
    # TEST 1: Exactly 3 Canonical Models Exist
    # -------------------------------------------------------------------------
    print("\n[TEST 1] Verifying Canonical Registered Models...")
    models = ModelRegistry.list_models()
    assert models == ["pipeline", "human", "hardware"], f"Unexpected model list: {models}"
    assert len(models) == 3
    assert ModelRegistry.has_model("pipeline") is True
    assert ModelRegistry.has_model("human") is True
    assert ModelRegistry.has_model("hardware") is True
    assert ModelRegistry.has_model("non_existent_key") is False
    print(f"  PASS: Exactly 3 canonical models exist: {models}")

    # -------------------------------------------------------------------------
    # TEST 2: Model 1 (Pipeline) Registry Metadata
    # -------------------------------------------------------------------------
    print("\n[TEST 2] Verifying Pipeline Specialist Registry Config...")
    cfg1 = ModelRegistry.get_model_config("pipeline")
    assert cfg1.key == "pipeline"
    assert cfg1.role == "Pipeline Specialist"
    assert cfg1.specialist_role == "pipeline"
    assert cfg1.target == "Pipeline"
    assert cfg1.frozen is True
    assert cfg1.expected_sha256 == "99470f62a4709848ec8a27b13f2925f09aaba292dccfaff440b7ec290cc011d3"
    assert cfg1.semantic_class_map == {0: "Pipeline"}
    assert cfg1.checkpoint_path.exists(), f"Model 1 path missing: {cfg1.checkpoint_path}"
    print("  PASS: Pipeline specialist metadata verified.")

    # -------------------------------------------------------------------------
    # TEST 3: Model 2 (Human) Registry Metadata
    # -------------------------------------------------------------------------
    print("\n[TEST 3] Verifying Human Specialist Registry Config...")
    cfg2 = ModelRegistry.get_model_config("human")
    assert cfg2.key == "human"
    assert cfg2.role == "Human Specialist"
    assert cfg2.specialist_role == "human"
    assert cfg2.target == "Human"
    assert cfg2.frozen is True
    assert cfg2.expected_sha256 == "53e2c3ac2013cb0f35dd0e276c650ffa419198ece762c5a1e2e79e39f5cfed35"
    assert cfg2.semantic_class_map == {0: "Human"}
    assert cfg2.checkpoint_path.exists(), f"Model 2 path missing: {cfg2.checkpoint_path}"
    print("  PASS: Human specialist metadata verified.")

    # -------------------------------------------------------------------------
    # TEST 4: Model 3 (Hardware) Registry Metadata
    # -------------------------------------------------------------------------
    print("\n[TEST 4] Verifying Hardware Specialist Registry Config...")
    cfg3 = ModelRegistry.get_model_config("hardware")
    assert cfg3.key == "hardware"
    assert cfg3.role == "Hardware Specialist"
    assert cfg3.specialist_role == "hardware"
    assert cfg3.target == "Hardware"
    assert cfg3.frozen is True
    assert cfg3.expected_sha256 == "1cb3f14132c5c1eb9fc8917fa8358b9338bfca9f35102b9ff36eb18c8aaaf3cd"
    expected_hw_classes = {
        0: "cap",
        1: "clip",
        2: "key",
        3: "niddle",
        4: "scissor",
    }
    assert cfg3.semantic_class_map == expected_hw_classes
    assert cfg3.checkpoint_path.exists(), f"Model 3 path missing: {cfg3.checkpoint_path}"
    print("  PASS: Hardware specialist metadata verified.")

    # -------------------------------------------------------------------------
    # TEST 5: Semantic Class Isolation
    # -------------------------------------------------------------------------
    print("\n[TEST 5] Verifying Strict Semantic Class Isolation...")
    # Verify no class collision or universal class 0
    assert cfg1.semantic_class_map[0] == "Pipeline"
    assert cfg2.semantic_class_map[0] == "Human"
    assert cfg3.semantic_class_map[0] == "cap"
    assert cfg1.semantic_class_map[0] != cfg2.semantic_class_map[0]
    assert cfg1.semantic_class_map[0] != cfg3.semantic_class_map[0]
    assert cfg2.semantic_class_map[0] != cfg3.semantic_class_map[0]
    print("  PASS: Semantic isolation confirmed across all 3 models.")

    # -------------------------------------------------------------------------
    # TEST 6: Immutability and Mutation Protection
    # -------------------------------------------------------------------------
    print("\n[TEST 6] Testing Configuration Immutability & Mutation Protection...")
    # 1. ModelConfig is frozen dataclass (attribute mutation prohibited)
    try:
        cfg1.key = "mutated_key"  # type: ignore
        raise AssertionError("Expected FrozenInstanceError when modifying ModelConfig attribute!")
    except Exception:
        print("  PASS: Frozen dataclass successfully blocks attribute mutation.")

    # 2. Mutating dictionary output does not alter underlying ModelRegistry
    dict_copy = ModelRegistry.get_model_dict("pipeline")
    dict_copy["classes"][0] = "HACKED_CLASS"
    fresh_cfg = ModelRegistry.get_model_config("pipeline")
    assert fresh_cfg.semantic_class_map[0] == "Pipeline"
    print("  PASS: Dictionary export mutation does not affect source registry.")

    # -------------------------------------------------------------------------
    # TEST 7: Unknown Key Rejection
    # -------------------------------------------------------------------------
    print("\n[TEST 7] Testing Rejection of Unknown Model Keys...")
    try:
        ModelRegistry.get_model_config("unsupported_model_key")
        raise AssertionError("Expected KeyError for unknown model key!")
    except KeyError as e:
        print(f"  PASS: Correctly rejected unknown key with KeyError: {e}")

    # -------------------------------------------------------------------------
    # TEST 8: Checkpoint SHA256 Integrity Verification
    # -------------------------------------------------------------------------
    print("\n[TEST 8] Verifying Checkpoint SHA256 Hashes against Registry Specs...")
    h1 = compute_sha256(cfg1.checkpoint_path)
    h2 = compute_sha256(cfg2.checkpoint_path)
    h3 = compute_sha256(cfg3.checkpoint_path)

    assert h1 == cfg1.expected_sha256, f"Model 1 hash mismatch! Got: {h1}"
    assert h2 == cfg2.expected_sha256, f"Model 2 hash mismatch! Got: {h2}"
    assert h3 == cfg3.expected_sha256, f"Model 3 hash mismatch! Got: {h3}"

    print(f"  Model 1 SHA256: {h1} (MATCH)")
    print(f"  Model 2 SHA256: {h2} (MATCH)")
    print(f"  Model 3 SHA256: {h3} (MATCH)")

    print("\n================================================================================")
    print("ALL STEP 2 MODEL REGISTRY TESTS PASSED SUCCESSFULLY!")
    print("================================================================================")


if __name__ == "__main__":
    run_tests()
