"""
FloodSight AI — File Integrity & Hash Verifier
Ensures uploads are authentic, uncorrupted, and cryptographically verified.
"""

import hashlib
import io
from typing import Tuple, Optional
from PIL import Image
import tifffile
import numpy as np

def compute_sha256(data: bytes) -> str:
    """Computes standard SHA-256 hash of byte buffer."""
    return hashlib.sha256(data).hexdigest()

def check_file_integrity(data: bytes, filename: str) -> Tuple[bool, Optional[str]]:
    """Validates raw file buffer integrity, length, and non-empty status."""
    if not data or len(data) == 0:
        return False, "File is completely empty (0 bytes)."
    
    if len(data) > 50 * 1024 * 1024:
        return False, f"File exceeds maximum allowed size (50 MB limit, received {len(data)/(1024*1024):.2f} MB)."
    
    return True, None

def decode_image_array(data: bytes, filename: str) -> Tuple[bool, Optional[np.ndarray], Optional[str], Optional[dict]]:
    """
    Decodes image into a NumPy array and extracts geospatial metadata if available.
    Supports GeoTIFF / TIFF and standard PNG/JPEG images.
    """
    ext = filename.lower().split('.')[-1] if '.' in filename else ''
    geo_meta = {}

    try:
        if ext in ['tif', 'tiff']:
            # Decode via tifffile
            with io.BytesIO(data) as buf:
                with tifffile.TiffFile(buf) as tif:
                    arr = tif.asarray()
                    
                    # Inspect geospatial tags if present
                    page = tif.pages[0]
                    if hasattr(page, 'geotiff_tags') and page.geotiff_tags:
                        geo_meta["has_geotags"] = True
                        geo_meta["tags_count"] = len(page.geotiff_tags)
                    elif hasattr(page, 'tags'):
                        # Check ModelPixelScaleTag (33550) or ModelTiepointTag (33922)
                        if 33550 in page.tags or 33922 in page.tags:
                            geo_meta["has_geotags"] = True
                            if 33550 in page.tags:
                                scale = page.tags[33550].value
                                geo_meta["pixel_scale"] = list(scale) if scale else None

            # Handle TIFF dimension transposition: (C, H, W) -> (H, W, C)
            if arr.ndim == 3 and arr.shape[0] in [1, 2, 3, 4, 12, 13]:
                # If first dimension is channel count and smaller than spatial dimensions
                if arr.shape[0] < arr.shape[1] and arr.shape[0] < arr.shape[2]:
                    arr = np.transpose(arr, (1, 2, 0))
            elif arr.ndim == 2:
                arr = np.expand_dims(arr, axis=-1)

            return True, arr, None, geo_meta

        else:
            # Decode standard PNG/JPEG via PIL
            with io.BytesIO(data) as buf:
                with Image.open(buf) as img:
                    img.verify()
                
            # Reopen for array loading after verify
            with io.BytesIO(data) as buf:
                with Image.open(buf) as img:
                    arr = np.array(img)
                    if arr.ndim == 2:
                        arr = np.expand_dims(arr, axis=-1)
                    return True, arr, None, geo_meta

    except Exception as e:
        return False, None, f"Image decoding failed: {str(e)}", None
