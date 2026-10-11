import os
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from typing import Dict, Any
from app.core.config import settings
from verification.verifier import verify_uploaded_image
from verification.schemas import VerificationResult

router = APIRouter(tags=["Verification"])

@router.post("/verify-image", response_model=VerificationResult, status_code=status.HTTP_200_OK)
async def verify_image_endpoint(file: UploadFile = File(...)):
    """
    Inspects satellite raster before inference.
    Checks file integrity, dimensions, channels, dtype, modality, and geospatial metadata.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename cannot be empty."
        )

    try:
        contents = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read image payload: {str(e)}"
        )

    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file buffer is empty (0 bytes)."
        )

    if len(contents) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Uploaded file exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit."
        )

    safe_filename = os.path.basename(file.filename)
    result = verify_uploaded_image(contents, safe_filename)
    return result
