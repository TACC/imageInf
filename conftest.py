from fastapi.testclient import TestClient
from imageinf.main import app
import pytest


pytest_plugins = [
    "imageinf.fixtures.files",
    "imageinf.fixtures.tapis",
]


@pytest.fixture
def client_unauthed(mock_tapis_token):
    return TestClient(app)


@pytest.fixture
def client_authed(mock_tapis_auth, mock_tapis_token):
    # Subclass TestClient to auto-inject headers
    class AuthedClient(TestClient):
        def request(self, method, url, *args, **kwargs):
            headers = kwargs.pop("headers", {}) or {}
            headers["X-Tapis-Token"] = mock_tapis_token
            return super().request(method, url, *args, headers=headers, **kwargs)

    return AuthedClient(app)
