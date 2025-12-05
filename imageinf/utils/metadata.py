import exifread
from typing import Optional, Tuple
from datetime import datetime
from imageinf.inference.models import ImageMetadata


def extract_image_metadata(image_path: str) -> Optional[ImageMetadata]:
    """
    Extract metadata from image EXIF data using exifread library.
    More robust than PIL's built-in EXIF parser.
    """
    try:
        with open(image_path, "rb") as f:
            tags = exifread.process_file(f, details=False)

        if not tags:
            return None

        metadata = {
            "date_taken": None,
            "latitude": None,
            "longitude": None,
            "altitude": None,
            "camera_make": None,
            "camera_model": None,
        }

        # Date taken
        if "EXIF DateTimeOriginal" in tags:
            try:
                date_str = str(tags["EXIF DateTimeOriginal"])
                metadata["date_taken"] = datetime.strptime(
                    date_str, "%Y:%m:%d %H:%M:%S"
                )
            except (ValueError, TypeError) as e:
                print(f"Could not parse date: {e}")

        # Camera info
        if "Image Make" in tags:
            metadata["camera_make"] = str(tags["Image Make"])
        if "Image Model" in tags:
            metadata["camera_model"] = str(tags["Image Model"])

        # GPS coordinates - exifread provides helper for this!
        lat, lon = _extract_gps_from_exifread(tags)
        if lat is not None and lon is not None:
            metadata["latitude"] = lat
            metadata["longitude"] = lon

        # Altitude
        if "GPS GPSAltitude" in tags:
            try:
                alt_rational = tags["GPS GPSAltitude"].values[0]
                metadata["altitude"] = float(alt_rational.num) / float(alt_rational.den)
            except (AttributeError, ZeroDivisionError, IndexError):
                pass
        print(metadata)
        return ImageMetadata(**metadata)

    except Exception as e:
        print(f"Warning: Could not extract metadata: {e}")
        return None


def _extract_gps_from_exifread(tags: dict) -> Tuple[Optional[float], Optional[float]]:
    """
    Extract and convert GPS coordinates from exifread tags.
    exifread handles the rational number conversion for us.
    """
    try:
        # Check if GPS data exists
        if "GPS GPSLatitude" not in tags or "GPS GPSLongitude" not in tags:
            return None, None

        lat_ref = str(tags.get("GPS GPSLatitudeRef", "N"))
        lon_ref = str(tags.get("GPS GPSLongitudeRef", "E"))

        # exifread provides GPS values as list of IfdTag objects with .values attribute
        lat_values = tags["GPS GPSLatitude"].values
        lon_values = tags["GPS GPSLongitude"].values

        # Convert to decimal
        def dms_to_decimal(dms_values, ref):
            """Convert DMS to decimal, handling exifread's rational format"""
            try:
                # Each value is a Ratio object with num/den
                degrees = float(dms_values[0].num) / float(dms_values[0].den)
                minutes = float(dms_values[1].num) / float(dms_values[1].den)
                seconds = float(dms_values[2].num) / float(dms_values[2].den)

                # Check for NaN or invalid values
                if any(x != x for x in [degrees, minutes, seconds]):  # NaN check
                    print(f"Warning: NaN values in GPS data: {dms_values}")
                    return None

                decimal = degrees + (minutes / 60.0) + (seconds / 3600.0)

                if ref in ["S", "W"]:
                    decimal = -decimal

                return decimal
            except (ZeroDivisionError, AttributeError, IndexError) as e:
                print(f"Error converting GPS: {e}, values: {dms_values}")
                return None

        latitude = dms_to_decimal(lat_values, lat_ref)
        longitude = dms_to_decimal(lon_values, lon_ref)

        if latitude is None or longitude is None:
            return None, None

        return latitude, longitude

    except Exception as e:
        print(f"Error extracting GPS: {e}")
        return None, None
