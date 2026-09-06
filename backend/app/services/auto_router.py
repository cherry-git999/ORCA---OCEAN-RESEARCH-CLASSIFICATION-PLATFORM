"""Automatic Domain Model Selector for SIH 2026 Sonar ML Dashboard.

Implements lightweight, explainable image-level routing among:
- Model 1: Pipeline Specialist ('pipeline' / 'Pipeline')
- Model 2: Human Specialist ('human' / 'Human')
- Model 3: Hardware Specialist ('hardware' / 'Hardware')

Includes input degeneracy gating and confidence thresholding (tau = 0.85)
with safe UNKNOWN/UNCERTAIN abstention.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import joblib
import numpy as np
from PIL import Image

from backend.app.services.inference import decode_image_bytes

logger = logging.getLogger(__name__)

ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "router_artifacts"
CONFIG_FILE = ARTIFACTS_DIR / "router_config.json"
SCALER_FILE = ARTIFACTS_DIR / "scaler.joblib"
MODEL_FILE = ARTIFACTS_DIR / "logistic_router.joblib"


class RouterArtifactError(RuntimeError):
    """Raised when router model or configuration artifacts are missing or unreadable."""
    pass


class AutoRouterService:
    """Singleton service managing feature extraction and automatic specialist routing."""

    _instance: Optional["AutoRouterService"] = None

    def __init__(self):
        self._config: Optional[Dict[str, Any]] = None
        self._scaler = None
        self._classifier = None
        self._load_artifacts()

    @classmethod
    def get_instance(cls) -> "AutoRouterService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _load_artifacts(self) -> None:
        """Load router config, scaler, and logistic regression model from disk."""
        if not CONFIG_FILE.exists():
            raise RouterArtifactError(
                f"Router configuration missing at {CONFIG_FILE}. Internal model selection unavailable."
            )
        if not SCALER_FILE.exists():
            raise RouterArtifactError(
                f"Router scaler artifact missing at {SCALER_FILE}. Internal model selection unavailable."
            )
        if not MODEL_FILE.exists():
            raise RouterArtifactError(
                f"Router model artifact missing at {MODEL_FILE}. Internal model selection unavailable."
            )

        try:
            with open(CONFIG_FILE, "r") as f:
                self._config = json.load(f)
            self._scaler = joblib.load(SCALER_FILE)
            self._classifier = joblib.load(MODEL_FILE)
            logger.info("AutoRouterService: Loaded router artifacts successfully.")
        except Exception as e:
            logger.error(f"AutoRouterService failed to load artifacts: {e}")
            raise RouterArtifactError(f"Failed to load router artifacts: {e}")

    @property
    def config(self) -> Dict[str, Any]:
        if self._config is None:
            self._load_artifacts()
        return self._config

    def extract_visual_features(self, img_pil: Image.Image) -> Dict[str, float]:
        """Extract exact 17 visual invariant features in standardized order."""
        arr = np.array(img_pil)
        gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
        hsv = cv2.cvtColor(arr, cv2.COLOR_RGB2HSV)

        # 1. Color and Saturation Invariants
        r = arr[:, :, 0].astype(float)
        g = arr[:, :, 1].astype(float)
        b = arr[:, :, 2].astype(float)
        color_var = float(np.mean((np.abs(r - g) + np.abs(r - b) + np.abs(g - b)) / 3.0))

        sat = hsv[:, :, 1].astype(float) / 255.0
        sat_mean = float(np.mean(sat))
        sat_std = float(np.std(sat))
        hue_mean = float(np.mean(hsv[:, :, 0].astype(float)))

        # 2. Intensity and Dynamic Range Invariants
        mean_intensity = float(np.mean(gray))
        std_intensity = float(np.std(gray))
        p5, p95 = np.percentile(gray, [5, 95])
        dyn_range = float(p95 - p5)

        # 3. Texture and Edge Density Invariants
        lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        grad_mag = np.sqrt(sobelx**2 + sobely**2)
        edge_mean = float(np.mean(grad_mag))
        edge_std = float(np.std(grad_mag))

        # 4. Shannon Entropy Invariant
        hist, _ = np.histogram(gray, bins=256, range=(0, 256), density=True)
        hist = hist[hist > 0]
        entropy = float(-np.sum(hist * np.log2(hist)))

        # 5. Channel Intensity Means & Ratios
        mean_r = float(np.mean(r))
        mean_g = float(np.mean(g))
        mean_b = float(np.mean(b))
        rg_diff = float(np.abs(mean_r - mean_g))
        rb_diff = float(np.abs(mean_r - mean_b))
        gb_diff = float(np.abs(mean_g - mean_b))

        return {
            "color_var": color_var,
            "sat_mean": sat_mean,
            "sat_std": sat_std,
            "hue_mean": hue_mean,
            "mean_intensity": mean_intensity,
            "std_intensity": std_intensity,
            "dyn_range": dyn_range,
            "lap_var": lap_var,
            "edge_mean": edge_mean,
            "edge_std": edge_std,
            "entropy": entropy,
            "mean_r": mean_r,
            "mean_g": mean_g,
            "mean_b": mean_b,
            "rg_diff": rg_diff,
            "rb_diff": rb_diff,
            "gb_diff": gb_diff,
        }

    def route_image(self, image_bytes: bytes) -> Tuple[Dict[str, Any], Image.Image]:
        """Classify input image bytes to a specialist domain or UNCERTAIN/ABSTAIN.

        Returns:
            Tuple of (routing_info_dict, decoded_pil_image).
        """
        img_pil, width, height = decode_image_bytes(image_bytes)
        features = self.extract_visual_features(img_pil)

        cfg = self.config
        degen_cfg = cfg.get("degeneracy_thresholds", {})
        min_std = degen_cfg.get("std_intensity_min", 5.0)
        min_dyn = degen_cfg.get("dyn_range_min", 10.0)

        # 1. Input Degeneracy Gate (blank, zero-signal, or saturated flat images)
        if features["std_intensity"] < min_std or features["dyn_range"] < min_dyn:
            logger.warning(
                f"Degenerate image detected: std={features['std_intensity']:.2f} < {min_std}, "
                f"dyn_range={features['dyn_range']:.2f} < {min_dyn}. Triggering UNCERTAIN state."
            )
            return {
                "status": "uncertain",
                "model": None,
                "target": None,
                "confidence": 0.0,
                "reason": "degenerate_image",
                "probabilities": {
                    "pipeline": 0.0,
                    "human": 0.0,
                    "hardware": 0.0,
                },
            }, img_pil

        # 2. Extract feature vector in exact configured ordering
        feature_names: List[str] = cfg["feature_names"]
        vec = np.array([[features[k] for k in feature_names]], dtype=float)

        # 3. Standardize and infer probabilities
        vec_scaled = self._scaler.transform(vec)
        probs = self._classifier.predict_proba(vec_scaled)[0]

        best_idx = int(np.argmax(probs))
        confidence = float(probs[best_idx])

        domain_mapping = cfg["domain_mapping"]
        domain_target_mapping = cfg["domain_target_mapping"]

        prob_dict = {
            domain_mapping[str(i)]: round(float(probs[i]), 4)
            for i in range(len(probs))
        }

        threshold = float(cfg.get("confidence_threshold", 0.85))

        # 4. Confidence Threshold Gate
        if confidence < threshold:
            logger.info(
                f"Routing confidence {confidence:.4f} below threshold {threshold}. "
                f"Triggering UNCERTAIN state."
            )
            return {
                "status": "uncertain",
                "model": None,
                "target": None,
                "confidence": round(confidence, 4),
                "reason": "routing_confidence_below_threshold",
                "probabilities": prob_dict,
            }, img_pil

        # 5. Confident Route
        selected_model = domain_mapping[str(best_idx)]
        selected_target = domain_target_mapping[selected_model]

        logger.info(
            f"Image routed successfully to '{selected_model}' ({selected_target}) "
            f"with confidence {confidence:.4f}."
        )

        return {
            "status": "routed",
            "model": selected_model,
            "target": selected_target,
            "confidence": round(confidence, 4),
            "probabilities": prob_dict,
        }, img_pil


def get_auto_router() -> AutoRouterService:
    """Helper to retrieve AutoRouterService singleton."""
    return AutoRouterService.get_instance()
