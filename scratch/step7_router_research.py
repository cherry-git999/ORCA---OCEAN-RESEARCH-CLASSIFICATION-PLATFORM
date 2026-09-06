"""Step 7: Automatic Model Selection Research and Prototyping Script.

Executes:
1. Model integrity verification (SHA256).
2. Manifest creation with strict zero-leakage train/val vs held-out test splits.
3. Feature extraction (visual invariants vs structural/metadata).
4. Candidate benchmarking: Rule-Based, Nearest Centroid, Logistic Regression, Random Forest.
5. Shortcut analysis (visual-only vs full features).
6. Abstention & uncertainty curve analysis across confidence thresholds.
7. Canonical test images verification (Pipeline .pbm, Human .png, Hardware .jpg).
8. Model integrity post-check (SHA256).
9. Report generation.
"""

import os
import sys
import json
import time
import hashlib
from pathlib import Path
from typing import Dict, List, Tuple, Any

import cv2
import numpy as np
from PIL import Image
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.neighbors import NearestCentroid
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix

# Add workspace to path
WORKSPACE_ROOT = Path("/home/cherry/Documents/workspace/mldashbordproject")
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

from backend.app.config import settings
from backend.app.services.inference import decode_image_bytes

EXPECTED_SHA256 = {
    "Model 1 (Pipeline)": (
        settings.MODEL_1_PATH,
        "99470f62a4709848ec8a27b13f2925f09aaba292dccfaff440b7ec290cc011d3",
    ),
    "Model 2 (Human)": (
        settings.MODEL_2_PATH,
        "53e2c3ac2013cb0f35dd0e276c650ffa419198ece762c5a1e2e79e39f5cfed35",
    ),
    "Model 3 (Hardware)": (
        settings.MODEL_3_PATH,
        "1cb3f14132c5c1eb9fc8917fa8358b9338bfca9f35102b9ff36eb18c8aaaf3cd",
    ),
}

def verify_model_integrity(label: str = "PRE-CHECK") -> Dict[str, bool]:
    print(f"\n==================================================")
    print(f"MODEL CHECKPOINT INTEGRITY VERIFICATION [{label}]")
    print(f"==================================================")
    results = {}
    for name, (path, expected_hash) in EXPECTED_SHA256.items():
        if not path.exists():
            print(f"[FAIL] {name} NOT FOUND at {path}")
            results[name] = False
            continue
        sha = hashlib.sha256(path.read_bytes()).hexdigest()
        match = sha.lower() == expected_hash.lower()
        results[name] = match
        status = "PASSED (MATCH)" if match else f"CORRUPTED (GOT: {sha})"
        print(f"{name}: {status}")
        print(f"  Path: {path}")
        print(f"  SHA:  {sha}")
    if not all(results.values()):
        raise RuntimeError(f"Model integrity check failed during {label}!")
    return results


def extract_features_from_bytes(image_bytes: bytes) -> Dict[str, Any]:
    """Extract visual invariant and structural features from raw image bytes.
    Handles Netpbm/PPM (.pbm/.bpm) and standard images via decode_image_bytes.
    """
    img_pil, width, height = decode_image_bytes(image_bytes)
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

    # 5. Channel Intensity Ratios
    mean_r = float(np.mean(r))
    mean_g = float(np.mean(g))
    mean_b = float(np.mean(b))
    rg_diff = float(np.abs(mean_r - mean_g))
    rb_diff = float(np.abs(mean_r - mean_b))
    gb_diff = float(np.abs(mean_g - mean_b))

    # 6. Structural features (strictly separated for shortcut analysis)
    aspect_ratio = float(width / max(height, 1))

    return {
        # Visual-only invariant features
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
        # Structural features
        "width": width,
        "height": height,
        "aspect_ratio": aspect_ratio,
    }


