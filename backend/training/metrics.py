"""
FloodSight AI — Quantitative Evaluation Metrics
Calculates strictly computed IoU, Dice, Precision, Recall, F1, and Confusion Matrices.
"""

from typing import Dict
import torch
import numpy as np

def compute_segmentation_metrics(
    logits: torch.Tensor,
    targets: torch.Tensor,
    valid_mask: torch.Tensor,
    threshold: float = 0.50
) -> Dict[str, float]:
    """
    Computes IoU, Dice, Precision, Recall, F1, and Pixel Accuracy strictly on valid pixels.
    """
    probs = torch.sigmoid(logits)
    preds = (probs >= threshold).float()

    # Filter by valid mask
    preds_valid = preds[valid_mask == 1.0].cpu().numpy().astype(bool)
    targets_valid = targets[valid_mask == 1.0].cpu().numpy().astype(bool)

    if len(targets_valid) == 0:
        return {
            "iou": 0.0,
            "dice": 0.0,
            "precision": 0.0,
            "recall": 0.0,
            "f1": 0.0,
            "pixel_accuracy": 0.0
        }

    tp = np.logical_and(preds_valid, targets_valid).sum()
    fp = np.logical_and(preds_valid, ~targets_valid).sum()
    fn = np.logical_and(~preds_valid, targets_valid).sum()
    tn = np.logical_and(~preds_valid, ~targets_valid).sum()

    precision = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
    recall = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
    f1 = float((2 * precision * recall) / (precision + recall)) if (precision + recall) > 0 else 0.0
    iou = float(tp / (tp + fp + fn)) if (tp + fp + fn) > 0 else 0.0
    dice = float((2 * tp) / (2 * tp + fp + fn)) if (2 * tp + fp + fn) > 0 else 0.0
    pixel_acc = float((tp + tn) / len(targets_valid))

    return {
        "iou": float(iou),
        "dice": float(dice),
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
        "pixel_accuracy": float(pixel_acc),
        "tp": int(tp),
        "fp": int(fp),
        "fn": int(fn),
        "tn": int(tn)
    }
