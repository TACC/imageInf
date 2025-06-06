import pytest
from pathlib import Path


@pytest.fixture
def mock_photo_file():
    file_path = Path(__file__).parent / "./files/Photo 1642618419.jpg"
    with open(file_path.resolve(), "rb") as f:
        return f.read()
