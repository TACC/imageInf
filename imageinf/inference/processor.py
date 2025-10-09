import os
import torch
from PIL import Image
from typing import List, Optional, Dict

from tapipy.tapis import Tapis
from transformers import AutoModelForImageClassification, AutoImageProcessor
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

class TransformerModel:
    """Base class for Vision Transformers (ViT, Swin, etc.)"""

    def __init__(self, model_name: str):
        # Support Apple Silicon, NVIDIA, or CPU
        if torch.backends.mps.is_available():
            self.device = torch.device("mps")
        elif torch.cuda.is_available():
            self.device = torch.device("cuda")
        else:
            self.device = torch.device("cpu")

        self.model = AutoModelForImageClassification.from_pretrained(model_name).to(
            self.device
        )
        self.processor = AutoImageProcessor.from_pretrained(model_name)

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
    "google/vit-base-patch16-224",
    description="Vision Transformer (ViT) base model - 86M params, 224x224",
    link="https://huggingface.co/google/vit-base-patch16-224",
)
class ViTBaseModel(TransformerModel):
    pass


@register_model_runner(
    "google/vit-large-patch16-224",
    description="Vision Transformer (ViT) large model - 304M params, 224x224",
    link="https://huggingface.co/google/vit-large-patch16-224",
)
class ViTLargeModel(TransformerModel):
    pass


@register_model_runner(
    "google/vit-large-patch16-384",
    description="Vision Transformer (ViT) large model - 304M params, 384x384 (high res)",
    link="https://huggingface.co/google/vit-large-patch16-384",
)
class ViTLarge384Model(TransformerModel):
    pass


#@register_model_runner(
#    "google/vit-huge-patch14-224-in21k",
#    description="Vision Transformer (ViT) huge model - 632M params, trained on ImageNet-21k",
#    link="https://huggingface.co/google/vit-huge-patch14-224-in21k",
#)
#class ViTHugeModel(TransformerModel):
#    pass


@register_model_runner(
    "microsoft/swin-large-patch4-window7-224",
    description="Swin Transformer large - 197M params, 224x224 (good balance of speed/accuracy)",
    link="https://huggingface.co/microsoft/swin-large-patch4-window7-224",
)
class SwinLargeModel(TransformerModel):
    pass


@register_model_runner(
    "openai/clip-vit-large-patch14",
    description="Zero-shot multi-label tagging (no forced fallback).",
    link="https://huggingface.co/docs/transformers/en/model_doc/clip",
)
class ClipModel:
    def __init__(self, model_name: str = "openai/clip-vit-large-patch14"):
        if torch.backends.mps.is_available():
            self.device = torch.device("mps")
        elif torch.cuda.is_available():
            self.device = torch.device("cuda")
        else:
            self.device = torch.device("cpu")

        self.model = CLIPModel.from_pretrained(model_name).to(self.device)
        self.processor = CLIPProcessor.from_pretrained(model_name)

        self.labels = ["car", "person", "house", "building"]
        self.templates = [
            "a photo of a {}",
            "a picture of a {}",
            "an image of a {}",
        ]

        self.temperature = 1.0
        self.scale = 1.0
        self.bias = 0.0

        with torch.no_grad():
            prompts = [t.format(lbl) for lbl in self.labels for t in self.templates]
            text_inputs = self.processor(text=prompts, return_tensors="pt", padding=True)
            text_inputs = {k: v.to(self.device) for k, v in text_inputs.items()}
            text_embeds = self.model.get_text_features(
                input_ids=text_inputs["input_ids"],
                attention_mask=text_inputs["attention_mask"],
            )
            text_embeds = F.normalize(text_embeds, dim=-1)
            ntemp = len(self.templates)
            text_features = text_embeds.reshape(len(self.labels), ntemp, -1).mean(dim=1)
            self.text_features = F.normalize(text_features, dim=-1)

    def classify_image(
            self,
            image: Image.Image,
            threshold: float = 0.3,
            top_k: Optional[int] = None,
            return_all_scores: bool = False,
    ) -> List["Prediction"] | Dict[str, float]:
        """
        Multi-label: returns ONLY labels with score >= threshold.
        - No fallback: may return an empty list.
        - If return_all_scores=True, returns {label: score} for all labels (no thresholding).
        """
        inputs = self.processor(images=image, return_tensors="pt")
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.no_grad():
            img_feat = self.model.get_image_features(pixel_values=inputs["pixel_values"])
            img_feat = F.normalize(img_feat, dim=-1)
            sims = (img_feat @ self.text_features.T).squeeze(0)  # [num_labels]
            logits = sims * self.temperature
            probs = torch.sigmoid((logits - self.bias) * (self.scale / self.temperature))

        scores = probs.tolist()

        if return_all_scores:
            # return raw scores for every label (helpful for analytics/threshold tuning)
            return {lbl: float(s) for lbl, s in zip(self.labels, scores)}

        preds = [Prediction(label=lbl, score=round(float(s), 4))
                 for lbl, s in zip(self.labels, scores)
                 if s >= threshold]

        preds.sort(key=lambda p: p.score, reverse=True)

        if top_k is not None:
            preds = preds[:top_k]

        # No fallback: OK to return []
        return preds


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