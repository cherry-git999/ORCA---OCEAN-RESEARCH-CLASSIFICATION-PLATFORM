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
    MODEL_1_KEY: str = "pipeline"
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
    MODEL_2_KEY: str = "human"
    MODEL_2_PATH: Path = Path(
        "/media/cherry/External Hardisk/ps 57/SIH26057/model2_experiments/training_runs/aquascan_human_model2_v1/weights/best.pt"
    )
    MODEL_2_EXPECTED_SHA256: str = (
        "53e2c3ac2013cb0f35dd0e276c650ffa419198ece762c5a1e2e79e39f5cfed35"
    )
    MODEL_2_SEMANTIC_CLASS_MAP: dict = {0: "Human"}

    # Model 3: Hardware Specialist (Frozen YOLOv8n)
    MODEL_3_NAME: str = "YOLOv8n Hardware Detection Model"
    MODEL_3_ROLE: str = "Hardware Detection Model"
    MODEL_3_KEY: str = "hardware"
    MODEL_3_PATH: Path = Path(
        "/media/cherry/External Hardisk/ps 57/SIH26057/model3_experiments/training_runs/esp_hardware_model3_v1/weights/best.pt"
    )
    MODEL_3_EXPECTED_SHA256: str = (
        "1cb3f14132c5c1eb9fc8917fa8358b9338bfca9f35102b9ff36eb18c8aaaf3cd"
    )
    MODEL_3_SEMANTIC_CLASS_MAP: dict = {
        0: "cap",
        1: "clip",
        2: "key",
        3: "niddle",
        4: "scissor",
    }


settings = Settings()
