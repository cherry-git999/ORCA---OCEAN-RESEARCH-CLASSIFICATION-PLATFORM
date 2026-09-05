"""Target-Aware Specialist Model Router for SIH 2026 Sonar ML Dashboard.

Strictly maps semantic target requests to specialist frozen YOLO models.
Preserves semantic separation between Model 1 (Pipeline) and Model 2 (Human).
"""

from typing import Any, Dict, List, Optional, Tuple, Union
from ultralytics import YOLO

from backend.app.config import settings
from backend.app.models.loader import ModelLoader

SUPPORTED_TARGETS: List[str] = ["pipeline", "human"]


class UnsupportedTargetError(ValueError):
    """Exception raised when an unsupported or invalid detection target is requested."""

    def __init__(self, requested_target: Any):
        self.requested_target = requested_target
        self.supported_targets = list(SUPPORTED_TARGETS)
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
    """Safely validate and normalize target string using a strict whitelist.

    Accepts case-insensitive variants and surrounding whitespace for supported targets:
      - 'pipeline', 'Pipeline', ' PIPELINE ' -> 'pipeline'
      - 'human', 'Human', ' HUMAN ' -> 'human'

    Rejects empty strings, None, and all unlisted targets without fuzzy matching.
    """
    if target is None or not isinstance(target, str):
        raise UnsupportedTargetError(requested_target=target)

    cleaned = target.strip().lower()

    if cleaned not in SUPPORTED_TARGETS:
        raise UnsupportedTargetError(requested_target=target)

    return cleaned


class TargetRouter:
    """Target-aware routing layer mapping semantic targets to specialist frozen models."""

    @staticmethod
    def get_supported_targets() -> List[str]:
        """Return list of supported semantic detection targets."""
        return list(SUPPORTED_TARGETS)

    @classmethod
    def route(
        cls,
        target: Optional[str],
        load_model: bool = True
    ) -> Dict[str, Any]:
        """Route requested semantic target to the appropriate specialist model.

        Args:
            target: Semantic target name ('pipeline' or 'human').
            load_model: Whether to load and include the model instance via ModelLoader.

        Returns:
            Dict containing routing metadata and specialist model instance.

        Raises:
            UnsupportedTargetError: If target is invalid or unsupported.
        """
        normalized = normalize_target(target)

        if normalized == "pipeline":
            model_instance = None
            meta = None
            if load_model:
                model_instance, meta = ModelLoader.load_model1()

            return {
                "target": "pipeline",
                "requested_target": target,
                "model": "model1",
                "model_name": settings.MODEL_1_NAME,
                "model_role": settings.MODEL_1_ROLE,
                "class_id": 0,
                "class_name": "Pipeline",
                "model_instance": model_instance,
                "metadata": meta,
            }

        elif normalized == "human":
            model_instance = None
            meta = None
            if load_model:
                model_instance, meta = ModelLoader.load_model2()

            return {
                "target": "human",
                "requested_target": target,
                "model": "model2",
                "model_name": settings.MODEL_2_NAME,
                "model_role": settings.MODEL_2_ROLE,
                "class_id": 0,
                "class_name": "Human",
                "model_instance": model_instance,
                "metadata": meta,
            }

        # Safety fallback (should never be reached due to normalize_target whitelist)
        raise UnsupportedTargetError(requested_target=target)
