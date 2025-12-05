from typing import List
from PIL import Image
import torch
from transformers import AutoModelForImageClassification, AutoImageProcessor

from .models import Prediction


class TransformerModel:
    """Base class for Vision Transformers (ViT, Swin, etc.)."""

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
            ]
        ]
        return predictions
