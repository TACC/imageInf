from pydantic import BaseModel
from typing import List


class TapisFile(BaseModel):
    systemId: str
    path: str


class Prediction(BaseModel):
    label: str
    score: float


class InferenceResult(BaseModel):
    systemId: str
    path: str
    predictions: List[Prediction]


class InferenceResponse(BaseModel):
    model: str
    results: List[InferenceResult]


class InferenceRequest(BaseModel):
    inferenceType: str = "classification"
    files: List[TapisFile]
