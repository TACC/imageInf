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


@pytest.fixture
def make_authed_client(mock_tapis_auth, mock_tapis_token):
    def _make_client():
        class AuthedClient(TestClient):
            def request(self, method, url, *args, **kwargs):
                headers = kwargs.pop("headers", {}) or {}
                headers["X-Tapis-Token"] = mock_tapis_token
                return super().request(method, url, *args, headers=headers, **kwargs)

        return AuthedClient(app)

    return _make_client


@pytest.fixture(autouse=True)
def isolated_cache_dir(tmp_path, monkeypatch):
    """Use a temporary cache directory for each test."""
    test_cache = tmp_path / "cache_images"
    test_cache.mkdir()
    monkeypatch.setattr("imageinf.utils.config.CACHE_DIR", str(test_cache))
    monkeypatch.setattr("imageinf.utils.io.CACHE_DIR", str(test_cache))
    yield test_cache
    # Cleanup happens automatically via tmp_path - nothing needed here


@pytest.fixture
def mock_celery_task(monkeypatch):
    """Make Celery tasks run synchronously in-process."""
    from imageinf.inference import tasks

    class FakeAsyncResult:
        def __init__(self, result):
            self.result = result

        def get(self, timeout=None):
            return self.result

    def fake_delay(*args, **kwargs):
        # Call the actual task function directly (skip Celery)
        result = tasks.run_inference_task(*args, **kwargs)
        return FakeAsyncResult(result)

    monkeypatch.setattr(tasks.run_inference_task, "delay", fake_delay)


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
