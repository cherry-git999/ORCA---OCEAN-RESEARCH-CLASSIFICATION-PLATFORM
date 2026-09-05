"""Sonar Image Segmentation Route for SIH 2026 ML Dashboard.

Strict NO-FAKE-SEGMENTATION Architecture:
Pixel-level segmentation is conditional. Since no verified pixel-level training masks
or legitimate segmentation model checkpoints exist for this system, this endpoint
strictly refuses to synthesize fake rectangular masks from bounding boxes.
"""

import logging
from typing import Any, Dict

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from backend.app.router import UnsupportedTargetError, normalize_target
from backend.app.services.inference import ALLOWED_EXTENSIONS, decode_image_bytes

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Segmentation"])

SEGMENTATION_AVAILABLE: bool = False
SEGMENTATION_STATUS: str = "conditional"
SEGMENTATION_REASON: str = (
    "No verified pixel-level segmentation masks or trained segmentation checkpoint are currently available."
)
SEGMENTATION_MESSAGE: str = (
    "Segmentation is not available for the current frozen ML system."
)


@router.post(
    "/segment",
    summary="Execute Sonar Image Segmentation (Conditional)",
    description=(
        "Executes pixel-level segmentation on sonar images when a legitimate segmentation "
        "model is available. Under the strict NO-FAKE-SEGMENTATION policy, this endpoint "
        "does not fabricate rectangular masks from detection bounding boxes."
    ),
    responses={
        501: {
            "description": "Segmentation is conditionally unavailable (no fake masks generated).",
            "content": {
                "application/json": {
                    "example": {
                        "success": False,
                        "segmentation_available": False,
                        "status": "conditional",
                        "reason": (
                            "No verified pixel-level segmentation masks or trained "
                            "segmentation checkpoint are currently available."
                        ),
                        "message": (
                            "Segmentation is not available for the current frozen ML system."
                        ),
                        "target": "pipeline",
                        "image": {
                            "filename": "sonar_pipeline.pbm",
                            "width": 5000,
                            "height": 500,
                        },
                    }
                }
            },
        },
        400: {"description": "Invalid target, empty file, or unreadable/corrupt image."},
    },
)
async def segment_endpoint(
    target: str = Form(..., description="Semantic detection target: 'pipeline' or 'human'"),
    file: UploadFile = File(
        ...,
        description="Sonar image file (.jpg, .jpeg, .png, .webp, .bmp, .tif, .tiff, .pbm, .bpm)",
    ),
) -> Dict[str, Any]:
    """Handle sonar image segmentation request with strict no-fake-segmentation policy."""
    # 1. Target validation (reject unsupported targets immediately)
    try:
        norm_target = normalize_target(target)
    except UnsupportedTargetError as e:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=e.to_dict(),
        )

    # 2. Validate file presence and format extension
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

    # 3. Read image bytes into memory
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

    # 4. Decode image to verify validity and extract dimensions
    try:
        _, width, height = decode_image_bytes(image_bytes)
    except Exception as e:
        logger.error(f"Image decode error for {file.filename}: {e}")
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "Corrupt or unreadable image file",
                "details": str(e),
                "filename": file.filename,
            },
        )

    # 5. Conditional Segmentation Check (Strict No Fake Segmentation Policy)
    if not SEGMENTATION_AVAILABLE:
        return JSONResponse(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            content={
                "success": False,
                "segmentation_available": False,
                "status": SEGMENTATION_STATUS,
                "reason": SEGMENTATION_REASON,
                "message": SEGMENTATION_MESSAGE,
                "target": norm_target,
                "image": {
                    "filename": file.filename,
                    "width": width,
                    "height": height,
                },
            },
        )

    # Future legitimate U-Net inference hook when verified model checkpoint becomes available:
    # return perform_legitimate_unet_segmentation(norm_target, img_rgb, width, height)
