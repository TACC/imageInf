from fastapi.testclient import TestClient
from imageinf.main import app

client = TestClient(app)


def test_status():
    response = client.get("/status")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
