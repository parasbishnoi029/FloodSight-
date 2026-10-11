"""
FloodSight AI — Training Configuration Constants & Helpers
"""

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "datasets" / "sen1floods11" / "v1.1" / "data" / "flood_events" / "HandLabeled"
SPLITS_DIR = BASE_DIR / "datasets" / "sen1floods11" / "v1.1" / "splits" / "flood_handlabeled"
MODELS_DIR = BASE_DIR / "models" / "flood_segmentation"
ARTIFACTS_DIR = BASE_DIR / "artifacts"

# Model hyperparameters
CONFIG = {
    "model_name": "FloodSight-UNet-ResNet34",
    "version": "1.0.0",
    "in_channels": 3,
    "num_classes": 1,
    "batch_size": 4,
    "epochs": 5,
    "learning_rate": 3e-4,
    "weight_decay": 1e-4,
    "bce_weight": 0.5,
    "dice_weight": 0.5,
    "threshold": 0.50,
    "image_size": [512, 512],
    "seed": 42
}
