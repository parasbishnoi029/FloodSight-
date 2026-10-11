"""
FloodSight AI — Validated Sentinel Band Conversion Pipeline
Ensures a 3-channel model cannot receive 1-, 4-, 12-, or 13-channel arrays
without an explicit, validated conversion pipeline and exact contract verification.
"""

from typing import Tuple, Optional, Dict, Any
import numpy as np

class SentinelBandConversionPipeline:
    """
    Explicit, validated conversion pipeline for geospatial rasters.
    Converts multi-band Sentinel-2 products into the exact 3-channel
    (H, W, 3) float32 contract expected by FloodSight-UNet-ResNet34.
    """

    @staticmethod
    def inspect_channels(arr: np.ndarray) -> Tuple[int, int, int]:
        """
        Determines spatial dimensions and channel count regardless of channel-first or channel-last layout.
        Returns: (height, width, channels)
        """
        if arr.ndim == 2:
            return arr.shape[0], arr.shape[1], 1
        elif arr.ndim == 3:
            # Check if channel-first (e.g., 3x512x512, 13x512x512) or channel-last (512x512x3)
            if arr.shape[0] in [1, 3, 4, 12, 13] and arr.shape[1] >= 64 and arr.shape[2] >= 64:
                return arr.shape[1], arr.shape[2], arr.shape[0]
            elif arr.shape[2] in [1, 3, 4, 12, 13]:
                return arr.shape[0], arr.shape[1], arr.shape[2]
            else:
                return arr.shape[0], arr.shape[1], arr.shape[2]
        else:
            raise ValueError(f"Invalid array dimensions: ndim={arr.ndim}. Expected 2D or 3D raster.")

    @classmethod
    def can_convert(cls, arr: np.ndarray) -> Tuple[bool, str, Optional[str]]:
        """
        Validates whether array can be explicitly and safely converted to exact 3-channel optical contract.
        Returns: (can_convert, message, pipeline_rule)
        """
        if not isinstance(arr, np.ndarray):
            return False, "Input is not a numpy array.", None
        if np.isnan(arr).any():
            return False, "Input array contains NaN values.", None
        if np.isinf(arr).any():
            return False, "Input array contains infinite (Inf) values.", None

        try:
            h, w, c = cls.inspect_channels(arr)
        except ValueError as e:
            return False, str(e), None

        if h < 256 or w < 256 or h > 2048 or w > 2048:
            return False, f"Spatial dimensions ({w}x{h}) out of bounds [256, 2048].", None

        if c == 1:
            return False, (
                "Explicit conversion rejected: 1-channel raster lacks required optical spectral "
                "bands (B4 Red, B3 Green, B2 Blue). 3-channel optical model cannot receive 1-channel arrays."
            ), None
        elif c == 3:
            return True, "Direct 3-channel optical raster.", "DIRECT_3CHANNEL_RGB"
        elif c == 4:
            return True, "4-channel raster validated for RGBA / 4-band extraction.", "EXTRACT_RGB_FROM_4CHANNEL"
        elif c == 12:
            return True, "12-band Sentinel-2 L2A raster validated for B4/B3/B2 extraction.", "EXTRACT_RGB_FROM_SENTINEL2_12BAND"
        elif c == 13:
            return True, "13-band Sentinel-2 L1C raster validated for B4/B3/B2 extraction.", "EXTRACT_RGB_FROM_SENTINEL2_13BAND"
        else:
            return False, f"Unsupported channel count {c}. Model requires 3 channels or validated 4/12/13 S2 pipeline.", None

    @classmethod
    def convert_to_model_input(
        cls,
        arr: np.ndarray,
        geo_meta: Optional[Dict[str, Any]] = None
    ) -> Tuple[np.ndarray, str]:
        """
        Executes the explicit conversion pipeline.
        Produces an exact (H, W, 3) float32 array in [0.0, 1.0] range.
        Raises ValueError if array fails conversion contract.
        """
        ok, reason, rule = cls.can_convert(arr)
        if not ok:
            raise ValueError(f"Conversion Pipeline Error: {reason}")

        # Normalization and extraction logic
        raw = arr.astype(np.float32)

        # Handle channel-first vs channel-last
        if raw.ndim == 3 and raw.shape[0] in [3, 4, 12, 13] and raw.shape[1] >= 64 and raw.shape[2] >= 64:
            # Channel first: (C, H, W)
            channel_first = True
        else:
            channel_first = False

        if rule == "DIRECT_3CHANNEL_RGB":
            if channel_first:
                rgb = np.transpose(raw, (1, 2, 0))
            else:
                rgb = raw[:, :, :3]

        elif rule == "EXTRACT_RGB_FROM_SENTINEL2_13BAND":
            # Sentinel-2 13-band L1C:
            # Band 1: Aerosol (idx 0), Band 2: Blue (idx 1), Band 3: Green (idx 2), Band 4: Red (idx 3)
            if channel_first:
                b4_red = raw[3, :, :]
                b3_green = raw[2, :, :]
                b2_blue = raw[1, :, :]
            else:
                b4_red = raw[:, :, 3]
                b3_green = raw[:, :, 2]
                b2_blue = raw[:, :, 1]
            rgb = np.stack([b4_red, b3_green, b2_blue], axis=-1)

        elif rule == "EXTRACT_RGB_FROM_SENTINEL2_12BAND":
            # Sentinel-2 12-band L2A:
            # Band 2: Blue (idx 1), Band 3: Green (idx 2), Band 4: Red (idx 3)
            if channel_first:
                b4_red = raw[3, :, :]
                b3_green = raw[2, :, :]
                b2_blue = raw[1, :, :]
            else:
                b4_red = raw[:, :, 3]
                b3_green = raw[:, :, 2]
                b2_blue = raw[:, :, 1]
            rgb = np.stack([b4_red, b3_green, b2_blue], axis=-1)

        elif rule == "EXTRACT_RGB_FROM_4CHANNEL":
            # If 4-channel, check if Sen1Floods11 subset or RGBA
            if channel_first:
                rgb = np.transpose(raw[:3, :, :], (1, 2, 0))
            else:
                rgb = raw[:, :, :3]

        else:
            raise ValueError(f"Unknown conversion rule: {rule}")

        # Enforce exact physical reflectance scaling: [0.0, 1.0]
        max_val = float(np.max(rgb))
        if max_val > 1.0:
            if max_val > 255.0:
                # 16-bit DN (Sentinel-2 Surface Reflectance scaled by 10000)
                rgb_norm = np.clip(rgb / 10000.0, 0.0, 1.0)
            else:
                # Standard 8-bit RGB
                rgb_norm = np.clip(rgb / 255.0, 0.0, 1.0)
        else:
            rgb_norm = np.clip(rgb, 0.0, 1.0)

        # STRICT CONTRACT VALIDATION
        if rgb_norm.ndim != 3 or rgb_norm.shape[2] != 3:
            raise ValueError(f"Pipeline output contract violation: shape={rgb_norm.shape}, expected (H, W, 3).")
        if rgb_norm.dtype != np.float32:
            rgb_norm = rgb_norm.astype(np.float32)

        return rgb_norm, rule
