from pydantic import BaseModel
from typing import List, Optional
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


class InferenceResult(BaseModel):
    systemId: str
    path: str
    predictions: List[Prediction]


class InferenceResponse(BaseModel):
    model: str
    aggregated_results: List[InferenceResult]
    results: List[InferenceResult]
    metadata: Optional[ImageMetadata] = None


class InferenceRequest(BaseModel):
    inferenceType: str = "classification"
    files: List[TapisFile]
    model: str = "google/vit-base-patch16-224"
