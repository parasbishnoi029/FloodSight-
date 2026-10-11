from fastapi import APIRouter
from app.schemas.analysis import HealthResponse
from app.services.flood_model import flood_model_service

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint verifying API service availability and real model status.
    """
    return HealthResponse(
        status="healthy",
        service="FloodSight API",
        version="1.0.0-sen1floods11",
        model_available=flood_model_service.is_available()
    )
