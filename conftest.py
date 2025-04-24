from fastapi.testclient import TestClient
from imageinf.main import app
import pytest


pytest_plugins = [
    "imageinf.fixtures.files",
    "imageinf.fixtures.tapis",
]


@pytest.fixture
def client_unauthed():
    return TestClient(app)


@pytest.fixture
def client_authed(mock_tapis_auth):
    # Using mock_tapis_auth makes this an authed client
    return TestClient(app)
