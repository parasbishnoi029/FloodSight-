"""
FloodSight AI — Locked Test Evaluation & Visual Artifact Generator
Evaluates trained checkpoint on held-out test set and saves quantitative metrics and visual comparisons.
"""

import time
import json
from pathlib import Path
from typing import Dict, Any, List

import numpy as np
import torch
from torch.utils.data import DataLoader
from PIL import Image

from .dataset import Sen1Floods11Dataset
from .metrics import compute_segmentation_metrics
from .model import FloodSightUNetResNet34

def evaluate_checkpoint(
    checkpoint_path: str,
    test_split_file: str,
    data_dir: str,
    batch_size: int = 1
) -> Dict[str, Any]:
    base_dir = Path(__file__).resolve().parent.parent.parent
    artifacts_dir = base_dir / "artifacts"
    eval_img_dir = artifacts_dir / "evaluation_images"
    eval_img_dir.mkdir(parents=True, exist_ok=True)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Evaluation Device: {device}")

    if not Path(checkpoint_path).exists():
        error_msg = f"CHECKPOINT_NOT_AVAILABLE: No checkpoint found at '{checkpoint_path}'. Train a real model before running locked test evaluation."
        print(f"\n[ABORT] {error_msg}\n")
        raise RuntimeError(error_msg)

    # Load Model
    model = FloodSightUNetResNet34(in_channels=3, num_classes=1, pretrained=False).to(device)
    checkpoint = torch.load(checkpoint_path, map_location=device)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    test_dataset = Sen1Floods11Dataset(
        data_dir=data_dir,
        split_file=test_split_file,
        transform=None
    )

    if len(test_dataset) == 0:
        error_msg = f"DATASET_NOT_AVAILABLE: Test dataset at '{data_dir}' contains 0 chips. Place genuine test TIFFs in datasets/sen1floods11/v1.1/data/flood_events/HandLabeled/ before running evaluation."
        print(f"\n[ABORT] {error_msg}\n")
        raise RuntimeError(error_msg)

    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False, num_workers=0)
    print(f"Loaded Held-Out Test Set: {len(test_dataset)} chips")

    all_logits = []
    all_targets = []
    all_masks = []
    latencies = []

    with torch.no_grad():
        for i, (images, targets, valid_masks, chip_ids) in enumerate(test_loader):
            images = images.to(device)
            targets = targets.to(device)
            valid_masks = valid_masks.to(device)

            # Benchmark inference latency
            t0 = time.perf_counter()
            logits = model(images)
            t1 = time.perf_counter()
            latency_ms = (t1 - t0) * 1000.0
            latencies.append(latency_ms)

            all_logits.append(logits.cpu())
            all_targets.append(targets.cpu())
            all_masks.append(valid_masks.cpu())

            # Save Visual Artifacts for First 5 Test Samples
            if i < 5:
                chip_id = chip_ids[0]
                save_visual_artifacts(images[0], targets[0], logits[0], valid_masks[0], chip_id, eval_img_dir)

    cat_logits = torch.cat(all_logits, dim=0)
    cat_targets = torch.cat(all_targets, dim=0)
    cat_masks = torch.cat(all_masks, dim=0)

    # 1. Evaluate Threshold Sensitivity on Test Samples
    threshold_results = {}
    for th in [0.30, 0.40, 0.50, 0.60, 0.70]:
        m = compute_segmentation_metrics(cat_logits, cat_targets, cat_masks, threshold=th)
        threshold_results[f"threshold_{th:.2f}"] = {
            "iou": round(m["iou"], 4),
            "dice": round(m["dice"], 4),
            "precision": round(m["precision"], 4),
            "recall": round(m["recall"], 4)
        }

    # Final Selected Threshold = 0.50
    final_metrics = compute_segmentation_metrics(cat_logits, cat_targets, cat_masks, threshold=0.50)

    mean_latency = float(np.mean(latencies))
    median_latency = float(np.median(latencies))

    eval_summary = {
        "dataset": "Sen1Floods11 (v1.1 Hand-Labeled Test Split)",
        "test_chips_count": len(test_dataset),
        "primary_metrics": {
            "iou": round(final_metrics["iou"], 4),
            "dice": round(final_metrics["dice"], 4),
            "precision": round(final_metrics["precision"], 4),
            "recall": round(final_metrics["recall"], 4),
            "f1": round(final_metrics["f1"], 4),
            "pixel_accuracy": round(final_metrics["pixel_accuracy"], 4)
        },
        "threshold_sensitivity": threshold_results,
        "inference_latency_ms": {
            "mean": round(mean_latency, 2),
            "median": round(median_latency, 2),
            "min": round(float(np.min(latencies)), 2),
            "max": round(float(np.max(latencies)), 2),
            "hardware": str(device).upper()
        },
        "confusion_matrix": {
            "true_positives": final_metrics["tp"],
            "false_positives": final_metrics["fp"],
            "false_negatives": final_metrics["fn"],
            "true_negatives": final_metrics["tn"]
        },
        "evaluated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

    # Save to artifacts
    metrics_file = artifacts_dir / "evaluation_metrics.json"
    with open(metrics_file, "w", encoding="utf-8") as f:
        json.dump(eval_summary, f, indent=2)

    # Generate Markdown Report
    report_md = f"""# FloodSight AI — Model Evaluation Report

**Model**: FloodSight-UNet-ResNet34 (v1.0.0)  
**Dataset**: Sen1Floods11 Sentinel-2 Optical (Held-Out Test Set)  
**Hardware Evaluated**: {device}  

---

## 1. Primary Segmentation Metrics (Threshold $\\tau = 0.50$)

| Metric | Measured Test Value | Description |
| :--- | :--- | :--- |
| **Flood IoU (Intersection over Union)** | **{eval_summary['primary_metrics']['iou']}** | Overlap between predicted flood surface and expert label |
| **Flood Dice / F1 Score** | **{eval_summary['primary_metrics']['dice']}** | Harmonic mean of precision and recall |
| **Precision** | **{eval_summary['primary_metrics']['precision']}** | True flood pixels / Total predicted flood pixels |
| **Recall** | **{eval_summary['primary_metrics']['recall']}** | True flood pixels / Total actual ground-truth flood pixels |
| **Pixel Accuracy** | **{eval_summary['primary_metrics']['pixel_accuracy']}** | Overall percentage of correctly classified valid pixels |

---

## 2. Real Inference Latency ($512 \\times 512$ tile)

- **Mean Latency**: **{eval_summary['inference_latency_ms']['mean']} ms**
- **Median Latency**: **{eval_summary['inference_latency_ms']['median']} ms**
- **Hardware Architecture**: {eval_summary['inference_latency_ms']['hardware']}
"""
    with open(artifacts_dir / "evaluation_report.md", "w", encoding="utf-8") as f:
        f.write(report_md)

    print(f"Test Evaluation Complete. Flood IoU: {final_metrics['iou']:.4f} | Mean Latency: {mean_latency:.1f}ms")
    return eval_summary

def save_visual_artifacts(
    img_tensor: torch.Tensor,
    tgt_tensor: torch.Tensor,
    log_tensor: torch.Tensor,
    mask_tensor: torch.Tensor,
    chip_id: str,
    output_dir: Path
):
    """
    Generates 4-panel visual comparison: [Original S2 | Ground Truth | Predicted Probability | Overlay]
    """
    # Denormalize Image: img = img * std + mean
    mean = np.array([0.158, 0.164, 0.151]).reshape(3, 1, 1)
    std = np.array([0.132, 0.128, 0.134]).reshape(3, 1, 1)
    img_np = img_tensor.cpu().numpy() * std + mean
    img_np = np.clip(img_np * 255.0, 0, 255).astype(np.uint8)
    img_rgb = np.transpose(img_np, (1, 2, 0))

    tgt_np = tgt_tensor[0].cpu().numpy().astype(np.uint8) * 255
    prob_np = torch.sigmoid(log_tensor[0]).cpu().numpy()
    pred_np = (prob_np >= 0.50).astype(np.uint8) * 255

    # Overlay: Cyan highlight on predicted flood pixels
    overlay_rgb = img_rgb.copy()
    flood_idx = pred_np > 0
    overlay_rgb[flood_idx, 0] = (overlay_rgb[flood_idx, 0] * 0.4 + 0).astype(np.uint8)
    overlay_rgb[flood_idx, 1] = (overlay_rgb[flood_idx, 1] * 0.4 + 212).astype(np.uint8) # Cyan
    overlay_rgb[flood_idx, 2] = (overlay_rgb[flood_idx, 2] * 0.4 + 255).astype(np.uint8)

    # Save individual artifact images
    Image.fromarray(img_rgb).save(output_dir / f"{chip_id}_input.png")
    Image.fromarray(tgt_np).save(output_dir / f"{chip_id}_ground_truth.png")
    Image.fromarray((prob_np * 255).astype(np.uint8)).save(output_dir / f"{chip_id}_probability.png")
    Image.fromarray(pred_np).save(output_dir / f"{chip_id}_prediction.png")
    Image.fromarray(overlay_rgb).save(output_dir / f"{chip_id}_overlay.png")

if __name__ == "__main__":
    base = Path(__file__).resolve().parent.parent.parent
    ckpt = str(base / "models" / "flood_segmentation" / "floodsight_unet_resnet34_best.pth")
    test_csv = str(base / "datasets" / "sen1floods11" / "v1.1" / "splits" / "flood_handlabeled" / "flood_test_data.csv")
    data = str(base / "datasets" / "sen1floods11" / "v1.1" / "data" / "flood_events" / "HandLabeled")
    if Path(ckpt).exists():
        evaluate_checkpoint(ckpt, test_csv, data)
