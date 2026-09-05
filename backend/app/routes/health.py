from fastapi import APIRouter

router = APIRouter(tags=["Health"])

@router.get("/health")
def health_check():
    """Health check endpoint returning service status."""
    return {
        "status": "ok",
        "service": "SIH26057 ML Backend"
    }
