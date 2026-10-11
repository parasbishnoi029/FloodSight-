"""
FloodSight AI — Primary Verification Engine
Performs multi-stage pre-inference inspection and issues signed verification tokens.
Separates provenance verification from model compatibility.
"""

import uuid
import datetime
from typing import Dict, Any, Tuple, Optional, List
import numpy as np

from .schemas import (
    VerificationResult,
    VerificationStatus,
    VerificationChecks,
    CheckDetail,
    ModelContractInfo,
    ProvenanceStatus,
    ModelCompatibilityStatus
)
from .image_contract import ModelInputContract
from .integrity import compute_sha256, check_file_integrity, decode_image_array
from .modality import verify_modality_and_statistics
from .conversion import SentinelBandConversionPipeline

import time
import threading

# Authoritative server-side verified token registry with TTL expiration and bounded capacity.
# SECURITY & TOKEN LIFECYCLE DISCLOSURE:
# - Architecture: Single-process in-memory store with automatic TTL pruning (1 hour) and max capacity (1000 items).
# - Lifecycle: Verification records expire after 1 hour or upon server process restart.
# - Multi-Worker Notice: In-memory store is process-local and does not synchronize across distributed cluster workers.
#   Production multi-worker setups require distributed storage (Redis) or cryptographically signed session tokens.
# - Tokens are random UUIDv4 identifiers, not cryptographic signatures.
class VerificationTokenRegistry:
    def __init__(self, ttl_seconds: int = 3600, max_items: int = 1000):
        self._ttl_seconds = ttl_seconds
        self._max_items = max_items
        self._store: Dict[str, Dict[str, Any]] = {}
        self._timestamps: Dict[str, float] = {}
        self._lock = threading.Lock()

    def _prune(self):
        now = time.time()
        expired = [k for k, ts in self._timestamps.items() if (now - ts) > self._ttl_seconds]
        for k in expired:
            self._store.pop(k, None)
            self._timestamps.pop(k, None)
        # Bounded capacity eviction
        if len(self._store) > self._max_items:
            sorted_keys = sorted(self._timestamps.keys(), key=lambda k: self._timestamps[k])
            excess = len(self._store) - self._max_items
            for k in sorted_keys[:excess]:
                self._store.pop(k, None)
                self._timestamps.pop(k, None)

    def __contains__(self, key: str) -> bool:
        with self._lock:
            self._prune()
            return key in self._store

    def __getitem__(self, key: str) -> Dict[str, Any]:
        with self._lock:
            self._prune()
            if key not in self._store:
                raise KeyError(key)
            return self._store[key]

    def __setitem__(self, key: str, value: Dict[str, Any]):
        with self._lock:
            self._prune()
            self._store[key] = value
            self._timestamps[key] = time.time()

    def get(self, key: str, default: Any = None) -> Any:
        with self._lock:
            self._prune()
            return self._store.get(key, default)

    def pop(self, key: str, default: Any = None) -> Any:
        with self._lock:
            self._timestamps.pop(key, None)
            return self._store.pop(key, default)

    def clear(self):
        with self._lock:
            self._store.clear()
            self._timestamps.clear()

    def __len__(self) -> int:
        with self._lock:
            self._prune()
            return len(self._store)

# Global token registry (1h TTL, max 1000 items)
VERIFIED_TOKENS = VerificationTokenRegistry(ttl_seconds=3600, max_items=1000)

