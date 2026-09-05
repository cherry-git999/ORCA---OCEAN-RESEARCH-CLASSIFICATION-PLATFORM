"""Backend configuration settings for SIH 2026 Underwater Sonar ML Dashboard."""
from pathlib import Path

class Settings:
    PROJECT_NAME: str = "SIH26057 ML Backend"
    API_V1_STR: str = "/api/v1"
    
    # Server config
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Model 1: Pipeline Detection (Frozen YOLOv8n)
    MODEL_1_NAME: str = "YOLOv8n Pipeline Detection Model"
    MODEL_1_ROLE: str = "Pipeline Detection Model"
    MODEL_1_PATH: Path = Path(
        "/media/cherry/External Hardisk/ps 57/SIH26057/training_runs/yolov8n_v1_full/weights/best.pt"
    )
    MODEL_1_EXPECTED_SHA256: str = (
        "99470f62a4709848ec8a27b13f2925f09aaba292dccfaff440b7ec290cc011d3"
    )
    MODEL_1_SEMANTIC_CLASS_MAP: dict = {0: "Pipeline"}
    
    # Model 2: Human Detection (Frozen YOLOv8n)
    MODEL_2_NAME: str = "YOLOv8n Human Detection Model"
    MODEL_2_ROLE: str = "Human Detection Model"
    MODEL_2_PATH: Path = Path(
        "/media/cherry/External Hardisk/ps 57/SIH26057/model2_experiments/training_runs/aquascan_human_model2_v1/weights/best.pt"
    )
    MODEL_2_EXPECTED_SHA256: str = (
        "53e2c3ac2013cb0f35dd0e276c650ffa419198ece762c5a1e2e79e39f5cfed35"
    )
    MODEL_2_SEMANTIC_CLASS_MAP: dict = {0: "Human"}

settings = Settings()
