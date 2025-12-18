from typing import List, Optional
from PIL import Image
import torch
import torch.nn.functional as F
from transformers import CLIPModel, CLIPProcessor

from .models import Prediction


class BaseCLIPModel:
    """Base class for CLIP-based zero-shot multi-label classifiers"""

    DEFAULT_LABELS = [
        "house",
        "building",
        # Vehicles
        "car",
        "truck",
        "bus",
        # People
        "person",
        "group of people",
        # Infrastructure
        "road",
        "bridge",
        "parking lot",
        # Damage
        "debris",
        "rubble",
        "damaged building",
        "flooded area",
        "fallen tree",
        # Context
        "trees",
        "water",
        "sky",
    ]

    DEFAULT_THRESHOLD = 0.55
    BINARY_TEMPERATURE = 20.0

    def __init__(self, model_name: str, labels: Optional[List[str]] = None):
        if torch.backends.mps.is_available():
            self.device = torch.device("mps")
        elif torch.cuda.is_available():
            self.device = torch.device("cuda")
        else:
            self.device = torch.device("cpu")

        self.model = CLIPModel.from_pretrained(model_name).to(self.device)
        self.processor = CLIPProcessor.from_pretrained(model_name)

        self.labels = labels or self.DEFAULT_LABELS
        self.neg_templates = {lab: f"no {lab} present" for lab in self.labels}

        self._precompute_text_features()

    def _precompute_text_features(self):
        pairs = []
        for lab in self.labels:
            pos = f"a photo of a {lab}"
            neg = self.neg_templates[lab]
            pairs.append((pos, neg))

        all_texts = [t for pair in pairs for t in pair]
        with torch.no_grad():
            ti = self.processor(text=all_texts, return_tensors="pt", padding=True)
            ti = {k: v.to(self.device) for k, v in ti.items()}
            emb = self.model.get_text_features(
                input_ids=ti["input_ids"], attention_mask=ti["attention_mask"]
            )
            emb = F.normalize(emb, dim=-1)
            self.text_pairs = emb.reshape(len(self.labels), 2, -1)

    def classify_image(
        self,
        image: Image.Image,
        threshold: Optional[float] = None,
        top_k: Optional[int] = None,
        debug_when_empty: bool = True,
    ) -> List[Prediction]:
        if threshold is None:
            threshold = self.DEFAULT_THRESHOLD

        if image.mode != "RGB":
            image = image.convert("RGB")

        inputs = self.processor(images=image, return_tensors="pt")
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.no_grad():
            img_feat = self.model.get_image_features(
                pixel_values=inputs["pixel_values"]
            )
            img_feat = F.normalize(img_feat, dim=-1)

            sims2 = torch.einsum("bd,lcd->blc", img_feat, self.text_pairs)
            logits2 = sims2 * self.BINARY_TEMPERATURE
            probs2 = torch.softmax(logits2, dim=-1)[0]
            presence = probs2[:, 0]

        scores = presence.tolist()
        preds_all = [
            Prediction(label=lbl, score=round(float(s), 4))
            for lbl, s in zip(self.labels, scores)
        ]
        preds_all.sort(key=lambda p: p.score, reverse=True)

        preds = [p for p in preds_all if p.score >= threshold]
        if top_k is not None:
            preds = preds[:top_k]

        if not preds and debug_when_empty:
            top_dbg = preds_all[:5]
            print(
                f"[CLIP debug] No labels passed threshold={threshold}. "
                f"Max={top_dbg[0].label}:{top_dbg[0].score} "
                f"Top5={[(p.label, p.score) for p in top_dbg]}"
            )
        return preds
