import logging

from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
from typing import Optional, Tuple
from datetime import datetime
from imageinf.inference.models import ImageMetadata

logger = logging.getLogger(__name__)


def extract_image_metadata(image_path: str) -> Optional[ImageMetadata]:
    """Extract metadata from image EXIF data using PIL."""
    try:
        img = Image.open(image_path)
        exif = img._getexif()

        if not exif:
            return None

        metadata = {
            "date_taken": None,
            "latitude": None,
            "longitude": None,
            "altitude": None,
            "camera_make": None,
            "camera_model": None,
        }

        # Map EXIF tag IDs to names
        exif_data = {TAGS.get(k, k): v for k, v in exif.items()}

        # Date taken
        if "DateTimeOriginal" in exif_data:
            try:
                metadata["date_taken"] = datetime.strptime(
                    exif_data["DateTimeOriginal"], "%Y:%m:%d %H:%M:%S"
                )
            except (ValueError, TypeError):
                pass

        # Camera info
        metadata["camera_make"] = exif_data.get("Make")
        metadata["camera_model"] = exif_data.get("Model")

        # GPS
        if "GPSInfo" in exif_data:
            gps_info = {GPSTAGS.get(k, k): v for k, v in exif_data["GPSInfo"].items()}
            lat, lon = _extract_gps_from_pil(gps_info)
            metadata["latitude"] = lat
            metadata["longitude"] = lon

            # Altitude
            if "GPSAltitude" in gps_info:
                try:
                    metadata["altitude"] = float(gps_info["GPSAltitude"])
                except (TypeError, ValueError):
                    pass

        return ImageMetadata(**metadata)

    except Exception as e:
        logger.warning(f"Warning: Could not extract metadata: {e}")
        return None


def _extract_gps_from_pil(gps_info: dict) -> Tuple[Optional[float], Optional[float]]:
    """Extract GPS coordinates from PIL GPSInfo dict."""
    try:
        if "GPSLatitude" not in gps_info or "GPSLongitude" not in gps_info:
            return None, None

        def dms_to_decimal(dms, ref):
            degrees, minutes, seconds = dms
            decimal = float(degrees) + float(minutes) / 60 + float(seconds) / 3600
            if ref in ["S", "W"]:
                decimal = -decimal
            return decimal

        lat = dms_to_decimal(
            gps_info["GPSLatitude"], gps_info.get("GPSLatitudeRef", "N")
        )
        lon = dms_to_decimal(
            gps_info["GPSLongitude"], gps_info.get("GPSLongitudeRef", "E")
        )
        return lat, lon

    except Exception as e:
        logger.error(f"Error extracting GPS: {e}")
        return None, None
