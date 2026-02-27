import pytest


@pytest.mark.slow
def test_sync_inference_one_image_using_hugging_face_model(
    client_authed, mock_tapis_files, mock_celery_task
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

    response = client_authed.post("/inference/jobs/sync", json=payload)

    assert response.status_code == 200
    data = response.json()

    assert "model" in data
    assert "results" in data
    assert len(data["results"]) == 1

    result = data["results"][0]
    assert result["systemId"] == "designsafe.storage.default"
    assert result["path"] == "/path/to/test-image.jpg"
    assert isinstance(result["predictions"], list)


def test_sync_inference_one_image(
    client_authed, mock_tapis_files, mock_vit, mock_celery_task
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
    response = client_authed.post("/inference/jobs/sync", json=payload)

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

    assert result["metadata"]["longitude"] is None
    assert result["metadata"]["latitude"] is None


def test_sync_inference_one_image_with_location(
    make_authed_client, mock_tapis_files_with_location, mock_vit, mock_celery_task
):
    client = make_authed_client()

    payload = {
        "inferenceType": "classification",
        "files": [
            {
                "systemId": "designsafe.storage.default",
                "path": "/path/to/test-image-with-location.jpg",
            }
        ],
        "model": "google/vit-base-patch16-224",
    }
    response = client.post("/inference/jobs/sync", json=payload)

    assert response.status_code == 200
    data = response.json()

    result = data["results"][0]
    assert result["metadata"]["longitude"] is not None
    assert result["metadata"]["latitude"] is not None


def test_sync_inference_unauthed(
    client_unauthed, mock_tapis_files, mock_vit, mock_celery_task
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
    response = client_unauthed.post("/inference/jobs/sync", json=payload)
    assert response.status_code == 401
