import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"

def test_verify_empty_file():
    response = client.post(
        "/api/verify-image",
        files={"file": ("empty.tif", b"", "image/tiff")}
    )
    assert response.status_code in [400, 422]

def test_verify_invalid_extension():
    response = client.post(
        "/api/verify-image",
        files={"file": ("script.sh", b"#!/bin/bash\necho hello", "text/x-shellscript")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "REJECTED"
    assert data["accepted_for_inference"] is False
    assert len(data["reasons"]) > 0

def test_verify_corrupted_image():
    response = client.post(
        "/api/verify-image",
        files={"file": ("corrupted.png", b"not-a-real-png-data", "image/png")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "REJECTED"
    assert data["accepted_for_inference"] is False

def test_unverified_analyze_rejected():
    # Calling /api/analyze without verification_id MUST return 403 Forbidden
    png_data = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    response = client.post(
        "/api/analyze",
        files={"file": ("unverified_test.png", png_data, "image/png")}
    )
    assert response.status_code == 403

def test_analyze_with_fake_verification_id_rejected():
    png_data = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    response = client.post(
        "/api/analyze",
        files={"file": ("unverified_test.png", png_data, "image/png")},
        data={"verification_id": "fake-token-12345"}
    )
    assert response.status_code == 403

def test_supported_but_unverified_not_accepted_for_inference():
    png_data = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    verify_res = client.post(
        "/api/verify-image",
        files={"file": ("unreferenced.png", png_data, "image/png")}
    )
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert verify_data["accepted_for_inference"] is False
    assert verify_data["status"] in ["SUPPORTED_BUT_UNVERIFIED", "REJECTED"]

def test_conversion_pipeline_1channel_rejected():
    import numpy as np
    from verification.conversion import SentinelBandConversionPipeline
    arr_1ch = np.zeros((512, 512, 1), dtype=np.float32)
    can_convert, msg, rule = SentinelBandConversionPipeline.can_convert(arr_1ch)
    assert can_convert is False
    assert "1-channel raster lacks required optical spectral bands" in msg
    with pytest.raises(ValueError):
        SentinelBandConversionPipeline.convert_to_model_input(arr_1ch)

def test_conversion_pipeline_13channel_conversion():
    import numpy as np
    from verification.conversion import SentinelBandConversionPipeline
    # Synthetic 13-band test fixture representing Sentinel-2 L1C
    arr_13ch = np.zeros((13, 512, 512), dtype=np.uint16)
    arr_13ch[3, :, :] = 1500  # Band 4 (Red)
    arr_13ch[2, :, :] = 1600  # Band 3 (Green)
    arr_13ch[1, :, :] = 1400  # Band 2 (Blue)
    can_convert, msg, rule = SentinelBandConversionPipeline.can_convert(arr_13ch)
    assert can_convert is True
    assert rule == "EXTRACT_RGB_FROM_SENTINEL2_13BAND"

    out_rgb, applied_rule = SentinelBandConversionPipeline.convert_to_model_input(arr_13ch)
    assert out_rgb.shape == (512, 512, 3)
    assert out_rgb.dtype == np.float32
    assert np.isclose(out_rgb[0, 0, 0], 1500 / 10000.0)  # Red = Band 4
    assert np.isclose(out_rgb[0, 0, 1], 1600 / 10000.0)  # Green = Band 3
    assert np.isclose(out_rgb[0, 0, 2], 1400 / 10000.0)  # Blue = Band 2

def test_conversion_pipeline_12channel_conversion():
    import numpy as np
    from verification.conversion import SentinelBandConversionPipeline
    # Synthetic 12-band test fixture representing Sentinel-2 L2A
    arr_12ch = np.zeros((12, 512, 512), dtype=np.uint16)
    arr_12ch[3, :, :] = 2000  # Band 4
    arr_12ch[2, :, :] = 1800  # Band 3
    arr_12ch[1, :, :] = 1500  # Band 2
    out_rgb, applied_rule = SentinelBandConversionPipeline.convert_to_model_input(arr_12ch)
    assert out_rgb.shape == (512, 512, 3)
    assert applied_rule == "EXTRACT_RGB_FROM_SENTINEL2_12BAND"

def test_model_input_contract_rejects_arbitrary_channels():
    import numpy as np
    from training.inference import FloodSegmenter
    # Test that FloodSegmenter directly rejects 1-channel or 4-channel arrays without conversion pipeline
    try:
        segmenter = FloodSegmenter.__new__(FloodSegmenter)
        segmenter.mean = np.array([0.158, 0.164, 0.151], dtype=np.float32).reshape(3, 1, 1)
        segmenter.std = np.array([0.132, 0.128, 0.134], dtype=np.float32).reshape(3, 1, 1)

        # 1-channel
        arr_1ch = np.zeros((512, 512, 1), dtype=np.float32)
        with pytest.raises(ValueError, match="Exact model input contract violation"):
            segmenter.preprocess_image(arr_1ch)

        # 4-channel
        arr_4ch = np.zeros((512, 512, 4), dtype=np.float32)
        with pytest.raises(ValueError, match="Exact model input contract violation"):
            segmenter.preprocess_image(arr_4ch)

        # Valid 3-channel succeeds
        arr_3ch = np.zeros((512, 512, 3), dtype=np.float32)
        tensor_torch, norm = segmenter.preprocess_image(arr_3ch)
        assert tensor_torch.shape == (1, 3, 512, 512)
    except Exception as e:
        if "checkpoint" not in str(e).lower():
            raise

def test_geospatial_metadata_alone_does_not_prove_sentinel_provenance():
    import numpy as np
    from verification.modality import verify_modality_and_statistics
    from verification.schemas import ProvenanceStatus, VerificationStatus, ModelCompatibilityStatus

    arr = np.zeros((512, 512, 3), dtype=np.uint8)
    # Generic geotagged raster without Sentinel-2 mission indicators
    geo_meta = {
        "has_geotags": True,
        "crs": "EPSG:4326",
        "description": "Standard Municipal Aerial Orthophoto"
    }
    passed, verdict, provenance, compat, rule, reasons, warnings = verify_modality_and_statistics(
        arr, geo_meta, filename="city_aerial.tif"
    )
    assert provenance == ProvenanceStatus.GEOSPATIAL_UNVERIFIED_PROVENANCE
    assert verdict == VerificationStatus.SUPPORTED_BUT_UNVERIFIED
    assert compat == ModelCompatibilityStatus.COMPATIBLE_EXACT
    assert any("Sentinel provenance is unverified" in w for w in warnings)

def test_geo_meta_retrieval_and_use():
    """
    Regression test: Verifies that geo_meta is retrieved from verified_record and passed
    to both the conversion pipeline and flood_model_service.predict without raising
    UnboundLocalError or losing geospatial metadata.
    """
    from unittest.mock import patch
    import numpy as np
    import base64
    from verification.verifier import VERIFIED_TOKENS
    from verification.integrity import compute_sha256

    # 1x1 valid test image bytes
    b64_png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    png_data = base64.b64decode(b64_png)
    file_hash = compute_sha256(png_data)
    test_token = "test-token-geo-meta-regression"

    expected_geo_meta = {
        "has_geotags": True,
        "pixel_scale": [10.0, 10.0, 0.0],
        "crs": "EPSG:32632",
        "nodata": 0
    }

    VERIFIED_TOKENS[test_token] = {
        "result": {"status": "VERIFIED_SATELLITE_INPUT"},
        "file_hash": file_hash,
        "filename": "sentinel2_test.tif",
        "geo_meta": expected_geo_meta,
        "conversion_rule": None,
        "timestamp": "2026-10-09T00:00:00Z"
    }

    captured_geo_meta = {}

    def mock_predict(arr, threshold=0.5, geo_meta=None):
        nonlocal captured_geo_meta
        captured_geo_meta = geo_meta
        return {
            "flood_detected": True,
            "flood_pixel_count": 100,
            "total_pixels": 262144,
            "coverage_percent": 3.81,
            "confidence_mean": 0.92,
            "connected_regions": 2,
            "physical_area_ha": 1.0,
            "physical_area_notes": "Test planar metric area",
            "inference_latency_ms": 12.5,
        }

    with patch("app.services.flood_model.flood_model_service.is_available", return_value=True), \
         patch("app.services.flood_model.flood_model_service.predict", side_effect=mock_predict), \
         patch("verification.conversion.SentinelBandConversionPipeline.convert_to_model_input", return_value=(np.zeros((512, 512, 3), dtype=np.float32), None)):
        
        response = client.post(
            "/api/analyze",
            files={"file": ("sentinel2_test.tif", png_data, "image/tiff")},
            data={"verification_id": test_token, "threshold": "0.5"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "SUCCESS"
        assert captured_geo_meta == expected_geo_meta
        assert data["physical_area_ha"] == 1.0

def test_file_hash_mismatch_rejected():
    """
    Verifies that presenting a valid verification token with altered/tampered file contents
    fails closed with HTTP 400 FILE_HASH_MISMATCH.
    """
    from verification.verifier import VERIFIED_TOKENS
    test_token = "test-token-tamper-check"
    VERIFIED_TOKENS[test_token] = {
        "result": {"status": "VERIFIED_SATELLITE_INPUT"},
        "file_hash": "expected_hash_000000000000000000000000000000000000000000000000000000",
        "filename": "clean_scene.tif",
        "geo_meta": {},
        "timestamp": "2026-10-09T00:00:00Z"
    }

    tampered_bytes = b"different_bytes_here"
    response = client.post(
        "/api/analyze",
        files={"file": ("tampered.tif", tampered_bytes, "image/tiff")},
        data={"verification_id": test_token}
    )
    assert response.status_code == 400
    res_data = response.json()
    error_code = res_data.get("error") or res_data.get("detail", {}).get("error")
    assert error_code == "FILE_HASH_MISMATCH"

def test_token_registry_ttl_and_eviction():
    """
    Tests TTL expiration and bounded capacity in VerificationTokenRegistry.
    """
    from verification.verifier import VerificationTokenRegistry
    reg = VerificationTokenRegistry(ttl_seconds=1, max_items=2)
    reg["t1"] = {"val": 1}
    reg["t2"] = {"val": 2}
    assert "t1" in reg
    assert "t2" in reg

    # Add third item exceeding max_items=2 -> oldest evicted
    reg["t3"] = {"val": 3}
    assert len(reg) <= 2

    # Expire items
    import time
    time.sleep(1.1)
    assert "t1" not in reg
    assert "t2" not in reg
    assert len(reg) == 0

def test_cors_security_no_wildcard():
    """
    Ensures ALLOWED_ORIGINS does not include wildcard '*' when credentials are enabled.
    """
    from app.core.config import settings
    assert "*" not in settings.ALLOWED_ORIGINS
    assert len(settings.ALLOWED_ORIGINS) > 0


