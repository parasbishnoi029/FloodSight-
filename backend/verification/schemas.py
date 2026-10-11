"""
FloodSight AI — Verification Engine Schemas
Data models for strict pre-inference input inspection.
"""

from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class VerificationStatus(str, Enum):
    VERIFIED_SATELLITE_INPUT = "VERIFIED_SATELLITE_INPUT"
    SUPPORTED_BUT_UNVERIFIED = "SUPPORTED_BUT_UNVERIFIED"
    REJECTED = "REJECTED"

class ProvenanceStatus(str, Enum):
    VERIFIED_SENTINEL_PROVENANCE = "VERIFIED_SENTINEL_PROVENANCE"
    GEOSPATIAL_UNVERIFIED_PROVENANCE = "GEOSPATIAL_UNVERIFIED_PROVENANCE"
    NON_GEOSPATIAL_PROVENANCE = "NON_GEOSPATIAL_PROVENANCE"
    UNKNOWN_PROVENANCE = "UNKNOWN_PROVENANCE"

class ModelCompatibilityStatus(str, Enum):
    COMPATIBLE_EXACT = "COMPATIBLE_EXACT"
    COMPATIBLE_VIA_CONVERSION = "COMPATIBLE_VIA_CONVERSION"
    INCOMPATIBLE = "INCOMPATIBLE"

class CheckDetail(BaseModel):
    passed: bool
    details: Optional[str] = None
    actual: Optional[Any] = None
    expected: Optional[Any] = None

class VerificationChecks(BaseModel):
    file_integrity: CheckDetail
    image_decode: CheckDetail
    dimensions: CheckDetail
    channels: CheckDetail
    dtype: CheckDetail
    modality: CheckDetail
    geospatial_metadata: CheckDetail
    provenance: Optional[CheckDetail] = None
    model_compatibility: CheckDetail

class ModelContractInfo(BaseModel):
    model_name: str
    model_version: str
    modality: str
    expected_channels: int
    expected_dimensions: List[int]
    expected_dtype: str
    normalization_mean: List[float]
    normalization_std: List[float]
    preprocessing_version: str

class VerificationResult(BaseModel):
    verification_id: str
    status: VerificationStatus
    provenance_status: Optional[ProvenanceStatus] = None
    model_compatibility_status: Optional[ModelCompatibilityStatus] = None
    conversion_pipeline_available: bool = False
    conversion_pipeline_rule: Optional[str] = None
    accepted_for_inference: bool
    file_hash_sha256: str
    filename: str
    size_bytes: int
    checks: VerificationChecks
    reasons: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    model_contract: ModelContractInfo
    timestamp: str
