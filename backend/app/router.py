"""Target-Aware Specialist Model Router for SIH 2026 Sonar ML Dashboard.

Strictly maps semantic target requests to specialist frozen YOLO models.
Preserves semantic separation among Model 1 (Pipeline), Model 2 (Human), and Model 3 (Hardware).
Uses Centralized ModelRegistry and ModelLoader.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
import torch
from ultralytics import YOLO

from backend.app.models.loader import ModelLoader
from backend.app.models.registry import ModelConfig, ModelRegistry

SUPPORTED_TARGETS: List[str] = ModelRegistry.list_models()


class UnsupportedTargetError(ValueError):
    """Exception raised when an unsupported or invalid detection target is requested."""

    def __init__(self, requested_target: Any):
        self.requested_target = requested_target
        self.supported_targets = ModelRegistry.list_models()
        self.message = (
            f"Unsupported detection target: '{requested_target}'. "
            f"Supported targets are: {self.supported_targets}"
        )
        super().__init__(self.message)

    def to_dict(self) -> Dict[str, Any]:
        """Format error response dictionary suitable for API error responses (HTTP 400)."""
        return {
            "error": "Unsupported detection target",
            "requested_target": self.requested_target,
            "supported_targets": self.supported_targets,
        }


def normalize_target(target: Optional[Union[str, Any]]) -> str:
    """Safely validate and normalize target string using the centralized ModelRegistry.

    Accepts case-insensitive variants and surrounding whitespace for supported targets:
      - 'pipeline', 'Pipeline', ' PIPELINE ' -> 'pipeline'
      - 'human', 'Human', ' HUMAN ' -> 'human'
      - 'hardware', 'Hardware', ' HARDWARE ' -> 'hardware'

    Rejects empty strings, None, and all unlisted targets without fuzzy matching.
    """
    if target is None or not isinstance(target, str):
        raise UnsupportedTargetError(requested_target=target)

    cleaned = target.strip().lower()

    if not ModelRegistry.has_model(cleaned):
        raise UnsupportedTargetError(requested_target=target)

    alias_map = {
        "model1": "pipeline",
        "1": "pipeline",
        "model2": "human",
        "2": "human",
        "model3": "hardware",
        "3": "hardware",
    }
    return alias_map.get(cleaned, cleaned)


class TargetRouter:
    """Target-aware routing layer mapping semantic targets to specialist frozen models."""

    @staticmethod
    def get_supported_targets() -> List[str]:
        """Return list of supported semantic detection targets from registry."""
        return ModelRegistry.list_models()

    @classmethod
    def route(
        cls, target: Optional[str], load_model: bool = True
    ) -> Dict[str, Any]:
        """Route requested semantic target to the appropriate specialist model.

        Args:
            target: Semantic target name ('pipeline', 'human', 'hardware').
            load_model: Whether to load and include the model instance via ModelLoader.

        Returns:
            Dict containing routing metadata and specialist model instance.

        Raises:
            UnsupportedTargetError: If target is invalid or unsupported.
        """
        canonical_key = normalize_target(target)
        config: ModelConfig = ModelRegistry.get_model_config(canonical_key)

        model_instance = None
        meta = None
        if load_model:
            model_instance, meta = ModelLoader.get_model(canonical_key)

        # Legacy model ID mapping for backward compatibility ('model1', 'model2', 'model3')
        model_id_map = {
            "pipeline": "model1",
            "human": "model2",
            "hardware": "model3",
        }

        # Single class fallback name
        default_class_name = (
            config.semantic_class_map.get(0, config.target)
            if len(config.semantic_class_map) == 1
            else config.target
        )

        return {
            "target": canonical_key,
            "target_title": config.target,
            "requested_target": target,
            "model": model_id_map.get(canonical_key, canonical_key),
            "model_key": config.key,
            "model_name": config.name,
            "model_role": config.model_role,
            "specialist_role": config.specialist_role,
            "class_id": 0 if len(config.semantic_class_map) == 1 else None,
            "class_name": default_class_name,
            "classes": config.semantic_class_map,
            "model_instance": model_instance,
            "metadata": meta,
        }

    @classmethod
    def predict(
        cls,
        target: str,
        image: Any,
        imgsz: int = 640,
        conf: float = 0.25,
        iou: float = 0.45,
    ) -> Dict[str, Any]:
        """Execute standardized specialist inference for a given target and image.

        Args:
            target: Requested semantic target.
            image: Image source (PIL Image, numpy array, path, etc.).
            imgsz: Canvas resolution (default: 640).
            conf: Confidence threshold (default: 0.25).
            iou: NMS IoU threshold (default: 0.45).

        Returns:
            Standardized response dictionary:
            {
                "model_key": "...",
                "target": "...",
                "detections": [
                    {
                        "class_id": int,
                        "class_name": str,
                        "confidence": float,
                        "bbox": {"x1": float, "y1": float, "x2": float, "y2": float}
                    }
                ]
            }
        """
        route_info = cls.route(target, load_model=True)
        model: YOLO = route_info["model_instance"]
        config = ModelRegistry.get_model_config(route_info["model_key"])

        # Prepare image if provided as bytes, string/Path, or pbm/bpm format
        source_image = image
        if isinstance(image, (str, Path)):
            img_path = Path(image)
            if img_path.suffix.lower() in {".pbm", ".bpm"}:
                from backend.app.services.inference import decode_image_bytes
                source_image, _, _ = decode_image_bytes(img_path.read_bytes())
        elif isinstance(image, bytes):
            from backend.app.services.inference import decode_image_bytes
            source_image, _, _ = decode_image_bytes(image)

        device = 0 if torch.cuda.is_available() else "cpu"

        with torch.no_grad():
            results = model.predict(
                source=source_image,
                imgsz=imgsz,
                conf=conf,
                iou=iou,
                device=device,
                verbose=False,
            )

        detections: List[Dict[str, Any]] = []
        if results and len(results) > 0:
            boxes = results[0].boxes
            if boxes is not None and len(boxes) > 0:
                for box in boxes:
                    cls_id = int(box.cls.item())
                    confidence = float(box.conf.item())
                    coords = box.xyxy[0].tolist()

                    # Semantic class name from model's specific mapping
                    class_name = config.semantic_class_map.get(
                        cls_id, str(model.names.get(cls_id, cls_id))
                    )

                    detections.append(
                        {
                            "class_id": cls_id,
                            "class_name": class_name,
                            "confidence": round(confidence, 4),
                            "bbox": {
                                "x1": round(coords[0], 2),
                                "y1": round(coords[1], 2),
                                "x2": round(coords[2], 2),
                                "y2": round(coords[3], 2),
                            },
                        }
                    )

        return {
            "model_key": config.key,
            "target": config.target,
            "detections": detections,
        }
