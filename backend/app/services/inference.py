"""Core Sonar Inference Service.

Handles image decoding, target routing, YOLOv8 inference execution,
and bounding box localization in original image pixel space.
"""

import io
import logging
from typing import Any, Dict, List, Optional, Set, Tuple
import cv2
import numpy as np
from PIL import Image

import torch
from backend.app.router import TargetRouter, UnsupportedTargetError

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS: Set[str] = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".bmp",
    ".tif",
    ".tiff",
    ".pbm",
    ".bpm",
}

DEFAULT_IMGSZ: int = 640
DEFAULT_CONF_THRESHOLD: float = 0.25
DEFAULT_NMS_IOU: float = 0.45


def decode_image_bytes(image_bytes: bytes) -> Tuple[Image.Image, int, int]:
    """Safely decode image bytes into an RGB PIL Image and return (image, width, height).

    Supports standard web formats as well as SubPipeMiniSSS .pbm / .bpm Netpbm P6/PPM
    binary sonar images in-memory.
    """
    if not image_bytes or len(image_bytes) == 0:
        raise ValueError("Uploaded image file is empty (0 bytes).")

    # 1. Primary decoder: Pillow
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img.load()
        img_rgb = img.convert("RGB")
        width, height = img.size
        return img_rgb, width, height
    except Exception as e_pil:
        logger.debug(f"Pillow direct decode failed: {e_pil}. Attempting OpenCV fallback.")

    # 2. Secondary decoder: OpenCV
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img_cv = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img_cv is not None and img_cv.size > 0:
            img_rgb_arr = cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB)
            img_pil = Image.fromarray(img_rgb_arr)
            height, width = img_cv.shape[:2]
            return img_pil, width, height
    except Exception as e_cv:
        logger.debug(f"OpenCV decode fallback failed: {e_cv}")

    raise ValueError("Image bytes could not be decoded by available image decoders (corrupt or unrecognized format).")


def execute_sonar_inference(
    target: str,
    filename: str,
    image_bytes: bytes,
    conf_thresh: float = DEFAULT_CONF_THRESHOLD,
    nms_iou: float = DEFAULT_NMS_IOU,
    imgsz: int = DEFAULT_IMGSZ,
) -> Dict[str, Any]:
    """Execute target-aware sonar detection inference.

    Args:
        target: Semantic detection target ('pipeline' or 'human').
        filename: Original uploaded image filename.
        image_bytes: In-memory raw bytes of uploaded image.
        conf_thresh: Confidence threshold (default: 0.25).
        nms_iou: NMS IoU threshold (default: 0.45).
        imgsz: Inference canvas size (default: 640).

    Returns:
        Dict containing routing info, image metadata, and extracted detections in pixel coordinates.
    """
    # 1. Route target to specialist frozen model
    route_info = TargetRouter.route(target, load_model=True)

    # 2. Decode image safely
    img_rgb, width, height = decode_image_bytes(image_bytes)

    # 3. Determine device
    device = 0 if torch.cuda.is_available() else "cpu"
    device_str = "cuda:0" if torch.cuda.is_available() else "cpu"

    # 4. Run inference (batch=1, torch.no_grad())
    model = route_info["model_instance"]
    with torch.no_grad():
        results = model.predict(
            source=img_rgb,
            imgsz=imgsz,
            conf=conf_thresh,
            iou=nms_iou,
            device=device,
            verbose=False,
        )

    # 5. Extract bounding boxes in original image pixel coordinates
    detections: List[Dict[str, Any]] = []
    if results and len(results) > 0:
        boxes = results[0].boxes
        if boxes is not None and len(boxes) > 0:
            for box in boxes:
                cls_id = int(box.cls.item())
                confidence = float(box.conf.item())
                coords = box.xyxy[0].tolist()  # [x1, y1, x2, y2]

                # Clamp bounding box coordinates strictly within original image dimensions
                x1 = max(0.0, min(float(width), float(coords[0])))
                y1 = max(0.0, min(float(height), float(coords[1])))
                x2 = max(0.0, min(float(width), float(coords[2])))
                y2 = max(0.0, min(float(height), float(coords[3])))

                # Semantic class name from specialist router
                semantic_name = route_info["class_name"]

                detections.append(
                    {
                        "class_id": cls_id,
                        "class_name": semantic_name,
                        "confidence": round(confidence, 4),
                        "bbox": {
                            "x1": round(x1, 2),
                            "y1": round(y1, 2),
                            "x2": round(x2, 2),
                            "y2": round(y2, 2),
                        },
                    }
                )

    return {
        "route_info": route_info,
        "filename": filename,
        "width": width,
        "height": height,
        "device": device_str,
        "imgsz": imgsz,
        "conf_thresh": conf_thresh,
        "nms_iou": nms_iou,
        "detections": detections,
        "detection_count": len(detections),
    }
