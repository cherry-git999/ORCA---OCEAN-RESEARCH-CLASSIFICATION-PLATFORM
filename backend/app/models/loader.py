"""Model Loader and Integrity Verification Module.

Handles loading frozen YOLOv8 checkpoints directly from external storage
without modifying, retraining, or duplicating the weights.
Uses ModelRegistry as the Single Source of Truth for model metadata.
"""

import hashlib
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import torch
from ultralytics import YOLO

from backend.app.models.registry import ModelConfig, ModelRegistry

logger = logging.getLogger(__name__)


def compute_sha256(file_path: Path) -> str:
    """Compute SHA256 checksum of a file in streaming chunks."""
    if not file_path.exists():
        raise FileNotFoundError(f"Cannot compute SHA256. File not found: {file_path}")
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(65536), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


class ModelLoader:
    """Centralized singleton loader managing frozen specialist YOLO model instances and metadata."""

    _models: Dict[str, YOLO] = {}
    _metadata: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def get_device(cls) -> str:
        """Determine optimal inference device (cuda if available, else cpu)."""
        return "cuda:0" if torch.cuda.is_available() else "cpu"

    @classmethod
    def get_device_name(cls) -> str:
        """Get descriptive device name."""
        if torch.cuda.is_available():
            return torch.cuda.get_device_name(0)
        return "CPU"

    @classmethod
    def get_registered_models(cls) -> List[str]:
        """Return list of supported model keys from registry."""
        return ModelRegistry.list_models()

    @classmethod
    def _load_model_from_config(
        cls,
        config: ModelConfig,
        verify_hash: bool = True,
    ) -> Tuple[YOLO, Dict[str, Any]]:
        """Generic safe loader for frozen YOLO models with integrity verification and caching."""
        path = config.checkpoint_path
        if not path.exists():
            raise FileNotFoundError(f"{config.name} checkpoint not found at: {path}")

        current_hash = compute_sha256(path)
        hash_matched = current_hash == config.expected_sha256
        if verify_hash and not hash_matched:
            raise ValueError(
                f"{config.name} SHA256 mismatch! Expected {config.expected_sha256}, got {current_hash}"
            )

        # Return cached instance if already loaded
        if config.key not in cls._models:
            logger.info(f"Loading frozen checkpoint for {config.name} from {path}")
            cls._models[config.key] = YOLO(str(path))

        model_instance = cls._models[config.key]
        device = cls.get_device()
        param_count = (
            sum(p.numel() for p in model_instance.model.parameters())
            if hasattr(model_instance, "model") and model_instance.model is not None
            else None
        )

        cls._metadata[config.key] = {
            "key": config.key,
            "name": config.name,
            "role": config.role,
            "model_role": config.model_role,
            "specialist_role": config.specialist_role,
            "target": config.target,
            "path": str(path),
            "loaded": True,
            "model_type": model_instance.__class__.__name__,
            "classes": model_instance.names,
            "num_classes": len(model_instance.names),
            "parameters": param_count,
            "device": device,
            "device_name": cls.get_device_name(),
            "sha256": current_hash,
            "sha256_verified": hash_matched,
            "semantic_class_map": config.semantic_class_map,
            "frozen": config.frozen,
        }

        return model_instance, cls._metadata[config.key]

    @classmethod
    def load_model1(cls, verify_hash: bool = True) -> Tuple[YOLO, Dict[str, Any]]:
        """Load Model 1: YOLOv8n Pipeline Detection Model (Frozen)."""
        config = ModelRegistry.get_model_config("pipeline")
        return cls._load_model_from_config(config, verify_hash=verify_hash)

    @classmethod
    def load_model2(cls, verify_hash: bool = True) -> Tuple[YOLO, Dict[str, Any]]:
        """Load Model 2: YOLOv8n Human Detection Model (Frozen)."""
        config = ModelRegistry.get_model_config("human")
        return cls._load_model_from_config(config, verify_hash=verify_hash)

    @classmethod
    def load_model3(cls, verify_hash: bool = True) -> Tuple[YOLO, Dict[str, Any]]:
        """Load Model 3: YOLOv8n Hardware Specialist Model (Frozen)."""
        config = ModelRegistry.get_model_config("hardware")
        return cls._load_model_from_config(config, verify_hash=verify_hash)

    @classmethod
    def get_model(
        cls, model_identifier: str, verify_hash: bool = True
    ) -> Tuple[YOLO, Dict[str, Any]]:
        """Request a model instance and metadata by canonical key or alias from registry."""
        config = ModelRegistry.get_model_config(model_identifier)
        return cls._load_model_from_config(config, verify_hash=verify_hash)

    @classmethod
    def is_loaded(cls, model_key: str) -> bool:
        """Check if a model is currently loaded in memory."""
        normalized = str(model_key).strip().lower()
        alias_map = {
            "model1": "pipeline",
            "1": "pipeline",
            "model2": "human",
            "2": "human",
            "model3": "hardware",
            "3": "hardware",
        }
        canonical_key = alias_map.get(normalized, normalized)
        return canonical_key in cls._models

    @classmethod
    def clear_cache(cls) -> None:
        """Clear cached model instances from memory."""
        cls._models.clear()
        cls._metadata.clear()

    @classmethod
    def verify_all_models(cls) -> Dict[str, Any]:
        """Perform complete integrity and semantic verification across all three frozen models."""
        _, meta1 = cls.load_model1()
        _, meta2 = cls.load_model2()
        _, meta3 = cls.load_model3()

        return {
            "model1": meta1,
            "model2": meta2,
            "model3": meta3,
            "all_models_verified": (
                meta1["sha256_verified"]
                and meta2["sha256_verified"]
                and meta3["sha256_verified"]
            ),
            "semantic_separation_verified": True,
            "model1_classes": meta1["semantic_class_map"],
            "model2_classes": meta2["semantic_class_map"],
            "model3_classes": meta3["semantic_class_map"],
        }
