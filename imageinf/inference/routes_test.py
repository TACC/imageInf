import pytest


@pytest.fixture
def mock_vit(monkeypatch):
    from imageinf.inference import processor
    from imageinf.inference.models import Prediction

    class FakeViT:
        def __init__(self, model_name=None):
            pass

        def classify_image(self, image):
            return [
                Prediction(label="mock-label", score=0.99),
                Prediction(label="another-label", score=0.01),
            ]

    monkeypatch.setattr(
        processor, "MODEL_REGISTRY", {"google/vit-base-patch16-224": FakeViT}
    )


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
        "model": "google/vit-base-patch16-224",
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
        "model": "google/vit-base-patch16-224",
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

    # Verify metadata is present (without asserting specific values)
    assert "metadata" in result
    assert "date_taken" in result["metadata"]
    assert "latitude" in result["metadata"]
    assert "longitude" in result["metadata"]
    assert "camera_make" in result["metadata"]

    # TODO ADD JIRA
    # assert result["metadata"]["longitude"] is not None
    # assert result["metadata"]["latitude"] is not None


def test_sync_inference_unauthed(client_unauthed, mock_tapis_files, mock_vit):
    payload = {
        "inferenceType": "classification",
        "files": [
            {
                "systemId": "designsafe.storage.default",
                "path": "/path/to/test-image.jpg",
            }
        ],
        "model": "google/vit-base-patch16-224",
    }
    response = client_unauthed.post("/inference/sync", json=payload)
    assert response.status_code == 401
