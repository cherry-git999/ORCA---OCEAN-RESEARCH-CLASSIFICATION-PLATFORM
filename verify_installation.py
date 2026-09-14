#!/usr/bin/env python3
"""ORCA — Verification & Integrity Smoke Test Script.

Validates the local environment and repository assets for judging and replication:
1. Repository structure and directory resolution
2. Checkpoint presence for all 3 specialist models
3. Byte-for-byte SHA256 integrity verification of frozen models
4. Presence and readability of automatic domain router artifacts
5. Presence and readability of repository-local sample test data
6. Optional dependency import checks
"""

import hashlib
import json
import os
import sys
from pathlib import Path

# ANSI Color Codes for clean terminal output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"


def compute_sha256(filepath: Path) -> str:
    """Compute SHA256 checksum of a file in 64KB chunks."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def main():
    repo_root = Path(__file__).resolve().parent
    print(f"\n{BOLD}{CYAN}========================================================================{RESET}")
    print(f"{BOLD}{CYAN}      ORCA — REPOSITORY INTEGRITY & INSTALLATION SMOKE TEST             {RESET}")
    print(f"{BOLD}{CYAN}========================================================================{RESET}")
    print(f"Repository Root : {repo_root}")
    print(f"Python Executable: {sys.executable}")
    print(f"Python Version   : {sys.version.split()[0]}\n")

    total_checks = 0
    passed_checks = 0
    failures = []

    def check(description: str, condition: bool, details: str = ""):
        nonlocal total_checks, passed_checks
        total_checks += 1
        if condition:
            passed_checks += 1
            print(f"  {GREEN}[PASS]{RESET} {description}")
            if details:
                print(f"         {details}")
        else:
            failures.append(f"{description}: {details}")
            print(f"  {RED}[FAIL]{RESET} {description}")
            if details:
                print(f"         {RED}{details}{RESET}")

    # -------------------------------------------------------------------------
    # 1. SPECIALIST FROZEN MODELS & SHA256 CHECKSUMS
    # -------------------------------------------------------------------------
    print(f"{BOLD}--- 1. Specialist Model Checkpoints & SHA256 Integrity ---{RESET}")
    models_dir = repo_root / "models"
    check("Models directory exists", models_dir.is_dir(), str(models_dir))

    EXPECTED_MODELS = {
        "pipeline": {
            "name": "Model 1 — Pipeline Specialist",
            "path": models_dir / "pipeline" / "best.pt",
            "expected_sha256": "99470f62a4709848ec8a27b13f2925f09aaba292dccfaff440b7ec290cc011d3",
        },
        "human": {
            "name": "Model 2 — Human Specialist",
            "path": models_dir / "human" / "best.pt",
            "expected_sha256": "53e2c3ac2013cb0f35dd0e276c650ffa419198ece762c5a1e2e79e39f5cfed35",
        },
        "hardware": {
            "name": "Model 3 — Hardware Specialist",
            "path": models_dir / "hardware" / "best.pt",
            "expected_sha256": "1cb3f14132c5c1eb9fc8917fa8358b9338bfca9f35102b9ff36eb18c8aaaf3cd",
        },
    }

    for key, spec in EXPECTED_MODELS.items():
        p = spec["path"]
        exists = p.is_file()
        check(f"{spec['name']} checkpoint exists", exists, str(p))
        if exists:
            size_mb = p.stat().st_size / (1024 * 1024)
            actual_hash = compute_sha256(p)
            match = actual_hash == spec["expected_sha256"]
            check(
                f"{spec['name']} SHA256 verified",
                match,
                f"Size: {size_mb:.2f} MiB | Hash: {actual_hash[:16]}... (match: {match})",
            )

    # -------------------------------------------------------------------------
    # 2. AUTOMATIC DOMAIN ROUTER ARTIFACTS
    # -------------------------------------------------------------------------
    print(f"\n{BOLD}--- 2. Automatic Visual Domain Router Artifacts ---{RESET}")
    artifacts_dir = repo_root / "backend" / "app" / "router_artifacts"
    check("Router artifacts directory exists", artifacts_dir.is_dir(), str(artifacts_dir))

    cfg_path = artifacts_dir / "router_config.json"
    scaler_path = artifacts_dir / "scaler.joblib"
    model_path = artifacts_dir / "logistic_router.joblib"

    check("Router config exists", cfg_path.is_file(), str(cfg_path))
    check("Router scaler artifact exists", scaler_path.is_file(), str(scaler_path))
    check("Router logistic classifier exists", model_path.is_file(), str(model_path))

    if cfg_path.is_file():
        try:
            with open(cfg_path, "r") as f:
                cfg_data = json.load(f)
            check(
                "Router config readable & valid",
                "feature_names" in cfg_data and len(cfg_data["feature_names"]) == 17,
                f"17 features configured: {', '.join(cfg_data['feature_names'][:4])}...",
            )
        except Exception as e:
            check("Router config readable & valid", False, str(e))

    # -------------------------------------------------------------------------
    # 3. REPOSITORY SAMPLE DATA
    # -------------------------------------------------------------------------
    print(f"\n{BOLD}--- 3. Repository-Local Sample Testing Data ---{RESET}")
    sample_dir = repo_root / "frontend" / "sample_data"
    check("Sample data directory exists", sample_dir.is_dir(), str(sample_dir))

    if sample_dir.is_dir():
        sample_files = sorted(os.listdir(sample_dir))
        check(
            "Sample images present (10 canonical images)",
            len(sample_files) >= 10,
            f"Found {len(sample_files)} sample files",
        )
        # Check domain representations
        has_pipeline = any(f.endswith(".pbm") for f in sample_files)
        has_human = any("Screenshot" in f for f in sample_files)
        has_hardware = any(f.startswith(("cap", "keys", "niddle", "scissor", "clip")) for f in sample_files)

        check("Pipeline sample images present (.pbm)", has_pipeline)
        check("Human sample images present (AquaScan .png)", has_human)
        check("Hardware sample images present (.jpg)", has_hardware)

    # -------------------------------------------------------------------------
    # 4. PYTHON ENVIRONMENT & DEPENDENCY IMPORT CHECK
    # -------------------------------------------------------------------------
    print(f"\n{BOLD}--- 4. Python Environment & Core Package Imports ---{RESET}")
    PACKAGES = [
        ("FastAPI", "fastapi"),
        ("Uvicorn", "uvicorn"),
        ("Pydantic", "pydantic"),
        ("PyTorch", "torch"),
        ("Torchvision", "torchvision"),
        ("Ultralytics (YOLO)", "ultralytics"),
        ("OpenCV", "cv2"),
        ("Pillow", "PIL"),
        ("Scikit-Learn", "sklearn"),
        ("Joblib", "joblib"),
        ("NumPy", "numpy"),
    ]

    for label, mod in PACKAGES:
        try:
            m = __import__(mod)
            ver = getattr(m, "__version__", "installed")
            check(f"{label} ({mod}) available", True, f"version: {ver}")
        except ImportError as e:
            check(f"{label} ({mod}) available", False, str(e))

    # -------------------------------------------------------------------------
    # SUMMARY REPORT
    # -------------------------------------------------------------------------
    print(f"\n{BOLD}{CYAN}========================================================================{RESET}")
    if passed_checks == total_checks:
        print(f"{BOLD}{GREEN}  RESULT: ALL {total_checks}/{total_checks} CHECKS PASSED — REPOSITORY READY FOR JUDGING!{RESET}")
        print(f"{BOLD}{CYAN}========================================================================{RESET}\n")
        return 0
    else:
        print(f"{BOLD}{RED}  RESULT: {len(failures)}/{total_checks} CHECKS FAILED!{RESET}")
        for f in failures:
            print(f"    - {f}")
        print(f"{BOLD}{CYAN}========================================================================{RESET}\n")
        return 1


if __name__ == "__main__":
    sys.exit(main())
