import os
from PIL import Image
from tapipy.tapis import Tapis

from .config import CACHE_DIR
from .metadata import extract_image_metadata


def get_image_file(tapis: Tapis, system: str, path: str) -> Image.Image:
    """
    Download (and cache) an image from Tapis, and return image + metadata.
    """
    local_path = os.path.join(CACHE_DIR, system.strip("/"), path.strip("/"))
    os.makedirs(os.path.dirname(local_path), exist_ok=True)

    if not os.path.exists(local_path):
        file_content = tapis.files.getContents(systemId=system, path=path)
        with open(local_path, "wb") as f:
            f.write(file_content)

    image = Image.open(local_path)
    metadata = extract_image_metadata(local_path)

    return image, metadata