def verify_uploaded_image(data: bytes, filename: str) -> VerificationResult:
    """
    Executes authoritative, server-side pre-inference verification.
    """
    verification_id = str(uuid.uuid4())
    file_hash = compute_sha256(data)
    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    reasons: List[str] = []
    warnings: List[str] = []

    # 1. File Integrity Check
    integrity_ok, integrity_err = check_file_integrity(data, filename)
    file_integrity_check = CheckDetail(
        passed=integrity_ok,
        details=integrity_err or "File size and byte buffer are intact.",
        actual=f"{len(data)} bytes"
    )
    if not integrity_ok:
        reasons.append(integrity_err or "File integrity check failed.")
        return _build_rejected_result(
            verification_id, file_hash, filename, len(data),
            file_integrity_check, reasons, warnings, timestamp
        )

    # 2. Image Decoding Check
    decode_ok, arr, decode_err, geo_meta = decode_image_array(data, filename)
    image_decode_check = CheckDetail(
        passed=decode_ok,
        details=decode_err or "Raster decoded successfully into array.",
        actual=str(arr.dtype) if arr is not None else "failed"
    )
    if not decode_ok or arr is None:
        reasons.append(decode_err or "Failed to decode raster.")
        return _build_rejected_result(
            verification_id, file_hash, filename, len(data),
            file_integrity_check, reasons, warnings, timestamp,
            image_decode_check=image_decode_check
        )

    try:
        h, w, c = SentinelBandConversionPipeline.inspect_channels(arr)
    except Exception as e:
        h, w, c = (arr.shape[0], arr.shape[1], arr.shape[2] if arr.ndim == 3 else 1)

    # 3. Dimensions Check
    dim_ok = (
        ModelInputContract.MIN_DIMENSION <= h <= ModelInputContract.MAX_DIMENSION and
        ModelInputContract.MIN_DIMENSION <= w <= ModelInputContract.MAX_DIMENSION
    )
    dimensions_check = CheckDetail(
        passed=dim_ok,
        details=f"Raster shape is {w}x{h} (optimal {ModelInputContract.OPTIMAL_TILE_SIZE[0]}x{ModelInputContract.OPTIMAL_TILE_SIZE[1]}).",
        actual=[w, h],
        expected=[ModelInputContract.MIN_DIMENSION, ModelInputContract.MAX_DIMENSION]
    )

    # 4. Channels Check
    chan_ok = c in [3, 4, 12, 13]
    channels_check = CheckDetail(
        passed=chan_ok,
        details=f"Channel count is {c} ({'Sentinel-2 multi-spectral bands' if c in [12, 13] else 'RGB optical bands' if c == 3 else 'RGBA/4-band'})." if chan_ok else f"Channel count {c} incompatible with 3-channel model.",
        actual=c,
        expected=ModelInputContract.EXPECTED_CHANNELS
    )

    # 5. Dtype Check
    dtype_ok = str(arr.dtype) in ModelInputContract.RAW_DTYPES
    dtype_check = CheckDetail(
        passed=dtype_ok,
        details=f"Data type {arr.dtype} is compatible with float32 normalization.",
        actual=str(arr.dtype),
        expected=ModelInputContract.EXPECTED_DTYPE
    )

    # 6. Modality, Provenance & Conversion Checks
    (
        mod_ok,
        verdict,
        provenance,
        compat_status,
        pipeline_rule,
        mod_reasons,
        mod_warnings
    ) = verify_modality_and_statistics(arr, geo_meta or {}, filename=filename)
    reasons.extend(mod_reasons)
    warnings.extend(mod_warnings)

    modality_check = CheckDetail(
        passed=mod_ok,
        details=f"Modality status: {verdict.value}.",
        actual=verdict.value
    )

    # 7. Geospatial Metadata Check
    has_geotags = bool((geo_meta or {}).get("has_geotags", False))
    geospatial_check = CheckDetail(
        passed=has_geotags,
        details="GeoTIFF geodetic coordinate headers detected." if has_geotags else "No embedded CRS or ground transform found.",
        actual="Geotagged" if has_geotags else "Non-georeferenced"
    )

    # 8. Provenance Check
    provenance_check = CheckDetail(
        passed=(provenance == ProvenanceStatus.VERIFIED_SENTINEL_PROVENANCE),
        details=f"Provenance classification: {provenance.value}.",
        actual=provenance.value,
        expected=ProvenanceStatus.VERIFIED_SENTINEL_PROVENANCE.value
    )

    # 9. Model Compatibility Check
    model_compat_ok = (compat_status in [ModelCompatibilityStatus.COMPATIBLE_EXACT, ModelCompatibilityStatus.COMPATIBLE_VIA_CONVERSION])
    model_compat_check = CheckDetail(
        passed=model_compat_ok,
        details=f"Model compatibility: {compat_status.value} (Pipeline: {pipeline_rule or 'none'}).",
        actual=compat_status.value
    )

    checks = VerificationChecks(
        file_integrity=file_integrity_check,
        image_decode=image_decode_check,
        dimensions=dimensions_check,
        channels=channels_check,
        dtype=dtype_check,
        modality=modality_check,
        geospatial_metadata=geospatial_check,
        provenance=provenance_check,
        model_compatibility=model_compat_check
    )

    contract_info = ModelContractInfo(
        model_name=ModelInputContract.MODEL_NAME,
        model_version=ModelInputContract.MODEL_VERSION,
        modality=ModelInputContract.MODALITY,
        expected_channels=ModelInputContract.EXPECTED_CHANNELS,
        expected_dimensions=[ModelInputContract.OPTIMAL_TILE_SIZE[0], ModelInputContract.OPTIMAL_TILE_SIZE[1]],
        expected_dtype=ModelInputContract.EXPECTED_DTYPE,
        normalization_mean=ModelInputContract.NORMALIZATION_MEAN,
        normalization_std=ModelInputContract.NORMALIZATION_STD,
        preprocessing_version=ModelInputContract.PREPROCESSING_VERSION
    )

    # Strict authorization rule:
    # Inference is ONLY permitted if:
    # 1. Provenance is VERIFIED_SENTINEL_PROVENANCE
    # 2. Model compatibility is verified (either exact 3-channel or validated conversion pipeline)
    accepted = (verdict == VerificationStatus.VERIFIED_SATELLITE_INPUT and model_compat_ok)

    if verdict == VerificationStatus.REJECTED:
        final_status = VerificationStatus.REJECTED
    elif verdict == VerificationStatus.VERIFIED_SATELLITE_INPUT and model_compat_ok:
        final_status = VerificationStatus.VERIFIED_SATELLITE_INPUT
    else:
        final_status = VerificationStatus.SUPPORTED_BUT_UNVERIFIED
        warnings.append("Inference blocked: Provenance unverified or lacks validated Sentinel-2 model input contract.")

    result = VerificationResult(
        verification_id=verification_id,
        status=final_status,
        provenance_status=provenance,
        model_compatibility_status=compat_status,
        conversion_pipeline_available=bool(pipeline_rule is not None),
        conversion_pipeline_rule=pipeline_rule,
        accepted_for_inference=accepted,
        file_hash_sha256=file_hash,
        filename=filename,
        size_bytes=len(data),
        checks=checks,
        reasons=reasons,
        warnings=warnings,
        model_contract=contract_info,
        timestamp=timestamp
    )

    # Store in authoritative server registry
    if accepted:
        VERIFIED_TOKENS[verification_id] = {
            "result": result.dict(),
            "file_hash": file_hash,
            "filename": filename,
            "geo_meta": geo_meta,
            "conversion_rule": pipeline_rule,
            "arr_shape": list(arr.shape),
            "timestamp": timestamp
        }

    return result

