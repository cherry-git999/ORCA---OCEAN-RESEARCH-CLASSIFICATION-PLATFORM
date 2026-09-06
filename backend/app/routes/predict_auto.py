"""Automatic Model Selection Object Detection Predict Route for SIH 2026 Sonar ML Dashboard.

Exposes POST /predict-auto for automatic image-level model selection:
1. Validates upload format and size.
2. Extracts visual-only invariant features.
3. Applies degeneracy gating and confidence thresholding (tau = 0.85).
4. If uncertain or degenerate:
   Returns status="uncertain", model=null, target=null, detections=[] without invoking any specialist model.
5. If routed:
   Invokes ONLY the selected specialist frozen model via TargetRouter and returns standardized bounding boxes.
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from backend.app.router import TargetRouter, UnsupportedTargetError
from backend.app.services.auto_router import AutoRouterService, RouterArtifactError, get_auto_router
from backend.app.services.inference import ALLOWED_EXTENSIONS

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Automatic Inference"])

MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50 MB upload safety guard


@router.post(
    "/predict-auto",
    summary="Run Automatic Domain Model Selection and Inference on Sonar Image",
    description=(
        "Automatically determines the appropriate specialist model ('pipeline', 'human', 'hardware') "
        "using visual invariant features, input degeneracy gating, and calibrated confidence thresholding (tau=0.85). "
        "Accepts images via 'file' (or 'image') form field. "
        "If routing is uncertain or input is degenerate, returns an 'uncertain' routing status with empty detections "
        "WITHOUT invoking any heavy specialist model."
    ),
    responses={
        200: {
            "description": "Automatic routing evaluated and inference executed if confident.",
            "content": {
                "application/json": {
                    "example": {
                        "routing": {
                            "status": "routed",
                            "model": "pipeline",
                            "target": "Pipeline",
                            "confidence": 0.97,
                            "probabilities": {
                                "pipeline": 0.97,
                                "human": 0.02,
                                "hardware": 0.01,
                            },
                        },
                        "detections": [
                            {
                                "class": "Pipeline",
                                "confidence": 0.7863,
                                "bbox": [120.0, 80.0, 310.0, 220.0],
                            }
                        ],
                    }
                }
            },
        },
        400: {"description": "Missing file, empty file, unsupported format, or corrupt image."},
        500: {"description": "Router artifact missing or specialist model checkpoint missing."},
    },
)
async def predict_auto_endpoint(
    file: Optional[UploadFile] = File(None, description="Image file to upload for automatic model selection"),
    image: Optional[UploadFile] = File(None, description="Image file alias for 'file'"),
) -> Dict[str, Any]:
    """Execute automatic domain selection and specialist inference."""
    # 1. File presence validation (accept 'file' or 'image')
    upload = file or image
    if not upload or not upload.filename:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "Missing image file",
                "message": "Please provide an image file under 'file' (or 'image') form field.",
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

    # 2. Read image bytes and validate size
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

    # 3. Obtain AutoRouter service instance
    try:
        router_service = get_auto_router()
    except RouterArtifactError as e:
        logger.error(f"Router artifact error: {e}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "Router artifact missing or unreadable",
                "details": str(e),
            },
        )
    except Exception as e:
        logger.error(f"Unexpected error loading auto router: {e}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": "Internal router error", "details": str(e)},
        )

    # 4. Perform visual feature extraction and domain routing
    try:
        routing_result, img_pil = router_service.route_image(image_bytes)
    except ValueError as e:
        # Corrupt or unreadable image
        logger.warning(f"Image decode failed for {upload.filename}: {e}")
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "Corrupt or unreadable image file",
                "details": str(e),
                "filename": upload.filename,
            },
        )
    except Exception as e:
        logger.error(f"Feature extraction failed for {upload.filename}: {e}")
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "Failed to extract image features",
                "details": str(e),
                "filename": upload.filename,
            },
        )

    # 5. Handle UNCERTAIN / DEGENERATE state:
    # CRITICAL: DO NOT INVOKE ANY SPECIALIST MODEL
    if routing_result["status"] == "uncertain":
        logger.info(
            f"Image '{upload.filename}' marked as UNCERTAIN "
            f"(reason={routing_result.get('reason')}, conf={routing_result.get('confidence')}). "
            f"Specialist model NOT invoked."
        )
        return {
            "routing": {
                "status": "uncertain",
                "model": None,
                "target": None,
                "confidence": routing_result["confidence"],
                "reason": routing_result.get("reason", "routing_confidence_below_threshold"),
            },
            "detections": [],
        }

    # 6. ROUTED: Invoke ONLY the selected specialist model
    selected_target = routing_result["target"]
    try:
        result = TargetRouter.predict(
            target=selected_target,
            image=img_pil,
            imgsz=640,
            conf=0.25,
            iou=0.45,
        )
    except FileNotFoundError as e:
        logger.error(f"Specialist checkpoint file not found: {e}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "Specialist model checkpoint missing",
                "details": str(e),
            },
        )
    except Exception as e:
        logger.error(f"Specialist inference execution failed for {upload.filename}: {e}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "Specialist inference execution failed",
                "details": str(e),
            },
        )

    # 7. Standardize detection bounding boxes
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
        "routing": {
            "status": "routed",
            "model": routing_result["model"],
            "target": routing_result["target"],
            "confidence": routing_result["confidence"],
            "probabilities": routing_result.get("probabilities", {}),
        },
        "detections": detections,
    }
