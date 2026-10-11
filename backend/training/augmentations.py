"""
FloodSight AI — Satellite Spatial Augmentations
Applies geographically valid spatial transformations synchronously to image and mask arrays.
"""

import random
from typing import Tuple
import numpy as np

class SatelliteAugmentations:
    def __init__(
        self,
        horizontal_flip_prob: float = 0.5,
        vertical_flip_prob: float = 0.5,
        rot90_prob: float = 0.5,
        brightness_contrast_prob: float = 0.3
    ):
        self.hflip_prob = horizontal_flip_prob
        self.vflip_prob = vertical_flip_prob
        self.rot90_prob = rot90_prob
        self.bc_prob = brightness_contrast_prob

    def __call__(self, image: np.ndarray, mask: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        # image shape: (C, H, W), mask shape: (H, W)

        # 1. Random Horizontal Flip
        if random.random() < self.hflip_prob:
            image = np.flip(image, axis=2).copy()
            mask = np.flip(mask, axis=1).copy()

        # 2. Random Vertical Flip
        if random.random() < self.vflip_prob:
            image = np.flip(image, axis=1).copy()
            mask = np.flip(mask, axis=0).copy()

        # 3. Random 90/180/270 degree rotation
        if random.random() < self.rot90_prob:
            k = random.randint(1, 3)
            image = np.rot90(image, k=k, axes=(1, 2)).copy()
            mask = np.rot90(mask, k=k, axes=(0, 1)).copy()

        # 4. Mild Brightness / Contrast Jitter on Optical Reflectance
        if random.random() < self.bc_prob:
            alpha = random.uniform(0.9, 1.1)  # contrast
            beta = random.uniform(-0.05, 0.05)  # brightness
            image = np.clip(image * alpha + beta, 0.0, 1.0)

        return image, mask
