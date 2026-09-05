"""Centralized Model Registry for SIH 2026 Sonar ML Dashboard.

Single Source of Truth defining all frozen specialist models, metadata,
checkpoint paths, semantic class mappings, and expected integrity checksums.
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List


@dataclass(frozen=True)
class ModelConfig:
    """Immutable configuration container for a frozen specialist ML model."""

    key: str
    name: str
    role: str
    model_role: str
    specialist_role: str
    target: str
    checkpoint_path: Path
    expected_sha256: str
    semantic_class_map: Dict[int, str]
    frozen: bool = True

    def to_dict(self) -> Dict[str, Any]:
        """Convert config to dictionary representation."""
        return {
            "key": self.key,
            "name": self.name,
            "role": self.role,
            "model_role": self.model_role,
            "specialist_role": self.specialist_role,
            "target": self.target,
            "checkpoint_path": str(self.checkpoint_path),
            "expected_sha256": self.expected_sha256,
            "classes": dict(self.semantic_class_map),
            "num_classes": len(self.semantic_class_map),
            "frozen": self.frozen,
        }


# Canonical model configurations (Single Source of Truth)
MODEL_REGISTRY_MAP: Dict[str, ModelConfig] = {
    "pipeline": ModelConfig(
        key="pipeline",
        name="YOLOv8n Pipeline Detection Model",
        role="Pipeline Specialist",
        model_role="Pipeline Detection Model",
        specialist_role="pipeline",
        target="Pipeline",
        checkpoint_path=Path(
            "/media/cherry/External Hardisk/ps 57/SIH26057/training_runs/yolov8n_v1_full/weights/best.pt"
        ),
        expected_sha256="99470f62a4709848ec8a27b13f2925f09aaba292dccfaff440b7ec290cc011d3",
        semantic_class_map={0: "Pipeline"},
        frozen=True,
    ),
    "human": ModelConfig(
        key="human",
        name="YOLOv8n Human Detection Model",
        role="Human Specialist",
        model_role="Human Detection Model",
        specialist_role="human",
        target="Human",
        checkpoint_path=Path(
            "/media/cherry/External Hardisk/ps 57/SIH26057/model2_experiments/training_runs/aquascan_human_model2_v1/weights/best.pt"
        ),
        expected_sha256="53e2c3ac2013cb0f35dd0e276c650ffa419198ece762c5a1e2e79e39f5cfed35",
        semantic_class_map={0: "Human"},
        frozen=True,
    ),
    "hardware": ModelConfig(
        key="hardware",
        name="YOLOv8n Hardware Detection Model",
        role="Hardware Specialist",
        model_role="Hardware Detection Model",
        specialist_role="hardware",
        target="Hardware",
        checkpoint_path=Path(
            "/media/cherry/External Hardisk/ps 57/SIH26057/model3_experiments/training_runs/esp_hardware_model3_v1/weights/best.pt"
        ),
        expected_sha256="1cb3f14132c5c1eb9fc8917fa8358b9338bfca9f35102b9ff36eb18c8aaaf3cd",
        semantic_class_map={
            0: "cap",
            1: "clip",
            2: "key",
            3: "niddle",
            4: "scissor",
        },
        frozen=True,
    ),
}

CANONICAL_MODEL_KEYS: List[str] = ["pipeline", "human", "hardware"]


class ModelRegistry:
    """Centralized read-only registry service managing specialist model metadata."""

    @classmethod
    def list_models(cls) -> List[str]:
        """Return list of canonical model keys."""
        return list(CANONICAL_MODEL_KEYS)

    @classmethod
    def has_model(cls, key: str) -> bool:
        """Check if a model key or alias is registered (case-insensitive)."""
        normalized = str(key).strip().lower()
        alias_map = {
            "model1": "pipeline",
            "1": "pipeline",
            "model2": "human",
            "2": "human",
            "model3": "hardware",
            "3": "hardware",
        }
        canonical_key = alias_map.get(normalized, normalized)
        return canonical_key in MODEL_REGISTRY_MAP

    @classmethod
    def get_model_config(cls, key: str) -> ModelConfig:
        """Retrieve the immutable ModelConfig for a registered model key or alias."""
        normalized = str(key).strip().lower()
        alias_map = {
            "model1": "pipeline",
            "1": "pipeline",
            "model2": "human",
            "2": "human",
            "model3": "hardware",
            "3": "hardware",
        }
        canonical_key = alias_map.get(normalized, normalized)

        if canonical_key not in MODEL_REGISTRY_MAP:
            raise KeyError(
                f"Unknown model key: '{key}'. Available models: {cls.list_models()}"
            )
        return MODEL_REGISTRY_MAP[canonical_key]

    @classmethod
    def get_model_dict(cls, key: str) -> Dict[str, Any]:
        """Retrieve model metadata as a clean dictionary copy."""
        return cls.get_model_config(key).to_dict()

    @classmethod
    def get_all_configs(cls) -> Dict[str, Dict[str, Any]]:
        """Retrieve dictionary of all registered model metadata."""
        return {k: cfg.to_dict() for k, cfg in MODEL_REGISTRY_MAP.items()}
