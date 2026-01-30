from pydantic import BaseModel
from typing import List, Optional, Literal
from datetime import datetime


class TapisFile(BaseModel):
    systemId: str
    path: str


class Prediction(BaseModel):
    label: str
    score: float


class ImageMetadata(BaseModel):
    """Metadata extracted from image EXIF data"""

    date_taken: Optional[datetime] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    altitude: Optional[float] = None
    camera_make: Optional[str] = None
    camera_model: Optional[str] = None


class InferenceResult(BaseModel):
    systemId: str
    path: str
    predictions: List[Prediction]
    metadata: Optional[ImageMetadata] = None


class InferenceResponse(BaseModel):
    model: str
    aggregated_results: List[InferenceResult]
    results: List[InferenceResult]


class InferenceRequest(BaseModel):
    inferenceType: str = "classification"
    files: List[TapisFile]
    model: str = ("google/vit-base-patch16-224",)
    labels: Optional[List[str]] = None  # used in CLIP only
    sensitivity: Optional[Literal["high", "medium", "low"]] = (
        "medium"  # used in CLIP only
    )
