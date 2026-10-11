"""
FloodSight AI — Model & Image Input Contract
Defines strict physical, spectral, and dimensional constraints for the trained model.
"""

from typing import List

class ModelInputContract:
    MODEL_NAME = "FloodSight-UNet-ResNet34"
    MODEL_VERSION = "1.0.0"
    PREPROCESSING_VERSION = "s2-optical-v1"
    
    # Expected Modality & Channels
    MODALITY = "Sentinel-2 MSI Optical (True-Color RGB / Bands 4, 3, 2)"
    EXPECTED_CHANNELS = 3
    EXPECTED_CHANNEL_NAMES = ["B4 (Red)", "B3 (Green)", "B2 (Blue)"]
    
    # Dimensions & Types
    EXPECTED_DTYPE = "float32"
    RAW_DTYPES = ["uint8", "uint16", "int16", "float32"]
    MIN_DIMENSION = 256
    MAX_DIMENSION = 2048
    OPTIMAL_TILE_SIZE = (512, 512)
    
    # Preprocessing Normalization Statistics (Computed over Sen1Floods11 HandLabeled Optical)
    NORMALIZATION_MEAN: List[float] = [0.158, 0.164, 0.151]
    NORMALIZATION_STD: List[float] = [0.132, 0.128, 0.134]
    
    # Supported File Extensions & MIME Types
    ALLOWED_EXTENSIONS = [".tif", ".tiff", ".png", ".jpg", ".jpeg"]
    ALLOWED_MIME_TYPES = [
        "image/tiff",
        "image/geotiff",
        "image/png",
        "image/jpeg",
        "application/octet-stream"  # often sent by browsers for .tif
    ]
    
    # Maximum File Size: 50 MB
    MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024
