import os
import torch
from PIL import Image
from typing import List

from tapipy.tapis import Tapis
from transformers import ViTForImageClassification, ViTImageProcessor

from .models import TapisFile, InferenceResult, Prediction, InferenceResponse

CACHE_DIR = "cache_images"  # TODO add periodic cleanup
MODEL_NAME = "google/vit-base-patch16-224"  # TODO generalize

# --- Model Registry ---
MODEL_REGISTRY = {}
MODEL_METADATA = {}


def register_model_runner(model_name, description=None, link=None):
    def decorator(cls):
        MODEL_REGISTRY[model_name] = cls
        MODEL_METADATA[model_name] = {
            "name": model_name,
            "description": description or model_name,
            "link": link or "",
        }
        return cls

    return decorator


# --- Model Runners ---
@register_model_runner(
    "google/vit-base-patch16-224",
    description="Vision Transformer (ViT) base model from"
    " Google, patch size 16, 224x224.",
    link="https://huggingface.co/google/vit-base-patch16-224",
)
class ViTModel:
    def __init__(self, model_name=MODEL_NAME):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = ViTForImageClassification.from_pretrained(model_name).to(
            self.device
        )
        self.processor = ViTImageProcessor.from_pretrained(model_name)

    def classify_image(self, image: Image.Image) -> List[Prediction]:
        inputs = self.processor(images=image, return_tensors="pt").to(self.device)
        with torch.no_grad():
            outputs = self.model(inputs.pixel_values)
            probs = outputs.logits.softmax(-1).squeeze().tolist()

        predictions = [
            Prediction(label=self.model.config.id2label[i], score=round(score, 4))
            for i, score in sorted(enumerate(probs), key=lambda x: x[1], reverse=True)[
                :5
            ]  # Top-5
        ]
        return predictions


# Helper to download and cache image
def get_image_file(tapis: Tapis, system: str, path: str) -> Image.Image:
    local_path = os.path.join(CACHE_DIR, system.strip("/"), path.strip("/"))
    os.makedirs(os.path.dirname(local_path), exist_ok=True)

    if not os.path.exists(local_path):
        file_content = tapis.files.getContents(systemId=system, path=path)
        with open(local_path, "wb") as f:
            f.write(file_content)

    return Image.open(local_path)


# Public interface: plugin dispatch
def run_model_on_tapis_images(
    files: List[TapisFile], jwt_token: str, model_name: str = MODEL_NAME
) -> InferenceResponse:
    if model_name not in MODEL_REGISTRY:
        raise ValueError(f"Model '{model_name}' is not supported.")
    ModelClass = MODEL_REGISTRY[model_name]
    model = ModelClass(model_name)
    tapis = Tapis(base_url="https://designsafe.tapis.io", access_token=jwt_token)

    results = []
    for file in files:
        try:
            image = get_image_file(tapis, file.systemId, file.path)
            predictions = model.classify_image(image)

            results.append(
                InferenceResult(
                    systemId=file.systemId, path=file.path, predictions=predictions
                )
            )

        except Exception as e:
            # Optional: add error logging or partial failure reporting
            raise RuntimeError(f"Failed to process {file.path}: {str(e)}")

    return InferenceResponse(model=model_name, results=results)
