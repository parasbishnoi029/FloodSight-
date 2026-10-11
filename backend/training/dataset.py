"""
FloodSight AI — Sen1Floods11 PyTorch Dataset Loader
Loads Sentinel-2 multi-band GeoTIFF chips and corresponding ground-truth masks.
"""

import os
import csv
from pathlib import Path
from typing import Optional, Callable, List, Tuple
import numpy as np
import tifffile
import torch
from torch.utils.data import Dataset

class Sen1Floods11Dataset(Dataset):
    """
    PyTorch Dataset for Sen1Floods11 Sentinel-2 Optical & Ground Truth segmentation.
    """
    def __init__(
        self,
        data_dir: str,
        split_file: Optional[str] = None,
        transform: Optional[Callable] = None,
        channels: List[int] = [3, 2, 1],  # B4 (Red), B3 (Green), B2 (Blue)
        mean: List[float] = [0.158, 0.164, 0.151],
        std: List[float] = [0.132, 0.128, 0.134]
    ):
        self.data_dir = Path(data_dir)
        self.s2_dir = self.data_dir / "S2Hand"
        self.lbl_dir = self.data_dir / "LabelHand"
        self.transform = transform
        self.channels = channels
        self.mean = np.array(mean, dtype=np.float32).reshape(3, 1, 1)
        self.std = np.array(std, dtype=np.float32).reshape(3, 1, 1)

        self.samples = []
        if split_file and Path(split_file).exists():
            with open(split_file, "r") as f:
                reader = csv.reader(f)
                for row in reader:
                    if not row: continue
                    chip_id = row[0].replace("_S1Hand.tif", "").replace("_S2Hand.tif", "").replace(".tif", "")
                    s2_path = self.s2_dir / f"{chip_id}_S2Hand.tif"
                    lbl_path = self.lbl_dir / f"{chip_id}_LabelHand.tif"
                    if s2_path.exists() and lbl_path.exists():
                        self.samples.append((str(s2_path), str(lbl_path), chip_id))

        if not self.samples:
            # Discover available pairs directly in directory
            for s2_file in sorted(self.s2_dir.glob("*_S2Hand.tif")):
                chip_id = s2_file.name.replace("_S2Hand.tif", "")
                lbl_file = self.lbl_dir / f"{chip_id}_LabelHand.tif"
                if lbl_file.exists():
                    self.samples.append((str(s2_file), str(lbl_file), chip_id))

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor, str]:
        s2_path, lbl_path, chip_id = self.samples[idx]

        # 1. Load Raw Sentinel-2 Multiband Image
        raw_s2 = tifffile.imread(s2_path)
        if raw_s2.ndim == 3 and raw_s2.shape[0] in [12, 13]:
            # Select target bands (B4, B3, B2)
            img = raw_s2[self.channels, :, :].astype(np.float32)
        elif raw_s2.ndim == 3 and raw_s2.shape[2] in [3, 4]:
            img = np.transpose(raw_s2[:, :, :3], (2, 0, 1)).astype(np.float32)
        elif raw_s2.ndim == 3 and raw_s2.shape[0] >= 3:
            img = raw_s2[:3, :, :].astype(np.float32)
        elif raw_s2.ndim == 2:
            img = np.repeat(np.expand_dims(raw_s2, 0), 3, axis=0).astype(np.float32)
        else:
            img = raw_s2[:3, :, :].astype(np.float32)

        # 2. Rescale Reflectance: DN / 10000.0 clipped to [0, 1]
        if img.max() > 1.0:
            if img.max() > 255.0:
                img = np.clip(img / 10000.0, 0.0, 1.0)
            else:
                img = np.clip(img / 255.0, 0.0, 1.0)

        # 3. Load Ground Truth Mask (0: land, 1: flood, -1: invalid/permanent)
        lbl = tifffile.imread(lbl_path).astype(np.int64)
        if lbl.ndim == 3:
            lbl = lbl[0, :, :]

        # 4. Apply Spatial Augmentations
        if self.transform:
            img, lbl = self.transform(img, lbl)

        # 5. Standardize Optical Distribution
        img = (img - self.mean) / self.std

        # 6. Build Target and Valid Mask Tensors
        valid_mask = (lbl >= 0).astype(np.float32)
        target = np.clip(lbl, 0, 1).astype(np.float32)

        return (
            torch.from_numpy(img).float(),
            torch.from_numpy(target).unsqueeze(0).float(),
            torch.from_numpy(valid_mask).unsqueeze(0).float(),
            chip_id
        )
