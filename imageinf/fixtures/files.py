import pytest
from pathlib import Path


@pytest.fixture
def mock_photo_file_without_location():
    file_path = Path(__file__).parent / "./files/image_without_location.jpg"
    with open(file_path.resolve(), "rb") as f:
        return f.read()


@pytest.fixture
def mock_photo_file_with_location():
    file_path = Path(__file__).parent / "./files/image_with_location.jpg"
    with open(file_path.resolve(), "rb") as f:
        return f.read()
