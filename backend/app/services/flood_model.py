"""
FloodSight AI — Singleton Flood Model Service
Loads trained checkpoint once and provides high-speed prediction via FloodSegmenter.
"""

import os
import sys
from pathlib import Path
from typing import Optional, Dict, Any
import numpy as np

# Add project root to sys.path if needed
ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.core.config import settings

class FloodModelService:
    _instance: Optional['FloodModelService'] = None
    _segmenter = None
    _is_loaded = False
    _load_error: Optional[str] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FloodModelService, cls).__new__(cls)
            cls._instance._init_service()
        return cls._instance

    def _init_service(self):
        checkpoint_path = settings.MODEL_CHECKPOINT_PATH
        if not os.path.exists(checkpoint_path):
            self._is_loaded = False
            self._load_error = f"No trained FloodSight segmentation checkpoint found at '{checkpoint_path}'."
            self._segmenter = None
            return

        try:
            from training.inference import FloodSegmenter
            self._segmenter = FloodSegmenter(checkpoint_path=checkpoint_path)
            self._is_loaded = True
            self._load_error = None
        except Exception as e:
            self._is_loaded = False
            self._load_error = f"Failed to initialize FloodSegmenter: {str(e)}"
            self._segmenter = None

    def is_available(self) -> bool:
        checkpoint_path = settings.MODEL_CHECKPOINT_PATH
        if os.path.exists(checkpoint_path) and not self._is_loaded:
            # Re-attempt lazy load if checkpoint was added
            self._init_service()
        return self._is_loaded and self._segmenter is not None

    def get_load_error(self) -> Optional[str]:
        return self._load_error

    def predict(self, arr: np.ndarray, threshold: float = 0.50, geo_meta: Optional[dict] = None) -> Dict[str, Any]:
        if not self.is_available():
            raise RuntimeError(self._load_error or "Flood model is not available.")
        return self._segmenter.predict(arr=arr, threshold=threshold, geo_meta=geo_meta)

# Singleton global accessor
flood_model_service = FloodModelService()
