"""
FloodSight AI — Modality & Provenance Verifier
Tightened inspection separating provenance status from model compatibility.
Enforces that geospatial metadata alone does not prove Sentinel provenance.
"""

from typing import Tuple, Dict, Any, List, Optional
import numpy as np
import re
from .schemas import ProvenanceStatus, ModelCompatibilityStatus, VerificationStatus
from .image_contract import ModelInputContract
from .conversion import SentinelBandConversionPipeline

SENTINEL_NAME_PATTERN = re.compile(
    r"(s2hand|s1hand|sen1floods11|s2a_|s2b_|sentinel[-_]?2|msil1c|msil2a)",
    re.IGNORECASE
)

def evaluate_provenance(
    arr: np.ndarray,
    geo_meta: Dict[str, Any],
    filename: str
) -> Tuple[ProvenanceStatus, List[str], List[str]]:
    """
    Evaluates whether raster genuinely originates from Sentinel-2 Earth observation mission.
    Geospatial metadata alone does NOT prove Sentinel provenance.
    """
    reasons = []
    warnings = []
    
    has_geospatial = bool(geo_meta.get("has_geotags", False))
    
    # 1. Check Sentinel signature in filename or metadata
    has_sentinel_name = bool(SENTINEL_NAME_PATTERN.search(filename))
    
    # Check driver metadata / tags
    tags_str = str(geo_meta.get("tags", "")).lower()
    desc_str = str(geo_meta.get("description", "")).lower()
    has_sentinel_tags = any(k in tags_str or k in desc_str for k in ["sentinel", "copernicus", "esa", "sen1floods11"])
    
    # Check physical spectral channels and GSD
    _, _, c = SentinelBandConversionPipeline.inspect_channels(arr)
    is_s2_multispectral = c in [12, 13] and (arr.dtype in [np.int16, np.uint16] or float(np.max(arr)) > 255.0)
    
    pixel_scale = geo_meta.get("pixel_scale")
    is_s2_gsd = False
    if pixel_scale and len(pixel_scale) >= 2:
        try:
            dx, dy = abs(float(pixel_scale[0])), abs(float(pixel_scale[1]))
            # Sentinel-2 native resolutions are 10m, 20m, or 60m
            if any(abs(dx - gsd) <= 1.0 and abs(dy - gsd) <= 1.0 for gsd in [10.0, 20.0, 60.0]):
                is_s2_gsd = True
        except (ValueError, TypeError):
            pass

    has_provenance_markers = has_sentinel_name or has_sentinel_tags or (is_s2_multispectral and is_s2_gsd)

    if has_geospatial and has_provenance_markers:
        provenance = ProvenanceStatus.VERIFIED_SENTINEL_PROVENANCE
    elif has_geospatial and not has_provenance_markers:
        provenance = ProvenanceStatus.GEOSPATIAL_UNVERIFIED_PROVENANCE
        warnings.append(
            "Geospatial metadata present, but Sentinel provenance is unverified. "
            "Raster lacks authoritative Sentinel-2 mission headers, ESA naming tags, or multi-spectral sensor profile."
        )
    elif not has_geospatial and has_provenance_markers:
        provenance = ProvenanceStatus.UNKNOWN_PROVENANCE
        warnings.append("Sentinel naming detected, but raster lacks valid GeoTIFF geodetic coordinate headers.")
    else:
        provenance = ProvenanceStatus.NON_GEOSPATIAL_PROVENANCE
        warnings.append("Standard non-georeferenced raster without Sentinel mission metadata.")

    return provenance, reasons, warnings

def verify_modality_and_statistics(
    arr: np.ndarray,
    geo_meta: Dict[str, Any],
    filename: str = ""
) -> Tuple[bool, VerificationStatus, ProvenanceStatus, ModelCompatibilityStatus, Optional[str], List[str], List[str]]:
    """
    Separates provenance status from model compatibility.
    Evaluates conversion pipeline eligibility for multi-channel arrays.
    """
    reasons = []
    warnings = []

    # Check for NaN / Inf
    if np.isnan(arr).any():
        reasons.append("Array contains NaN values.")
        return False, VerificationStatus.REJECTED, ProvenanceStatus.UNKNOWN_PROVENANCE, ModelCompatibilityStatus.INCOMPATIBLE, None, reasons, warnings
    if np.isinf(arr).any():
        reasons.append("Array contains infinite (Inf) values.")
        return False, VerificationStatus.REJECTED, ProvenanceStatus.UNKNOWN_PROVENANCE, ModelCompatibilityStatus.INCOMPATIBLE, None, reasons, warnings

    try:
        h, w, c = SentinelBandConversionPipeline.inspect_channels(arr)
    except ValueError as e:
        reasons.append(str(e))
        return False, VerificationStatus.REJECTED, ProvenanceStatus.UNKNOWN_PROVENANCE, ModelCompatibilityStatus.INCOMPATIBLE, None, reasons, warnings

    # Spatial Dimension bounds
    if h < ModelInputContract.MIN_DIMENSION or w < ModelInputContract.MIN_DIMENSION:
        reasons.append(f"Image dimensions ({w}x{h}) smaller than minimum allowed ({ModelInputContract.MIN_DIMENSION}x{ModelInputContract.MIN_DIMENSION}).")
        return False, VerificationStatus.REJECTED, ProvenanceStatus.UNKNOWN_PROVENANCE, ModelCompatibilityStatus.INCOMPATIBLE, None, reasons, warnings

    if h > ModelInputContract.MAX_DIMENSION or w > ModelInputContract.MAX_DIMENSION:
        reasons.append(f"Image dimensions ({w}x{h}) exceed maximum allowed ({ModelInputContract.MAX_DIMENSION}x{ModelInputContract.MAX_DIMENSION}).")
        return False, VerificationStatus.REJECTED, ProvenanceStatus.UNKNOWN_PROVENANCE, ModelCompatibilityStatus.INCOMPATIBLE, None, reasons, warnings

    # 1. Evaluate Provenance
    provenance, prov_reasons, prov_warnings = evaluate_provenance(arr, geo_meta, filename)
    reasons.extend(prov_reasons)
    warnings.extend(prov_warnings)

    # 2. Evaluate Model Compatibility & Conversion Pipeline
    can_convert, convert_msg, pipeline_rule = SentinelBandConversionPipeline.can_convert(arr)

    if c == 1:
        # A 3-channel model CANNOT receive a 1-channel array
        compat_status = ModelCompatibilityStatus.INCOMPATIBLE
        reasons.append(convert_msg)
    elif c == 3:
        compat_status = ModelCompatibilityStatus.COMPATIBLE_EXACT
    elif c in [4, 12, 13] and can_convert:
        compat_status = ModelCompatibilityStatus.COMPATIBLE_VIA_CONVERSION
    else:
        compat_status = ModelCompatibilityStatus.INCOMPATIBLE
        reasons.append(f"Unsupported channel count {c}: {convert_msg}")

    # 3. Formulate Verification Verdict
    if compat_status == ModelCompatibilityStatus.INCOMPATIBLE:
        verdict = VerificationStatus.REJECTED
        passed = False
    elif provenance == ProvenanceStatus.VERIFIED_SENTINEL_PROVENANCE:
        verdict = VerificationStatus.VERIFIED_SATELLITE_INPUT
        passed = True
    else:
        verdict = VerificationStatus.SUPPORTED_BUT_UNVERIFIED
        passed = True

    return passed, verdict, provenance, compat_status, pipeline_rule, reasons, warnings
