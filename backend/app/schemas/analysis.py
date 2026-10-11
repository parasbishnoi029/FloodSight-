from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class HealthResponse(BaseModel):
    status: str = "healthy"
    service: str = "FloodSight API"
    version: str = "0.1.0-phase1"
    model_available: bool = False
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class AnalysisSubmissionResponse(BaseModel):
    status: str
    analysis_id: str
    filename: str
    size_bytes: int
    content_type: str
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AnalysisStatusResponse(BaseModel):
    analysis_id: str
    status: str
    progress: int
    message: str
    flood_detected: Optional[bool] = None
    affected_area_ha: Optional[float] = None
