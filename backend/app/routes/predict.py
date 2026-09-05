"""Target-Aware Object Detection Predict Route for SIH 2026 Sonar ML Dashboard (Step 4).

Exposes the centralized TargetRouter through POST /predict for specialist frozen models:
- Model 1: 'pipeline' (Target: Pipeline, Class: Pipeline)
- Model 2: 'human' (Target: Human, Class: Human)
- Model 3: 'hardware' (Target: Hardware, Classes: cap, clip, key, niddle, scissor)

Standardized Response Contract:
{
  "model": "hardware",
  "target": "Hardware",
  "detections": [
    {
      "class": "scissor",
      "confidence": 0.91,
      "bbox": [120.0, 80.0, 310.0, 220.0]
    }
  ]
}
"""

import io
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from backend.app.router import TargetRouter, UnsupportedTargetError, normalize_target
from backend.app.services.inference import ALLOWED_EXTENSIONS, decode_image_bytes

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Inference"])

MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50 MB upload safety guard


@router.post(
    "/predict",
    summary="Run Target-Aware Specialist Object Detection on Sonar Image",
    description=(
        "Executes target-aware specialist object detection using frozen YOLO models. "
        "Supported targets: 'pipeline' (Model 1), 'human' (Model 2), 'hardware' (Model 3). "
        "Accepts images via 'image' or 'file' form field (.jpg, .jpeg, .png, .webp, .bmp, .tif, .tiff, .pbm, .bpm). "
        "Returns standardized JSON response with model, target, and detections."
    ),
    responses={
        200: {
            "description": "Inference successfully executed.",
            "content": {
                "application/json": {
                    "example": {
                        "model": "hardware",
                        "target": "Hardware",
                        "detections": [
                            {
                                "class": "scissor",
                                "confidence": 0.91,
                                "bbox": [120.0, 80.0, 310.0, 220.0],
                            }
                        ],
                    }
                }
            },
        },
        400: {"description": "Invalid target, empty file, unsupported format, or corrupt image."},
    },
)
async def predict_endpoint(
    target: Optional[str] = Form(None, description="Semantic detection target: 'pipeline', 'human', or 'hardware'"),
    file: Optional[UploadFile] = File(None, description="Image file to upload"),
    image: Optional[UploadFile] = File(None, description="Image file to upload (alias for file)"),
) -> Dict[str, Any]:
    """Execute target-aware specialist sonar object detection via TargetRouter."""
    # 1. Target presence and validation
    if target is None or not str(target).strip():
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "Missing target parameter",
                "message": "The 'target' form field is required.",
                "supported_targets": TargetRouter.get_supported_targets(),
            },
        )

    try:
        canonical_target = normalize_target(target)
    except UnsupportedTargetError as e:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=e.to_dict(),
        )

    # 2. File presence validation (accept 'image' or 'file' field)
    upload = image or file
    if not upload or not upload.filename:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "Missing image file",
                "message": "Please provide an image file under 'image' or 'file' form field.",
            },
        )

    filename_lower = upload.filename.lower()
    has_valid_ext = any(filename_lower.endswith(ext) for ext in ALLOWED_EXTENSIONS)
    if not has_valid_ext:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "Unsupported image format",
                "filename": upload.filename,
                "supported_formats": sorted(list(ALLOWED_EXTENSIONS)),
            },
        )

    # 3. Read image bytes and validate size
    try:
        image_bytes = await upload.read()
    except Exception as e:
        logger.error(f"Error reading uploaded file {upload.filename}: {e}")
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "Failed to read uploaded file", "details": str(e)},
        )

    if not image_bytes or len(image_bytes) == 0:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "Uploaded image file is empty (0 bytes)."},
        )

    if len(image_bytes) > MAX_FILE_SIZE:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "Image file too large (exceeds 50MB limit)."},
        )

    # 4. Decode image bytes in memory (supports standard formats and Netpbm .pbm/.bpm PPM P6)
    try:
        img_pil, width, height = decode_image_bytes(image_bytes)
    except Exception as e:
        logger.error(f"Image decode error for {upload.filename}: {e}")
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "Corrupt or unreadable image file",
                "details": str(e),
                "filename": upload.filename,
            },
        )

    # 5. Route to specialist model and execute inference via TargetRouter
    try:
        result = TargetRouter.predict(
            target=canonical_target,
            image=img_pil,
            imgsz=640,
            conf=0.25,
            iou=0.45,
        )
    except UnsupportedTargetError as e:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=e.to_dict(),
        )
    except Exception as e:
        logger.error(f"Inference execution failed for {upload.filename}: {e}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": "Inference execution failed", "details": str(e)},
        )

    # 6. Format standardized JSON response contract
    detections: List[Dict[str, Any]] = []
    for d in result.get("detections", []):
        raw_bbox = d["bbox"]
        if isinstance(raw_bbox, dict):
            bbox_list = [
                float(raw_bbox["x1"]),
                float(raw_bbox["y1"]),
                float(raw_bbox["x2"]),
                float(raw_bbox["y2"]),
            ]
        elif isinstance(raw_bbox, (list, tuple)):
            bbox_list = [float(coord) for coord in raw_bbox]
        else:
            bbox_list = list(raw_bbox)

        class_name = d.get("class", d.get("class_name", str(d.get("class_id", ""))))

        detections.append(
            {
                "class": class_name,
                "confidence": float(d["confidence"]),
                "bbox": bbox_list,
            }
        )

    return {
        "model": result.get("model", result.get("model_key")),
        "target": result["target"],
        "detections": detections,
    }
