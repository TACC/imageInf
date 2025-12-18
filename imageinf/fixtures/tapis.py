import pytest
from unittest.mock import MagicMock
import jwt
import time


@pytest.fixture
def mock_tapis_token():
    payload = {
        "iss": "https://designsafe.tapis.io/v3/tokens",
        "sub": "test_user_name@designsafe",
        "tapis/tenant_id": "designsafe",
        "tapis/token_type": "access",
        "tapis/username": "test_user_name",
        "tapis/account_type": "user",
        "exp": time.time() + 300,
    }
    token = jwt.encode(payload, key="dummy-key", algorithm="HS256")
    return token


@pytest.fixture
def mock_tapis_auth(monkeypatch):
    mock_client = MagicMock()
    mock_client.validate_token.return_value = {
        "tapis/username": "testuser",
        "tapis/tenant_id": "designsafe",
        "exp": time.time() + 600,
    }

    monkeypatch.setattr("imageinf.utils.auth.Tapis", lambda *a, **kw: mock_client)
    return mock_client


@pytest.fixture
def mock_tapis_files_factory(monkeypatch):
    """Factory fixture that accepts the photo file to use."""

    def _create_mock(photo_file):
        mock_client = MagicMock()
        mock_files = MagicMock()
        mock_files.getContents.side_effect = lambda systemId, path: photo_file
        mock_client.files = mock_files

        monkeypatch.setattr(
            "imageinf.inference.processor.Tapis", lambda *a, **kw: mock_client
        )
        return mock_client

    return _create_mock


@pytest.fixture
def mock_tapis_files(mock_tapis_files_factory, mock_photo_file_without_location):
    return mock_tapis_files_factory(mock_photo_file_without_location)


@pytest.fixture
def mock_tapis_files_with_location(
    mock_tapis_files_factory, mock_photo_file_with_location
):
    return mock_tapis_files_factory(mock_photo_file_with_location)
