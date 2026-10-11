"""
FloodSight AI — Reproducible Model Training & Controlled Fine-Tuning Script
Runs end-to-end training on Sen1Floods11 dataset and records real training curves.
"""

import os
import sys
import time
import json
import random
import hashlib
from pathlib import Path
from typing import Dict, Any, List

import numpy as np
import torch
from torch.utils.data import DataLoader

from .dataset import Sen1Floods11Dataset
from .augmentations import SatelliteAugmentations
from .losses import CompoundBCEDiceLoss
from .metrics import compute_segmentation_metrics
from .model import FloodSightUNetResNet34

def set_seed(seed: int = 42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)

def compute_file_sha256(filepath: Path) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()

def run_training(
    epochs: int = 5,
    batch_size: int = 4,
    lr: float = 3e-4,
    weight_decay: float = 1e-4,
    bce_weight: float = 0.5,
    dice_weight: float = 0.5,
    seed: int = 42
) -> Dict[str, Any]:
    set_seed(seed)
    start_time = time.time()

    base_dir = Path(__file__).resolve().parent.parent.parent
    data_dir = base_dir / "datasets" / "sen1floods11" / "v1.1" / "data" / "flood_events" / "HandLabeled"
    splits_dir = base_dir / "datasets" / "sen1floods11" / "v1.1" / "splits" / "flood_handlabeled"
    models_dir = base_dir / "models" / "flood_segmentation"
    artifacts_dir = base_dir / "artifacts"

    models_dir.mkdir(parents=True, exist_ok=True)
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    val_split_file = splits_dir / "flood_val_data.csv"
    if not val_split_file.exists() and (splits_dir / "flood_valid_data.csv").exists():
        val_split_file = splits_dir / "flood_valid_data.csv"

    # 1. Prepare Datasets & Loaders
    aug = SatelliteAugmentations()
    train_dataset = Sen1Floods11Dataset(
        data_dir=str(data_dir),
        split_file=str(splits_dir / "flood_train_data.csv"),
        transform=aug
    )
    val_dataset = Sen1Floods11Dataset(
        data_dir=str(data_dir),
        split_file=str(val_split_file),
        transform=None
    )

    print(f"Loaded Train Dataset: {len(train_dataset)} chips | Val Dataset: {len(val_dataset)} chips")

    if len(train_dataset) == 0 or len(val_dataset) == 0:
        error_msg = (
            "DATASET_NOT_AVAILABLE: No Sen1Floods11 TIFF imagery files found in "
            f"'{data_dir}'. As per strict ML pipeline verification rules: DO NOT TRAIN. "
            "Please download genuine TIFF chips to 'datasets/sen1floods11/v1.1/data/flood_events/HandLabeled/'."
        )
        print(f"\n[ABORT] {error_msg}\n")
        raise RuntimeError(error_msg)

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=0)

    # 2. Model & Optimizer Setup
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training Device: {device} ({'GPU' if torch.cuda.is_available() else 'CPU'})")

    model = FloodSightUNetResNet34(in_channels=3, num_classes=1, pretrained=True).to(device)
    criterion = CompoundBCEDiceLoss(bce_weight=bce_weight, dice_weight=dice_weight)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=weight_decay)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-6)

    best_val_iou = -1.0
    best_epoch = 0
    history = []

    best_checkpoint_path = models_dir / "floodsight_unet_resnet34_best.pth"

    # 3. Training Loop
    for epoch in range(1, epochs + 1):
        epoch_start = time.time()
        model.train()
        train_loss_total = 0.0
        train_batches = 0

        for images, targets, valid_masks, _ in train_loader:
            images = images.to(device)
            targets = targets.to(device)
            valid_masks = valid_masks.to(device)

            optimizer.zero_grad()
            logits = model(images)
            loss = criterion(logits, targets, valid_masks)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

            train_loss_total += loss.item()
            train_batches += 1

        scheduler.step()
        avg_train_loss = train_loss_total / max(1, train_batches)

        # 4. Validation Loop
        model.eval()
        val_loss_total = 0.0
        val_batches = 0
        all_logits = []
        all_targets = []
        all_masks = []

        with torch.no_grad():
            for images, targets, valid_masks, _ in val_loader:
                images = images.to(device)
                targets = targets.to(device)
                valid_masks = valid_masks.to(device)

                logits = model(images)
                loss = criterion(logits, targets, valid_masks)

                val_loss_total += loss.item()
                val_batches += 1

                all_logits.append(logits.cpu())
                all_targets.append(targets.cpu())
                all_masks.append(valid_masks.cpu())

        avg_val_loss = val_loss_total / max(1, val_batches)

        # Compute validation metrics
        if all_logits:
            cat_logits = torch.cat(all_logits, dim=0)
            cat_targets = torch.cat(all_targets, dim=0)
            cat_masks = torch.cat(all_masks, dim=0)
            metrics = compute_segmentation_metrics(cat_logits, cat_targets, cat_masks, threshold=0.50)
        else:
            metrics = {"iou": 0.0, "dice": 0.0, "precision": 0.0, "recall": 0.0, "f1": 0.0}

        val_iou = metrics["iou"]
        val_dice = metrics["dice"]
        duration = time.time() - epoch_start

        epoch_record = {
            "epoch": epoch,
            "train_loss": round(avg_train_loss, 4),
            "val_loss": round(avg_val_loss, 4),
            "val_iou": round(val_iou, 4),
            "val_dice": round(val_dice, 4),
            "precision": round(metrics["precision"], 4),
            "recall": round(metrics["recall"], 4),
            "f1": round(metrics["f1"], 4),
            "duration_seconds": round(duration, 2)
        }
        history.append(epoch_record)
        print(f"Epoch [{epoch}/{epochs}] Train Loss: {avg_train_loss:.4f} | Val Loss: {avg_val_loss:.4f} | Val IoU: {val_iou:.4f} | Val Dice: {val_dice:.4f} ({duration:.1f}s)")

        # Save Best Checkpoint
        if val_iou > best_val_iou or epoch == 1:
            best_val_iou = val_iou
            best_epoch = epoch
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "val_iou": val_iou,
                "val_dice": val_dice,
                "metrics": metrics,
                "config": {
                    "architecture": "U-Net ResNet-34",
                    "in_channels": 3,
                    "num_classes": 1,
                    "lr": lr,
                    "batch_size": batch_size,
                    "bce_weight": bce_weight,
                    "dice_weight": dice_weight
                }
            }, str(best_checkpoint_path))

    total_training_duration = time.time() - start_time
    print(f"\nTraining completed in {total_training_duration:.1f}s. Best Epoch: {best_epoch} (Val IoU: {best_val_iou:.4f})")

    # 5. Save History & Manifest Artifacts
    history_file = artifacts_dir / "training_history.json"
    with open(history_file, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2)

    # Compute actual SHA-256 of checkpoint
    checkpoint_sha256 = compute_file_sha256(best_checkpoint_path)

    manifest = {
        "model_name": "FloodSight-UNet-ResNet34",
        "model_version": "1.0.0",
        "checkpoint_filename": "floodsight_unet_resnet34_best.pth",
        "checkpoint_sha256": checkpoint_sha256,
        "checkpoint_size_bytes": best_checkpoint_path.stat().st_size,
        "dataset": "Sen1Floods11",
        "dataset_version": "1.1",
        "architecture": "U-Net with Pretrained ResNet-34 Backbone",
        "input_contract": {
            "modality": "Sentinel-2 MSI Optical True-Color RGB",
            "channels": 3,
            "channel_names": ["B4_Red", "B3_Green", "B2_Blue"],
            "dimensions": [512, 512],
            "normalization_mean": [0.158, 0.164, 0.151],
            "normalization_std": [0.132, 0.128, 0.134]
        },
        "best_epoch": best_epoch,
        "validation_metrics": {
            "iou": round(best_val_iou, 4),
            "dice": round(history[best_epoch-1]["val_dice"], 4),
            "precision": round(history[best_epoch-1]["precision"], 4),
            "recall": round(history[best_epoch-1]["recall"], 4),
            "f1": round(history[best_epoch-1]["f1"], 4)
        },
        "training_hardware": str(device).upper(),
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

    manifest_file = models_dir / "model_manifest.json"
    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    # Save to artifacts directory as well
    with open(artifacts_dir / "model_manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    return manifest

if __name__ == "__main__":
    run_training(epochs=5, batch_size=4, lr=3e-4)
