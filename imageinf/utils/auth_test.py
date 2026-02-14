from unittest.mock import MagicMock
from tapipy.errors import BaseTapyException
import jwt
import time

BASE_PAYLOAD = {
    "files": [
        {
            "systemId": "designsafe.storage.default",
            "path": "/path/to/test-image.jpg",
        }
    ]
}

BASE_URL = "/inference/jobs/sync"


def test_missing_token_returns_401(client_unauthed):
    response = client_unauthed.post(BASE_URL, json=BASE_PAYLOAD)
    assert response.status_code == 401
    assert response.json()["detail"] == "Missing X-Tapis-Token"


def test_token_missing_iss_returns_401(client_unauthed):
    bad_token = jwt.encode(
        {
            "sub": "testuser",
            "exp": time.time() + 300,
        },
        key="dummy",
        algorithm="HS256",
    )
    response = client_unauthed.post(
        BASE_URL,
        json=BASE_PAYLOAD,
        headers={"X-Tapis-Token": bad_token},
    )
    assert response.status_code == 401
    assert "issuer" in response.json()["detail"]


def test_token_with_invalid_tenant_returns_401(client_unauthed):
    bad_token = jwt.encode(
        {
            "iss": "https://unauthorized.io",
            "sub": "testuser",
            "tapis/username": "testuser",
            "exp": time.time() + 300,
        },
        key="dummy",
        algorithm="HS256",
    )
    response = client_unauthed.post(
        BASE_URL,
        json=BASE_PAYLOAD,
        headers={"X-Tapis-Token": bad_token},
    )
    assert response.status_code == 401
    assert "Unauthorized Tapis tenant" in response.json()["detail"]


def test_token_validation_base_exception(client_authed, monkeypatch):
    def fake_tapis(*args, **kwargs):
        mock = MagicMock()
        mock.validate_token.side_effect = BaseTapyException()
        return mock

    monkeypatch.setattr("imageinf.utils.auth.Tapis", fake_tapis)

    response = client_authed.post(
        BASE_URL,
        json=BASE_PAYLOAD,
    )

    assert response.status_code == 401
    assert "Authentication failed" in response.json()["detail"]


def test_token_validation_unexpected_exception(client_authed, monkeypatch):
    def fake_tapis(*args, **kwargs):
        raise ValueError("some unexpected error")

    monkeypatch.setattr("imageinf.utils.auth.Tapis", fake_tapis)

    response = client_authed.post(
        BASE_URL,
        json=BASE_PAYLOAD,
    )

    assert response.status_code == 500
    assert response.json()["detail"] == "Internal server error"
