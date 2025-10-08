import os
import torch
from PIL import Image
from typing import List

from tapipy.tapis import Tapis
from transformers import ViTForImageClassification, ViTImageProcessor
from transformers import AutoImageProcessor, CLIPForImageClassification
import torch.nn.functional as F
from transformers import CLIPModel, CLIPProcessor
from .models import TapisFile, InferenceResult, Prediction, InferenceResponse

CACHE_DIR = "cache_images"  # TODO add periodic cleanup
DEFAULT_MODEL_NAME = "google/vit-base-patch16-224"
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
    def __init__(self, model_name="google/vit-base-patch16-224"):
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


@register_model_runner(
    "openai/clip-vit-base-patch32",
    description="Zero-shot house vs car using CLIP text-image similarity.",
    link="https://huggingface.co/docs/transformers/en/model_doc/clip",
)
class ClipModel:
    def __init__(self, model_name: str = "openai/clip-vit-base-patch32"):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = CLIPModel.from_pretrained(model_name).to(self.device)
        self.processor = CLIPProcessor.from_pretrained(model_name)

        # The labels we care about
        self.labels = ["house", "car"]

        # A few prompt templates tends to improve robustness; we’ll average them
        self.templates = [
            "a photo of a {}",
            "a cropped photo of a {}",
            "a street scene with a {}",
            "an aerial photo of a {}",
            "a picture of a {}",
        ]

        # Pre-compute the text embeddings once (cached)
        with torch.no_grad():
            all_prompts = [t.format(lbl) for lbl in self.labels for t in self.templates]
            text_inputs = self.processor(text=all_prompts, return_tensors="pt", padding=True)
            text_inputs = {k: v.to(self.device) for k, v in text_inputs.items()}

            # shape: [num_prompts, D]
            text_embeds = self.model.get_text_features(
                input_ids=text_inputs["input_ids"],
                attention_mask=text_inputs["attention_mask"],
            )
            text_embeds = F.normalize(text_embeds, dim=-1)

            # Average templates per label
            n_templates = len(self.templates)
            # reshape to [num_labels, n_templates, D] then mean over templates
            self.text_features = (
                text_embeds.reshape(len(self.labels), n_templates, -1).mean(dim=1)
            )  # -> [num_labels, D]
            self.text_features = F.normalize(self.text_features, dim=-1)  # safety normalize

    def classify_image(self, image: Image.Image) -> List["Prediction"]:
        """
        Returns two Prediction entries for 'house' and 'car' with probabilities summing to 1.0.
        """
        # Preprocess image
        inputs = self.processor(images=image, return_tensors="pt")
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.no_grad():
            # [1, D]
            image_embeds = self.model.get_image_features(pixel_values=inputs["pixel_values"])
            image_embeds = F.normalize(image_embeds, dim=-1)

            # Cosine similarity matrix: [1, D] @ [D, num_labels] -> [1, num_labels]
            # Temperature scaling (~as in CLIP’s paper/code)
            logits = (image_embeds @ self.text_features.T) * 100.0
            probs = logits.softmax(dim=-1).squeeze(0).tolist()  # length == 2

        # Build your existing Prediction objects
        predictions = [
            Prediction(label=label, score=round(prob, 4))
            for label, prob in zip(self.labels, probs)
        ]
        # Sort high->low to keep consistent with your previous top-k behavior
        predictions.sort(key=lambda p: p.score, reverse=True)
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
    files: List[TapisFile], jwt_token: str, model_name: str = DEFAULT_MODEL_NAME
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
