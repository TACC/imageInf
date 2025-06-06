import pytest


@pytest.fixture
def mock_vit(monkeypatch):
    from imageinf.inference import processor

    class FakeViT:
        def classify_image(self, image):
            return [
                {"label": "mock-label", "score": 0.99},
                {"label": "another-label", "score": 0.01},
            ]

    monkeypatch.setattr(processor, "ViTModel", lambda: FakeViT())


@pytest.mark.slow
def test_sync_inference_one_image_using_hugging_face_model(
    client_authed, mock_tapis_files
):
    payload = {
        "inferenceType": "classification",
        "files": [
            {
                "systemId": "designsafe.storage.default",
                "path": "/path/to/test-image.jpg",
            }
        ],
    }

    response = client_authed.post("/inference/sync", json=payload)

    assert response.status_code == 200
    data = response.json()

    assert "model" in data
    assert "results" in data
    assert len(data["results"]) == 1

    result = data["results"][0]
    assert result["systemId"] == "designsafe.storage.default"
    assert result["path"] == "/path/to/test-image.jpg"
    assert isinstance(result["predictions"], list)


def test_sync_inference_one_image(client_authed, mock_tapis_files, mock_vit):
    payload = {
        "inferenceType": "classification",
        "files": [
            {
                "systemId": "designsafe.storage.default",
                "path": "/path/to/test-image.jpg",
            }
        ],
    }
    response = client_authed.post("/inference/sync", json=payload)

    assert response.status_code == 200
    data = response.json()

    assert "model" in data
    assert "results" in data
    assert len(data["results"]) == 1

    result = data["results"][0]
    assert result["systemId"] == "designsafe.storage.default"
    assert result["path"] == "/path/to/test-image.jpg"
    assert isinstance(result["predictions"], list)
    assert result["predictions"][0]["label"] == "mock-label"


def test_sync_inference_unauthed(client_unauthed, mock_tapis_files, mock_vit):
    payload = {
        "inferenceType": "classification",
        "files": [
            {
                "systemId": "designsafe.storage.default",
                "path": "/path/to/test-image.jpg",
            }
        ],
    }
    response = client_unauthed.post("/inference/sync", json=payload)
    assert response.status_code == 401
