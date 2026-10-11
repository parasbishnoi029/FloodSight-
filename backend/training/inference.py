"""
FloodSight AI — Offline / CLI Flood Inference Engine
Runs single-tile or batch inference with post-processing and morphological cleanup.
"""

import time
import math
from pathlib import Path
from typing import Dict, Any, Tuple, Optional, List
import numpy as np
try:
    import torch
except ImportError:
    torch = None

from PIL import Image

try:
    from .model import FloodSightUNetResNet34
except Exception:
    FloodSightUNetResNet34 = None

class FloodSegmenter:
    """
    Singleton inference class that loads weights once and provides high-speed prediction.
    """
    def __init__(self, checkpoint_path: str, device: Optional[str] = None):
        if torch is None or FloodSightUNetResNet34 is None:
            raise RuntimeError("PyTorch is not available. Please install torch to run model inference.")
        self.device = torch.device(device if device else ("cuda" if torch.cuda.is_available() else "cpu"))
        self.model = FloodSightUNetResNet34(in_channels=3, num_classes=1, pretrained=False).to(self.device)
        
        checkpoint = torch.load(checkpoint_path, map_location=self.device)
        self.model.load_state_dict(checkpoint["model_state_dict"])
        self.model.eval()

        self.mean = np.array([0.158, 0.164, 0.151], dtype=np.float32).reshape(3, 1, 1)
        self.std = np.array([0.132, 0.128, 0.134], dtype=np.float32).reshape(3, 1, 1)

    def preprocess_image(self, arr: np.ndarray) -> Tuple[Any, np.ndarray]:
        """
        Prepares exact (H, W, 3) image for model inference.
        Enforces that a 3-channel model cannot receive 1-, 4-, 12-, or 13-channel arrays
        without an explicit, validated conversion pipeline beforehand.
        """
        if not isinstance(arr, np.ndarray):
            raise TypeError(f"Expected numpy ndarray, got {type(arr)}")
        if arr.ndim != 3 or arr.shape[2] != 3:
            raise ValueError(
                f"Exact model input contract violation: Expected 3-channel array of shape (H, W, 3), "
                f"got shape {arr.shape}. Multi-band (4, 12, 13) or single-band (1) rasters must pass "
                "through SentinelBandConversionPipeline before model inference."
            )

        rgb = arr.astype(np.float32)

        # Scale reflectance if 16-bit or large
        if rgb.max() > 1.0:
            if rgb.max() > 255.0:
                rgb_norm = np.clip(rgb / 10000.0, 0.0, 1.0)
            else:
                rgb_norm = np.clip(rgb / 255.0, 0.0, 1.0)
        else:
            rgb_norm = np.clip(rgb, 0.0, 1.0)

        # Shape: (3, H, W)
        tensor_in = np.transpose(rgb_norm, (2, 0, 1))
        tensor_in = (tensor_in - self.mean) / self.std

        if torch is not None:
            tensor_torch = torch.from_numpy(tensor_in).unsqueeze(0).float()
        else:
            tensor_torch = np.expand_dims(tensor_in, 0).astype(np.float32)
        return tensor_torch, rgb_norm

    def predict(
        self,
        arr: np.ndarray,
        threshold: float = 0.50,
        geo_meta: Optional[dict] = None
    ) -> Dict[str, Any]:
        t0 = time.perf_counter()
        tensor_torch, rgb_norm = self.preprocess_image(arr)
        tensor_torch = tensor_torch.to(self.device)

        with torch.no_grad():
            logits = self.model(tensor_torch)
            probs = torch.sigmoid(logits)[0, 0].cpu().numpy()

        t1 = time.perf_counter()
        inference_latency_ms = (t1 - t0) * 1000.0

        # Post-Processing: Binary Thresholding
        mask_binary = (probs >= threshold).astype(np.uint8)
        
        # Valid vs NoData pixels handling
        nodata_val = geo_meta.get("nodata") if geo_meta else None
        if nodata_val is not None:
            valid_mask = (arr[:, :, 0] != nodata_val)
        else:
            # Satellite margin check: pixels where all optical channels are 0
            valid_mask = np.any(arr > 0, axis=-1) if arr.ndim == 3 else np.ones(mask_binary.shape, dtype=bool)

        valid_pixels = int(np.sum(valid_mask)) if np.any(valid_mask) else int(mask_binary.size)
        flood_pixels = int(np.sum((mask_binary == 1) & valid_mask))
        total_pixels = int(mask_binary.size)
        flooded_pixel_fraction = float(flood_pixels / max(1, valid_pixels))
        coverage_percent = float(flooded_pixel_fraction * 100.0)

        # Approximate confidence over positive predictions
        confidence_mean = float(np.mean(probs[(mask_binary == 1) & valid_mask])) if flood_pixels > 0 else float(np.mean(probs))

        # Simple connected component count (flood water bodies)
        from scipy.ndimage import label as nd_label
        labeled_mask, num_components = nd_label(mask_binary)

        # Physical Area Calculation strictly when trustworthy geospatial resolution is available
        physical_area_ha = None
        spatial_resolution_m = None
        geospatial_validity = False
        area_calc_method = "NOT_CALCULATED"
        area_msg = "Physical area unavailable: trustworthy geospatial metadata not provided in uploaded raster."

        if geo_meta and geo_meta.get("pixel_scale"):
            scale = geo_meta["pixel_scale"]
            raw_dx = abs(float(scale[0]))
            raw_dy = abs(float(scale[1]))

            # Check if coordinates are in angular degrees (e.g., EPSG:4326 WGS84)
            if raw_dx < 0.1 and raw_dy < 0.1:
                # Geographic CRS: geodesic transformation based on center latitude
                center_lat = 0.0
                if geo_meta.get("bounds"):
                    b = geo_meta["bounds"]
                    center_lat = (float(b[1]) + float(b[3])) / 2.0
                lat_rad = math.radians(center_lat)
                # 1 degree latitude ≈ 111,132 meters
                # 1 degree longitude ≈ 111,412 * cos(latitude) meters
                pixel_width_m = raw_dx * 111412.0 * math.cos(lat_rad)
                pixel_height_m = raw_dy * 111132.0
                area_calc_method = "GEODESIC_ANGULAR_TRANSFORM"
                area_msg = f"Calculated via geodesic ellipsoidal transformation at {center_lat:.2f}° latitude ({pixel_width_m:.1f}m x {pixel_height_m:.1f}m GSD)."
            else:
                # Planar projected metric CRS (e.g. UTM meters)
                pixel_width_m = raw_dx
                pixel_height_m = raw_dy
                area_calc_method = "PROJECTED_PLANAR_METRIC"
                area_msg = f"Calculated using projected planar metric CRS ({pixel_width_m:.1f}m x {pixel_height_m:.1f}m GSD)."

            if pixel_width_m > 0 and pixel_height_m > 0:
                pixel_area_m2 = pixel_width_m * pixel_height_m
                physical_area_ha = round(float((flood_pixels * pixel_area_m2) / 10000.0), 2)
                spatial_resolution_m = [round(pixel_width_m, 2), round(pixel_height_m, 2)]
                geospatial_validity = True

        return {
            "flood_detected": bool(flood_pixels > 0),
            "flood_pixel_count": flood_pixels,
            "valid_pixel_count": valid_pixels,
            "total_pixels": total_pixels,
            "flooded_pixel_fraction": round(flooded_pixel_fraction, 4),
            "coverage_percent": round(coverage_percent, 2),
            "confidence_mean": round(confidence_mean, 4),
            "connected_regions": int(num_components),
            "physical_area_ha": physical_area_ha,
            "physical_area_notes": area_msg,
            "area_calculation_method": area_calc_method,
            "spatial_resolution_m": spatial_resolution_m,
            "geospatial_validity": geospatial_validity,
            "inference_latency_ms": round(inference_latency_ms, 2),
            "threshold_used": threshold,
            "probability_map": probs,
            "binary_mask": mask_binary,
            "rgb_normalized": rgb_norm
        }
