"""Object Detection Predict Route for SIH 2026 Sonar ML Dashboard.

Performs specialist YOLOv8 inference for requested semantic targets ('pipeline' or 'human').
Supports standard web formats (.jpg, .jpeg, .png, .webp, .bmp, .tif, .tiff) as well as
SubPipeMiniSSS sonar formats (.pbm, .bpm with underlying Netpbm P6/PPM streams).
"""

import logging
from typing import Any, Dict

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from backend.app.router import UnsupportedTargetError
from backend.app.services.inference import (
    ALLOWED_EXTENSIONS,
    execute_sonar_inference,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Inference"])


@router.post(
    "/predict",
    summary="Run Object Detection on Sonar Image",
    description=(
        "Performs object detection using the appropriate specialist model "
        "('pipeline' -> Model 1, 'human' -> Model 2). "
        "Supported formats: .jpg, .jpeg, .png, .webp, .bmp, .tif, .tiff, .pbm, .bpm. "
        "Returns detected bounding boxes and confidences in JSON format."
    ),
    responses={
        200: {
            "description": "Inference successfully executed.",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "target": "pipeline",
                        "model": {
                            "id": "model1",
                            "name": "YOLOv8n Pipeline Detection Model",
                            "class_name": "Pipeline",
                        },
                        "image": {
                            "filename": "sonar_example.pbm",
                            "width": 5000,
                            "height": 500,
                        },
                        "inference": {
                            "device": "cuda:0",
                            "imgsz": 640,
                            "confidence_threshold": 0.25,
                            "nms_iou": 0.45,
                        },
                        "detections": [
                            {
                                "class_id": 0,
                                "class_name": "Pipeline",
                                "confidence": 0.9123,
                                "bbox": {"x1": 120.0, "y1": 85.0, "x2": 520.0, "y2": 410.0},
                            }
                        ],
                        "detection_count": 1,
                        "message": "Detections found.",
                    }
                }
            },
        },
        400: {"description": "Invalid target, empty file, or unreadable/corrupt image."},
    },
)
async def predict_endpoint(
    target: str = Form(..., description="Semantic detection target: 'pipeline' or 'human'"),
    file: UploadFile = File(
        ...,
        description="Sonar image file (.jpg, .jpeg, .png, .webp, .bmp, .tif, .tiff, .pbm, .bpm)",
    ),
) -> Dict[str, Any]:
    """Execute target-aware sonar object detection."""
    # 1. Validate uploaded file presence and extension
    if not file or not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "No file uploaded or missing filename."},
        )

    filename_lower = file.filename.lower()
    has_valid_ext = any(filename_lower.endswith(ext) for ext in ALLOWED_EXTENSIONS)
    if not has_valid_ext:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "Unsupported image format",
                "filename": file.filename,
                "supported_formats": sorted(list(ALLOWED_EXTENSIONS)),
            },
        )

    # 2. Read image bytes into memory
    try:
        image_bytes = await file.read()
    except Exception as e:
        logger.error(f"Error reading uploaded file: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Failed to read uploaded file.", "details": str(e)},
        )

    if not image_bytes or len(image_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Uploaded image file is empty (0 bytes)."},
        )

    # 3. Execute inference via shared service
    try:
        result = execute_sonar_inference(
            target=target,
            filename=file.filename,
            image_bytes=image_bytes,
        )
    except UnsupportedTargetError as e:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=e.to_dict(),
        )
    except Exception as e:
        logger.error(f"Inference processing error for {file.filename}: {e}")
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "Corrupt or unreadable image file",
                "details": str(e),
                "filename": file.filename,
            },
        )

    # 4. Construct response payload
    route_info = result["route_info"]
    detection_count = result["detection_count"]
    message = (
        "Detections found."
        if detection_count > 0
        else "No objects detected above the confidence threshold."
    )

    return {
        "success": True,
        "target": route_info["target"],
        "model": {
            "id": route_info["model"],
            "name": route_info["model_name"],
            "class_name": route_info["class_name"],
        },
        "image": {
            "filename": result["filename"],
            "width": result["width"],
            "height": result["height"],
        },
        "inference": {
            "device": result["device"],
            "imgsz": result["imgsz"],
            "confidence_threshold": result["conf_thresh"],
            "nms_iou": result["nms_iou"],
        },
        "detections": result["detections"],
        "detection_count": detection_count,
        "message": message,
    }
