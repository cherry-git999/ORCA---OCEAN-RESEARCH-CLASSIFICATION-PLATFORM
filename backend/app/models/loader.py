"""Model Loader and Integrity Verification Module.

Handles loading frozen YOLOv8 checkpoints directly from external storage
without modifying, retraining, or duplicating the weights.
"""

import hashlib
import logging
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import torch
from ultralytics import YOLO

from backend.app.config import settings

logger = logging.getLogger(__name__)


def compute_sha256(file_path: Path) -> str:
    """Compute SHA256 checksum of a file in streaming chunks."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(65536), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


class ModelLoader:
    """Singleton-style loader managing frozen YOLO model instances and metadata."""

    _model1: Optional[YOLO] = None
    _model2: Optional[YOLO] = None
    _model1_meta: Optional[Dict[str, Any]] = None
    _model2_meta: Optional[Dict[str, Any]] = None

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
    def load_model1(cls, verify_hash: bool = True) -> Tuple[YOLO, Dict[str, Any]]:
        """Load Model 1: YOLOv8n Pipeline Detection Model (Frozen)."""
        path = settings.MODEL_1_PATH
        if not path.exists():
            raise FileNotFoundError(f"Model 1 checkpoint not found at: {path}")

        current_hash = compute_sha256(path)
        hash_matched = (current_hash == settings.MODEL_1_EXPECTED_SHA256)
        if verify_hash and not hash_matched:
            raise ValueError(
                f"Model 1 SHA256 mismatch! Expected {settings.MODEL_1_EXPECTED_SHA256}, got {current_hash}"
            )

        if cls._model1 is None:
            # Load frozen model without modifying weights
            cls._model1 = YOLO(str(path))

        device = cls.get_device()
        param_count = sum(p.numel() for p in cls._model1.model.parameters()) if hasattr(cls._model1, "model") and cls._model1.model is not None else None

        cls._model1_meta = {
            "name": settings.MODEL_1_NAME,
            "role": settings.MODEL_1_ROLE,
            "path": str(path),
            "loaded": True,
            "model_type": cls._model1.__class__.__name__,
            "classes": cls._model1.names,
            "num_classes": len(cls._model1.names),
            "parameters": param_count,
            "device": device,
            "device_name": cls.get_device_name(),
            "sha256": current_hash,
            "sha256_verified": hash_matched,
            "semantic_class_map": settings.MODEL_1_SEMANTIC_CLASS_MAP,
        }
        return cls._model1, cls._model1_meta

    @classmethod
    def load_model2(cls, verify_hash: bool = True) -> Tuple[YOLO, Dict[str, Any]]:
        """Load Model 2: YOLOv8n Human Detection Model (Frozen)."""
        path = settings.MODEL_2_PATH
        if not path.exists():
            raise FileNotFoundError(f"Model 2 checkpoint not found at: {path}")

        current_hash = compute_sha256(path)
        hash_matched = (current_hash == settings.MODEL_2_EXPECTED_SHA256)
        if verify_hash and not hash_matched:
            raise ValueError(
                f"Model 2 SHA256 mismatch! Expected {settings.MODEL_2_EXPECTED_SHA256}, got {current_hash}"
            )

        if cls._model2 is None:
            # Load frozen model without modifying weights
            cls._model2 = YOLO(str(path))

        device = cls.get_device()
        param_count = sum(p.numel() for p in cls._model2.model.parameters()) if hasattr(cls._model2, "model") and cls._model2.model is not None else None

        cls._model2_meta = {
            "name": settings.MODEL_2_NAME,
            "role": settings.MODEL_2_ROLE,
            "path": str(path),
            "loaded": True,
            "model_type": cls._model2.__class__.__name__,
            "classes": cls._model2.names,
            "num_classes": len(cls._model2.names),
            "parameters": param_count,
            "device": device,
            "device_name": cls.get_device_name(),
            "sha256": current_hash,
            "sha256_verified": hash_matched,
            "semantic_class_map": settings.MODEL_2_SEMANTIC_CLASS_MAP,
        }
        return cls._model2, cls._model2_meta

    @classmethod
    def verify_all_models(cls) -> Dict[str, Any]:
        """Perform complete integrity and semantic verification on both frozen models."""
        _, meta1 = cls.load_model1()
        _, meta2 = cls.load_model2()

        # Semantic check: Model 1 class 0 (Pipeline) != Model 2 class 0 (Human)
        m1_class0 = meta1["classes"].get(0, "")
        m2_class0 = meta2["classes"].get(0, "")
        semantic_distinct = (
            meta1["semantic_class_map"].get(0) != meta2["semantic_class_map"].get(0)
        )

        return {
            "model1": meta1,
            "model2": meta2,
            "semantic_separation_verified": semantic_distinct,
            "model1_class0_semantic": meta1["semantic_class_map"].get(0),
            "model2_class0_semantic": meta2["semantic_class_map"].get(0),
        }
