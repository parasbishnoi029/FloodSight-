from fastapi.testclient import TestClient
from app.main import app
from app.services.flood_model import flood_model_service

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "FloodSight API"
    assert "model_available" in data
    # Offline or missing checkpoint must not report model_available: True falsely
    assert data["model_available"] == flood_model_service.is_available()

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"