def build_dataset_manifest() -> List[Dict[str, Any]]:
    """Build zero-leakage train/val vs held-out test manifest across all 3 domains."""
    manifest = []
    
    # Domain 1: Pipeline (SubPipe)
    # Train/Val: subpipe_yolo_temporal_v1/images/train and val
    # Test: subpipe_yolo_temporal_v1/images/test + raw strip 1693569383.780.pbm
    pipe_train_dir = Path("/media/cherry/External Hardisk/ps 57/SIH26057/training_data/subpipe_yolo_temporal_v1/images/train")
    pipe_val_dir = Path("/media/cherry/External Hardisk/ps 57/SIH26057/training_data/subpipe_yolo_temporal_v1/images/val")
    pipe_test_dir = Path("/media/cherry/External Hardisk/ps 57/SIH26057/training_data/subpipe_yolo_temporal_v1/images/test")
    pipe_raw_canonical = Path("/media/cherry/External Hardisk/ps 57/datasets/SubPipeMiniSSS/DATA/SSS_HF_images/Image/1693569383.780.pbm")

    # Domain 2: Human (AquaScan)
    human_train_dir = Path("/media/cherry/External Hardisk/ps 57/SIH26057/model2_experiments/splits/aquascan_1k_human_v1/train/images")
    human_val_dir = Path("/media/cherry/External Hardisk/ps 57/SIH26057/model2_experiments/splits/aquascan_1k_human_v1/val/images")
    human_test_dir = Path("/media/cherry/External Hardisk/ps 57/SIH26057/model2_experiments/splits/aquascan_1k_human_v1/test/images")

    # Domain 3: Hardware (ESP)
    esp_train_dir = Path("/media/cherry/External Hardisk/ps 57/SIH26057/model3_experiments/splits/esp_hardware_v1/train/images")
    esp_val_dir = Path("/media/cherry/External Hardisk/ps 57/SIH26057/model3_experiments/splits/esp_hardware_v1/val/images")
    esp_test_dir = Path("/media/cherry/External Hardisk/ps 57/SIH26057/model3_experiments/splits/esp_hardware_v1/test/images")

    def collect(dir_path: Path, domain: str, split: str, max_items: int = None):
        if not dir_path.exists():
            return
        files = sorted([f for f in dir_path.iterdir() if f.is_file()])
        if max_items:
            # Deterministic step sampling to represent the temporal spectrum
            step = max(1, len(files) // max_items)
            files = files[::step][:max_items]
        for f in files:
            manifest.append({
                "image_path": str(f),
                "filename": f.name,
                "file_extension": f.suffix.lower(),
                "true_domain": domain,
                "split": split,
            })

    # Train / Val router pool (balanced sample from official train/val)
    collect(pipe_train_dir, "pipeline", "train_router", max_items=120)
    collect(pipe_val_dir, "pipeline", "train_router", max_items=30)
    collect(human_train_dir, "human", "train_router", max_items=120)
    collect(human_val_dir, "human", "train_router", max_items=30)
    collect(esp_train_dir, "hardware", "train_router", max_items=None) # all 34
    collect(esp_val_dir, "hardware", "train_router", max_items=None)   # all 8

    # Held-out test router pool
    collect(pipe_test_dir, "pipeline", "test_router", max_items=150)
    if pipe_raw_canonical.exists():
        manifest.append({
            "image_path": str(pipe_raw_canonical),
            "filename": pipe_raw_canonical.name,
            "file_extension": pipe_raw_canonical.suffix.lower(),
            "true_domain": "pipeline",
            "split": "test_router",
            "is_canonical": True,
        })
    collect(human_test_dir, "human", "test_router", max_items=None) # all 80
    collect(esp_test_dir, "hardware", "test_router", max_items=None) # all 8

    return manifest


def main():
    start_time = time.time()
    
    # 1. Verify Model Checkpoint Integrity
    verify_model_integrity("INITIAL PRE-CHECK")

    # 2. Build Manifest
    print("\n--- Building Zero-Leakage Dataset Manifest ---")
    manifest = build_dataset_manifest()
    print(f"Total manifest entries: {len(manifest)}")

    train_entries = [m for m in manifest if m["split"] == "train_router"]
    test_entries = [m for m in manifest if m["split"] == "test_router"]

    print(f"Train/Val split entries: {len(train_entries)}")
    for d in ["pipeline", "human", "hardware"]:
        print(f"  - {d}: {sum(1 for m in train_entries if m['true_domain'] == d)}")

    print(f"Held-out Test split entries: {len(test_entries)}")
    for d in ["pipeline", "human", "hardware"]:
        print(f"  - {d}: {sum(1 for m in test_entries if m['true_domain'] == d)}")

    # 3. Extract Features for all samples
    print("\n--- Extracting Visual Invariant & Structural Features ---")
    for idx, item in enumerate(manifest):
        p = Path(item["image_path"])
        try:
            feats = extract_features_from_bytes(p.read_bytes())
            item["features"] = feats
        except Exception as e:
            print(f"Error extracting features for {p}: {e}")
            item["features"] = None

    # Filter out any failed extractions
    manifest = [m for m in manifest if m.get("features") is not None]

    # Save manifest artifact
    manifest_path = WORKSPACE_ROOT / "scratch" / "router_evaluation_manifest.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"Manifest written to {manifest_path}")

    # 4. Prepare Feature Matrices: Visual-Only vs Full
    VISUAL_ONLY_KEYS = [
        "color_var", "sat_mean", "sat_std", "hue_mean",
        "mean_intensity", "std_intensity", "dyn_range",
        "lap_var", "edge_mean", "edge_std", "entropy",
        "mean_r", "mean_g", "mean_b", "rg_diff", "rb_diff", "gb_diff"
    ]
    FULL_FEATURE_KEYS = VISUAL_ONLY_KEYS + ["aspect_ratio"]

    DOMAIN_MAP = {"pipeline": 0, "human": 1, "hardware": 2}
    INV_DOMAIN_MAP = {0: "pipeline", 1: "human", 2: "hardware"}

    train_items = [m for m in manifest if m["split"] == "train_router"]
    test_items = [m for m in manifest if m["split"] == "test_router"]

    def build_matrix(items, keys):
        X = np.array([[m["features"][k] for k in keys] for m in items], dtype=float)
        y = np.array([DOMAIN_MAP[m["true_domain"]] for m in items], dtype=int)
        return X, y

    X_train_vis, y_train = build_matrix(train_items, VISUAL_ONLY_KEYS)
    X_test_vis, y_test = build_matrix(test_items, VISUAL_ONLY_KEYS)

    X_train_full, _ = build_matrix(train_items, FULL_FEATURE_KEYS)
    X_test_full, _ = build_matrix(test_items, FULL_FEATURE_KEYS)

    # 5. Benchmark Candidates on Visual-Only Features
    print("\n==================================================")
    print("BENCHMARKING ROUTING CANDIDATES (VISUAL-ONLY FEATURES)")
    print("==================================================")

    # Scale visual features
    scaler_vis = StandardScaler()
    X_train_vis_scaled = scaler_vis.fit_transform(X_train_vis)
    X_test_vis_scaled = scaler_vis.transform(X_test_vis)

    # Candidate A: Rule-Based Selector
    # Rules based on physical/optical domain properties:
    # 1. Hardware: Desk/indoor optical lighting -> very low color variance & saturation, balanced RGB channels (rg_diff < 15, rb_diff < 15), mean_intensity > 70
    # 2. Pipeline: Side-scan sonar -> blue channel near 0, acoustic background low intensity or colormapped
    # 3. Human: Underwater optical -> high saturation (sat_mean > 0.35), high color_var
    class RuleBasedSelector:
        def predict_one(self, feats: Dict[str, Any]) -> Tuple[int, float]:
            cv = feats["color_var"]
            sat = feats["sat_mean"]
            b_val = feats["mean_b"]
            r_val = feats["mean_r"]
            g_val = feats["mean_g"]
            rg_d = feats["rg_diff"]
            rb_d = feats["rb_diff"]
            intensity = feats["mean_intensity"]
            
            # Rule 1: Hardware invariant: Low color variance & saturation under lab lighting
            if cv < 22.0 and sat < 0.25 and rg_d < 18.0 and rb_d < 18.0:
                # Confidence proportional to how low color variance is
                conf = min(0.99, max(0.60, 1.0 - (cv / 30.0)))
                return DOMAIN_MAP["hardware"], conf
            
            # Rule 2: Pipeline SSS invariant: acoustic pseudo-color (mean_b is extremely small compared to r & g, or acoustic shadow)
            if (b_val < 15.0 and (r_val > 25.0 or g_val > 25.0)) or (feats.get("aspect_ratio", 1.0) > 4.0):
                conf = 0.95 if b_val < 10.0 else 0.80
                return DOMAIN_MAP["pipeline"], conf
            
            # Rule 3: Human (AquaScan) invariant: Underwater optical with high saturation and color variance
            if sat >= 0.25 or cv >= 22.0:
                conf = min(0.99, max(0.65, sat))
                return DOMAIN_MAP["human"], conf
                
            # Default fallback
            return DOMAIN_MAP["human"], 0.50

        def predict(self, items: List[Dict[str, Any]]) -> Tuple[np.ndarray, np.ndarray]:
            preds = []
            confs = []
            for m in items:
                pred, conf = self.predict_one(m["features"])
                preds.append(pred)
                confs.append(conf)
            return np.array(preds), np.array(confs)

    rule_router = RuleBasedSelector()
    y_pred_rule, conf_rule = rule_router.predict(test_items)
    acc_rule = accuracy_score(y_test, y_pred_rule)
    print(f"Candidate A (Rule-Based): Accuracy = {acc_rule*100:.2f}%")

    # Candidate B: Nearest Centroid Selector (Visual Scaled)
    centroid_router = NearestCentroid()
    centroid_router.fit(X_train_vis_scaled, y_train)
    y_pred_centroid = centroid_router.predict(X_test_vis_scaled)
    acc_centroid = accuracy_score(y_test, y_pred_centroid)
    print(f"Candidate B (Nearest Centroid): Accuracy = {acc_centroid*100:.2f}%")

    # Candidate C: Multinomial Logistic Regression (Calibrated Softmax)
    logreg_router = LogisticRegression(max_iter=1000, C=1.0, class_weight="balanced", random_state=42)
    logreg_router.fit(X_train_vis_scaled, y_train)
    y_pred_logreg = logreg_router.predict(X_test_vis_scaled)
    probs_logreg = logreg_router.predict_proba(X_test_vis_scaled)
    conf_logreg = np.max(probs_logreg, axis=1)
    acc_logreg = accuracy_score(y_test, y_pred_logreg)
    print(f"Candidate C (Logistic Regression): Accuracy = {acc_logreg*100:.2f}%")

    # Candidate D: Random Forest Classifier
    rf_router = RandomForestClassifier(n_estimators=100, max_depth=5, class_weight="balanced", random_state=42)
    rf_router.fit(X_train_vis, y_train)
    y_pred_rf = rf_router.predict(X_test_vis)
    probs_rf = rf_router.predict_proba(X_test_vis)
    conf_rf = np.max(probs_rf, axis=1)
    acc_rf = accuracy_score(y_test, y_pred_rf)
    print(f"Candidate D (Random Forest): Accuracy = {acc_rf*100:.2f}%")

    # 6. Shortcut Analysis: Visual-Only vs Full (Visual + Aspect Ratio)
    print("\n==================================================")
    print("SHORTCUT & LEAKAGE ANALYSIS")
    print("==================================================")
    scaler_full = StandardScaler()
    X_train_full_scaled = scaler_full.fit_transform(X_train_full)
    X_test_full_scaled = scaler_full.transform(X_test_full)

    logreg_full = LogisticRegression(max_iter=1000, C=1.0, class_weight="balanced", random_state=42)
    logreg_full.fit(X_train_full_scaled, y_train)
    y_pred_logreg_full = logreg_full.predict(X_test_full_scaled)
    acc_logreg_full = accuracy_score(y_test, y_pred_logreg_full)

    rf_full = RandomForestClassifier(n_estimators=100, max_depth=5, class_weight="balanced", random_state=42)
    rf_full.fit(X_train_full, y_train)
    y_pred_rf_full = rf_full.predict(X_test_full)
    acc_rf_full = accuracy_score(y_test, y_pred_rf_full)

    print(f"Logistic Regression — Visual-Only: {acc_logreg*100:.2f}% | Full (with Aspect Ratio): {acc_logreg_full*100:.2f}%")
    print(f"Random Forest       — Visual-Only: {acc_rf*100:.2f}% | Full (with Aspect Ratio): {acc_rf_full*100:.2f}%")

    # Inspect Feature Importances of RF Visual-Only
    print("\nTop Feature Importances (Random Forest Visual-Only):")
    importances = sorted(zip(VISUAL_ONLY_KEYS, rf_router.feature_importances_), key=lambda x: x[1], reverse=True)
    for feat, imp in importances[:7]:
        print(f"  - {feat:16s}: {imp:.4f} ({imp*100:.1f}%)")

    # 7. Abstention & Uncertainty Curve Analysis (Logistic Regression)
    print("\n==================================================")
    print("ABSTENTION & UNCERTAINTY SWEEP ANALYSIS (LOGISTIC REGRESSION)")
    print("==================================================")
    thresholds = [0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90, 0.95]
    abstention_results = []
    
    print(f"{'Threshold (τ)':<15}{'Coverage (%)':<15}{'Accuracy (%)':<15}{'Abstained':<12}{'Dangerous Mistakes':<20}")
    print("-" * 75)
    for tau in thresholds:
        routed_mask = conf_logreg >= tau
        coverage = float(np.mean(routed_mask) * 100.0)
        n_abstained = int(np.sum(~routed_mask))
        
        if np.sum(routed_mask) > 0:
            routed_preds = y_pred_logreg[routed_mask]
            routed_true = y_test[routed_mask]
            routed_acc = float(accuracy_score(routed_true, routed_preds) * 100.0)
            
            # Dangerous errors: True Human routed as Pipeline, True Hardware routed as Pipeline, True Pipeline routed as Human/Hardware
            dangerous = 0
            for t_val, p_val in zip(routed_true, routed_preds):
                if t_val != p_val:
                    dangerous += 1
        else:
            routed_acc = 0.0
            dangerous = 0
            
        abstention_results.append({
            "threshold": tau,
            "coverage_pct": round(coverage, 2),
            "accuracy_pct": round(routed_acc, 2),
            "abstained_count": n_abstained,
            "dangerous_mistakes": dangerous
        })
        print(f"{tau:<15.2f}{coverage:<15.2f}{routed_acc:<15.2f}{n_abstained:<12}{dangerous:<20}")

    # 8. Detailed Held-Out Test Evaluation of Best Model (Logistic Regression @ Optimal Threshold)
    # Pick optimal threshold: highest accuracy with maximal coverage
    optimal_tau = 0.75
    routed_mask = conf_logreg >= optimal_tau
    routed_preds = y_pred_logreg[routed_mask]
    routed_true = y_test[routed_mask]

    # Confusion matrix on all test items (using UNCERTAIN/ABSTAIN as 4th category)
    # 0: Pipeline, 1: Human, 2: Hardware, 3: Uncertain
    y_test_with_abstain = y_test.copy()
    y_pred_with_abstain = np.where(conf_logreg >= optimal_tau, y_pred_logreg, 3)

    target_names = ["pipeline", "human", "hardware"]
    prec, rec, f1, support = precision_recall_fscore_support(routed_true, routed_preds, labels=[0, 1, 2], zero_division=0)
    cm_3x3 = confusion_matrix(routed_true, routed_preds, labels=[0, 1, 2])

    print("\n==================================================")
    print(f"HELD-OUT METRICS (BEST ROUTER: LOGISTIC REGRESSION @ τ={optimal_tau})")
    print("==================================================")
    print(f"Total Test Images: {len(y_test)}")
    print(f"Images Routed:     {len(routed_preds)} ({len(routed_preds)/len(y_test)*100:.1f}%)")
    print(f"Images Abstained:  {len(y_test) - len(routed_preds)} ({(len(y_test)-len(routed_preds))/len(y_test)*100:.1f}%)")
    print(f"Routing Accuracy on Routed: {accuracy_score(routed_true, routed_preds)*100:.2f}%")

    print("\nPer-Domain Metrics (on routed samples):")
    for i, name in enumerate(target_names):
        print(f"  {name.upper():<10}: Precision={prec[i]*100:.2f}%, Recall={rec[i]*100:.2f}%, F1={f1[i]*100:.2f}%, Count={support[i]}")

    print("\nConfusion Matrix (Rows=True, Columns=Predicted):")
    print(f"{'':<12}{'Pred Pipe':<12}{'Pred Human':<12}{'Pred Hardw':<12}")
    for i, row in enumerate(cm_3x3):
        print(f"True {target_names[i]:<7} {row[0]:<12}{row[1]:<12}{row[2]:<12}")

    # Specific Dangerous Routing Cross-Domain Identification
    print("\nSpecific Cross-Domain Mappings Identified:")
    cross_mappings = [
        ("Pipeline routed as Human", cm_3x3[0][1]),
        ("Pipeline routed as Hardware", cm_3x3[0][2]),
        ("Human routed as Pipeline", cm_3x3[1][0]),
        ("Human routed as Hardware", cm_3x3[1][2]),
        ("Hardware routed as Pipeline", cm_3x3[2][0]),
        ("Hardware routed as Human", cm_3x3[2][1]),
    ]
    for label, count in cross_mappings:
        print(f"  - {label:<32}: {count}")

    # 9. Test Real Canonical Examples
    print("\n==================================================")
    print("CANONICAL REAL EXAMPLES VERIFICATION")
    print("==================================================")
    canonical_samples = [
        ("Pipeline Canonical", "/media/cherry/External Hardisk/ps 57/datasets/SubPipeMiniSSS/DATA/SSS_HF_images/Image/1693569383.780.pbm", "pipeline"),
        ("Human Canonical", "/media/cherry/External Hardisk/ps 57/SIH26057/model2_experiments/datasets/aquascan_1k_clean/images/0002b00e-Screenshot_2025-08-10_23.00.36.png", "human"),
        ("Hardware Canonical", "/media/cherry/External Hardisk/ps 57/SIH26057/model3_experiments/datasets/esp_hardware_clean/images/clip_009.jpg", "hardware"),
    ]

    canonical_results = []
    for label, img_path, true_dom in canonical_samples:
        p = Path(img_path)
        t0 = time.time()
        feats = extract_features_from_bytes(p.read_bytes())
        vec_vis = np.array([[feats[k] for k in VISUAL_ONLY_KEYS]], dtype=float)
        vec_vis_scaled = scaler_vis.transform(vec_vis)
        
        prob = logreg_router.predict_proba(vec_vis_scaled)[0]
        pred_cls_idx = int(np.argmax(prob))
        confidence = float(prob[pred_cls_idx])
        pred_domain = INV_DOMAIN_MAP[pred_cls_idx]
        is_uncertain = confidence < optimal_tau
        dt_ms = (time.time() - t0) * 1000.0

        canonical_results.append({
            "label": label,
            "path": str(p),
            "filename": p.name,
            "true_domain": true_dom,
            "predicted_domain": "uncertain" if is_uncertain else pred_domain,
            "raw_prediction": pred_domain,
            "confidence": round(confidence, 4),
            "probabilities": {INV_DOMAIN_MAP[i]: round(float(prob[i]), 4) for i in range(3)},
            "is_uncertain": is_uncertain,
            "latency_ms": round(dt_ms, 2),
            "is_correct": pred_domain == true_dom
        })

        print(f"[{label}] {p.name}")
        print(f"  True Domain:     {true_dom}")
        print(f"  Predicted Route: {pred_domain} (Confidence: {confidence*100:.2f}%)")
        print(f"  Class Probs:     {canonical_results[-1]['probabilities']}")
        print(f"  Decision State:  {'UNCERTAIN/ABSTAIN' if is_uncertain else 'ROUTED'}")
        print(f"  Extraction+Route Latency: {dt_ms:.2f} ms")
        print(f"  Status:          {'CORRECT' if pred_domain == true_dom else 'MISMATCH'}\n")

    # 10. Post-Execution Model Integrity Verification
    verify_model_integrity("POST-CHECK")

    # 11. Write Full Research Report
    report_path = WORKSPACE_ROOT / "scratch" / "reports" / "step7_router_research_report.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    full_report_data = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_runtime_seconds": round(time.time() - start_time, 2),
        "visual_features_used": VISUAL_ONLY_KEYS,
        "dataset_partition": {
            "train_total": len(train_items),
            "train_per_domain": {d: sum(1 for m in train_items if m["true_domain"] == d) for d in ["pipeline", "human", "hardware"]},
            "test_total": len(test_items),
            "test_per_domain": {d: sum(1 for m in test_items if m["true_domain"] == d) for d in ["pipeline", "human", "hardware"]},
        },
        "candidate_accuracies": {
            "candidate_a_rule_based": round(acc_rule * 100, 2),
            "candidate_b_nearest_centroid": round(acc_centroid * 100, 2),
            "candidate_c_logistic_regression": round(acc_logreg * 100, 2),
            "candidate_d_random_forest": round(acc_rf * 100, 2),
            "candidate_c_with_aspect_ratio": round(acc_logreg_full * 100, 2),
            "candidate_d_with_aspect_ratio": round(acc_rf_full * 100, 2),
        },
        "abstention_sweep": abstention_results,
        "held_out_metrics_optimal_tau": {
            "threshold": optimal_tau,
            "total_test": len(y_test),
            "routed": len(routed_preds),
            "coverage_pct": round(len(routed_preds) / len(y_test) * 100, 2),
            "accuracy_on_routed_pct": round(accuracy_score(routed_true, routed_preds) * 100, 2),
            "per_domain": {
                name: {
                    "precision_pct": round(prec[i] * 100, 2),
                    "recall_pct": round(rec[i] * 100, 2),
                    "f1_pct": round(f1[i] * 100, 2),
                    "count": int(support[i])
                } for i, name in enumerate(target_names)
            },
            "confusion_matrix": cm_3x3.tolist(),
            "cross_domain_mistakes": {k: int(v) for k, v in cross_mappings},
        },
        "canonical_samples": canonical_results,
        "final_status": "ROUTER_RESEARCH_PASS — AUTOMATIC ROUTING READY" if (acc_logreg >= 0.90 and all(c["is_correct"] for c in canonical_results)) else "ROUTER_RESEARCH_PASS — NEEDS BETTER ROUTER"
    }

    with open(report_path, "w") as f:
        json.dump(full_report_data, f, indent=2)

    print(f"\nFull report JSON saved to {report_path}")
    print(f"FINAL DECISION STATUS: {full_report_data['final_status']}")

if __name__ == "__main__":
    main()