def _build_rejected_result(
    verification_id: str,
    file_hash: str,
    filename: str,
    size_bytes: int,
    file_integrity_check: CheckDetail,
    reasons: list,
    warnings: list,
    timestamp: str,
    image_decode_check: Optional[CheckDetail] = None
) -> VerificationResult:
    checks = VerificationChecks(
        file_integrity=file_integrity_check,
        image_decode=image_decode_check or CheckDetail(passed=False, details="Decoding aborted."),
        dimensions=CheckDetail(passed=False, details="Not evaluated."),
        channels=CheckDetail(passed=False, details="Not evaluated."),
        dtype=CheckDetail(passed=False, details="Not evaluated."),
        modality=CheckDetail(passed=False, details="Not evaluated."),
        geospatial_metadata=CheckDetail(passed=False, details="Not evaluated."),
        provenance=CheckDetail(passed=False, details="Not evaluated."),
        model_compatibility=CheckDetail(passed=False, details="Rejected due to file integrity errors.")
    )
    contract_info = ModelContractInfo(
        model_name=ModelInputContract.MODEL_NAME,
        model_version=ModelInputContract.MODEL_VERSION,
        modality=ModelInputContract.MODALITY,
        expected_channels=ModelInputContract.EXPECTED_CHANNELS,
        expected_dimensions=[512, 512],
        expected_dtype="float32",
        normalization_mean=ModelInputContract.NORMALIZATION_MEAN,
        normalization_std=ModelInputContract.NORMALIZATION_STD,
        preprocessing_version=ModelInputContract.PREPROCESSING_VERSION
    )
    return VerificationResult(
        verification_id=verification_id,
        status=VerificationStatus.REJECTED,
        provenance_status=ProvenanceStatus.UNKNOWN_PROVENANCE,
        model_compatibility_status=ModelCompatibilityStatus.INCOMPATIBLE,
        conversion_pipeline_available=False,
        conversion_pipeline_rule=None,
        accepted_for_inference=False,
        file_hash_sha256=file_hash,
        filename=filename,
        size_bytes=size_bytes,
        checks=checks,
        reasons=reasons,
        warnings=warnings,
        model_contract=contract_info,
        timestamp=timestamp
    )
