import pytest
from imageinf.inference.tasks import run_inference_task


def test_run_inference_task(mock_tapis_files, mock_tapis_auth, mock_vit):
    files = [
        {"systemId": "designsafe.storage.default", "path": "/path/to/test-image.jpg"}
    ]
    user_data = {
        "username": "testuser",
        "tapis_token": "fake-token",
        "tenant_host": "https://designsafe.tapis.io",
    }

    result = run_inference_task(
        files,
        user_data,
        "google/vit-base-patch16-224",
    )

    assert "model" in result
    assert "results" in result
    assert len(result["results"]) == 1
    assert result["results"][0]["predictions"][0]["label"] == "mock-label"


def test_run_inference_task_invalid_model(mock_tapis_files, mock_tapis_auth):
    files = [
        {"systemId": "designsafe.storage.default", "path": "/path/to/test-image.jpg"}
    ]
    user_data = {
        "username": "testuser",
        "tapis_token": "fake-token",
        "tenant_host": "https://designsafe.tapis.io",
    }

    with pytest.raises(ValueError):
        run_inference_task(files, user_data, "nonexistent/model")
