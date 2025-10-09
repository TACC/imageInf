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
    description="Zero-shot multi-label tagging using CLIP with paired positives/negatives.",
    link="https://huggingface.co/docs/transformers/en/model_doc/clip",
)
class ClipModel:
    def __init__(self, model_name: str = "openai/clip-vit-large-patch14"):
        # Device selection
        if torch.backends.mps.is_available():
            self.device = torch.device("mps")
        elif torch.cuda.is_available():
            self.device = torch.device("cuda")
        else:
            self.device = torch.device("cpu")

        self.model = CLIPModel.from_pretrained(model_name).to(self.device)
        self.processor = CLIPProcessor.from_pretrained(model_name)

        # Keep your label set modest at first; expand once thresholds are tuned.
        self.labels = [
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
            "sky"
        ]

        # Negative phrases per label (can be tuned)
        self.neg_templates = {
            lab: f"no {lab} present" for lab in self.labels
        }

        # Small temperature for the 2-way softmax; 15–30 works well.
        self.binary_temperature = 20.0

        # Pre-compute & cache text features for [positive, negative] pairs
        pairs = []
        for lab in self.labels:
            pos = f"a photo of a {lab}"
            neg = self.neg_templates[lab]
            pairs.append((pos, neg))

        all_texts = [t for pair in pairs for t in pair]  # [pos, neg, pos, neg, ...]
        with torch.no_grad():
            ti = self.processor(text=all_texts, return_tensors="pt", padding=True)
            ti = {k: v.to(self.device) for k, v in ti.items()}
            emb = self.model.get_text_features(
                input_ids=ti["input_ids"], attention_mask=ti["attention_mask"]
            )
            emb = F.normalize(emb, dim=-1)
            # reshape to [L, 2, D]
            self.text_pairs = emb.reshape(len(self.labels), 2, -1)

    def classify_image(
        self,
        image: Image.Image,
        threshold: float = 0.55,    # presence prob cutoff; TODO
        top_k: Optional[int] = None,
        debug_when_empty: bool = True,
    ) -> List[Prediction]:
        """
        Multi-label presence scoring via paired positive/negative prompts.
        - Returns any labels with presence >= threshold.
        - May return []
        """
        # Ensure RGB
        if image.mode != "RGB":
            image = image.convert("RGB")

        # Preprocess & send to device
        inputs = self.processor(images=image, return_tensors="pt")
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.no_grad():
            img_feat = self.model.get_image_features(pixel_values=inputs["pixel_values"])
            img_feat = F.normalize(img_feat, dim=-1)  # [1, D]

            # cosine sims to each [pos, neg] pair: [1, L, 2]
            # einsum: (B,D) x (L,2,D) -> (B,L,2)
            sims2 = torch.einsum("bd,lcd->blc", img_feat, self.text_pairs)

            # small temperature for 2-way competition
            logits2 = sims2 * self.binary_temperature  # [1, L, 2]
            probs2 = torch.softmax(logits2, dim=-1)[0]  # [L, 2]
            presence = probs2[:, 0]  # probability of the positive class

        scores = presence.tolist()
        preds_all = [Prediction(label=lbl, score=round(float(s), 4))
                     for lbl, s in zip(self.labels, scores)]
        preds_all.sort(key=lambda p: p.score, reverse=True)

        # Filter by threshold
        preds = [p for p in preds_all if p.score >= threshold]
        if top_k is not None:
            preds = preds[:top_k]


        if not preds and debug_when_empty:
            top_dbg = preds_all[:5]
            print("[CLIP debug] No labels passed threshold."
                  f" Max={top_dbg[0].label}:{top_dbg[0].score}"
                  f" Top5={[(p.label, p.score) for p in top_dbg]}")
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


# Mapping the ImageNet-1k to larger categories
CATEGORY_MAPPING = {
    "car": [
        "sports car", "convertible", "beach wagon", "cab", "taxi",
        "police van", "ambulance", "limousine", "minivan", "Model T",
        "racer", "race car", "go-kart", "golfcart", "fire engine",
        "pickup", "tow truck", "jeep", "landrover", "passenger car",
        "car wheel", "minibus", "moving van", "garbage truck", "dustcart",
        "tow truck", "recreational vehicle", "trailer truck"
    ],
    "person": [
        # ImageNet-1K only has these 3 humans?
        "scuba diver", "bridegroom", "groom", "baseball player"
    ],
    "building": [
        # Residential buildings
        "mobile home", "manufactured home", "trailer", "recreational vehicle",
        "boathouse", "cottage", "lakeside", "dwelling", "villa",

        # Large residential
        "palace", "castle", "monastery", "abbey", "convent",

        # Commercial buildings
        "restaurant", "bakery", "grocery store", "butcher shop",
        "confectionery", "toyshop", "bookshop", "shoe shop",
        "tobacco shop", "barbershop", "apothecary shop",
        "storefront", "mercantile establishment",

        # Institutional buildings
        "library", "church", "mosque", "synagogue", "temple",
        "school", "prison", "hospital", "theater", "theatre",
        "cinema", "movie theater", "bell cote", "bell tower",

        # Industrial buildings
        "barn", "threshing machine", "lumbermill", "steel mill",
        "factory", "brewery", "winery",

        # Multi-unit residential
        "apartment", "apartment building", "housing",

        # Tall buildings
        "skyscraper", "office building", "tower",

        # Structures with roofs
        "greenhouse", "canopy", "dome", "pavilion",
        "bannister", "sliding door", "dwelling",

        # Other structures
        "beacon", "pier", "dock", "boathouse", "pier",
        "tollbooth", "booth", "gas station", "gasoline station",
        "moving van"
    ],
    "animal": [
        # Dogs (ImageNet has ~100+ dog breeds)
        "dog", "puppy", "poodle", "corgi", "pug", "chihuahua",
        "shepherd", "german shepherd", "collie", "border collie",
        "retriever", "golden retriever", "labrador",
        "beagle", "basset", "bloodhound", "foxhound",
        "terrier", "bull terrier", "boston terrier", "yorkshire terrier",
        "bulldog", "boxer", "mastiff", "rottweiler",
        "husky", "malamute", "samoyed", "pomeranian",
        "chow", "keeshond", "spitz", "schipperke",

        # Cats
        "cat", "tabby", "tiger cat", "persian cat", "siamese cat",
        "egyptian cat", "cougar", "lynx",

        # Farm animals
        "horse", "cow", "ox", "cattle", "sheep", "ram", "bighorn",
        "pig", "hog", "piglet", "chicken", "hen", "rooster",

        # Wild animals
        "elephant", "bear", "lion", "tiger", "leopard", "cheetah",
        "zebra", "giraffe", "monkey", "gorilla", "chimpanzee",
        "orangutan", "baboon", "panda", "sloth bear",
        "wolf", "coyote", "fox", "hyena",
        "deer", "elk", "moose", "gazelle", "antelope",
        "hippopotamus", "rhinoceros", "warthog",

        # Marine animals
        "whale", "dolphin", "seal", "sea lion",

        # Birds
        "bird", "eagle", "vulture", "owl", "hawk",
        "parrot", "macaw", "cockatoo", "toucan",
        "flamingo", "stork", "crane", "heron", "egret",
        "pelican", "albatross", "goose", "duck", "swan",
        "peacock", "pheasant", "quail", "partridge",
        "ostrich", "penguin", "chicken", "rooster", "hen",

        # Reptiles & Amphibians
        "turtle", "tortoise", "terrapin",
        "lizard", "iguana", "chameleon", "gecko",
        "snake", "cobra", "viper", "boa",
        "crocodile", "alligator",
        "frog", "toad", "salamander", "newt",

        # Fish
        "fish", "goldfish", "tench", "barracouta",
        "eel", "coho", "rock beauty", "anemone fish",
        "sturgeon", "gar", "lionfish", "puffer",
        "stingray", "electric ray", "jellyfish",

        # Insects & Invertebrates
        "butterfly", "moth", "admiral", "ringlet",
        "monarch", "cabbage butterfly", "sulphur butterfly",
        "lycaenid", "dragonfly", "damselfly",
        "beetle", "ladybug", "ground beetle", "leaf beetle",
        "dung beetle", "rhinoceros beetle",
        "bee", "honeybee", "fly", "bee eater",
        "ant", "grasshopper", "cricket", "stick insect",
        "cockroach", "mantis", "cicada", "leafhopper",
        "lacewing", "scorpion", "spider", "tarantula",
        "tick", "centipede", "millipede",
        "snail", "slug", "sea slug", "chiton",
        "sea urchin", "sea cucumber", "starfish",
        "crab", "hermit crab", "lobster", "crayfish",
        "isopod", "conch"
    ],
    "nature": [
        "mountain", "valley", "cliff", "promontory", "alp",
        "volcano", "geyser", "hot spring",
        "lakeside", "lakeshore", "seashore", "coast", "sandbar",
        "beach", "coral reef", "shoal",
        "cliff face", "stone wall", "rock"
    ],
    "infrastructure": [
        "bridge", "suspension bridge", "steel arch bridge",
        "viaduct", "aqueduct",
        "dam", "dike", "breakwater", "jetty",
        "pier", "dock", "boathouse",
        "beacon", "lighthouse", "beacon light",
        "traffic light", "street sign", "parking meter",
        "mailbox", "letter box",
        "fountain", "triumphal arch", "arch",
        "megalith", "stone wall", "wall",
        "bannister", "baluster", "railing"
    ],
    "equipment": [
        "solar dish", "solar collector", "solar furnace",
        "beacon", "spotlight", "torch"
    ],
}


def aggregate_predictions(predictions: List[Prediction]) -> List[Prediction]:
    """
    Aggregate fine-grained ImageNet labels into coarse categories.

    ImageNet labels often contain comma-separated synonyms
    (e.g., "mobile home, manufactured home", "solar dish, solar collector, solar furnace").
    This function splits these labels and matches against our category keywords.

    Matching strategy:
    1. Split ImageNet label on commas to get individual synonyms
    2. For each synonym, check if any of our keywords appear as substrings
    3. Assign to the first matching category
    4. Take the maximum score if multiple labels match the same category

    TODO: Use an LLM to dynamically map ImageNet labels to categories instead of this approach
    """
    category_scores = {}

    for pred in predictions:
        label_lower = pred.label.lower()

        # Split on commas to handle synonyms (e.g., "mobile home, manufactured home")
        # ImageNet often provides multiple names for the same concept
        label_parts = [part.strip() for part in label_lower.split(',')]

        matched = False
        for category, keywords in CATEGORY_MAPPING.items():
            if matched:
                break  # Only assign to first matching category

            # Check if any keyword matches any part of the label
            for label_part in label_parts:
                for keyword in keywords:
                    if keyword.lower() in label_part:
                        # Take the maximum score if multiple labels match same category
                        category_scores[category] = max(
                            category_scores.get(category, 0.0),
                            pred.score
                        )
                        matched = True
                        break
                if matched:
                    break

    # Return sorted by score (highest first)
    aggregated = [
        Prediction(label=cat, score=round(score, 4))
        for cat, score in category_scores.items()
    ]

    return sorted(aggregated, key=lambda p: p.score, reverse=True)


# Public interface: plugin dispatch
def run_model_on_tapis_images(
        files: List[TapisFile],
        jwt_token: str,
        model_name: str = DEFAULT_MODEL_NAME
) -> InferenceResponse:
    if model_name not in MODEL_REGISTRY:
        raise ValueError(f"Model '{model_name}' is not supported.")
    ModelClass = MODEL_REGISTRY[model_name]
    model = ModelClass(model_name)

    tapis = Tapis(base_url="https://designsafe.tapis.io", access_token=jwt_token)

    results = []
    aggregated_results = []

    for file in files:
        try:
            image = get_image_file(tapis, file.systemId, file.path)
            predictions = model.classify_image(image)

            # Always create detailed results
            results.append(
                InferenceResult(
                    systemId=file.systemId,
                    path=file.path,
                    predictions=predictions
                )
            )

            # Always create aggregated results (skip for CLIP)
            if "clip" not in model_name.lower():
                aggregated = aggregate_predictions(predictions)
                aggregated_results.append(
                    InferenceResult(
                        systemId=file.systemId,
                        path=file.path,
                        predictions=aggregated
                    )
                )
            else:
                # For CLIP, just copy the results since it's already aggregated
                aggregated_results.append(
                    InferenceResult(
                        systemId=file.systemId,
                        path=file.path,
                        predictions=predictions
                    )
                )

        except Exception as e:
            raise RuntimeError(f"Failed to process {file.path}: {str(e)}")

    return InferenceResponse(
        model=model_name,
        aggregated_results=aggregated_results,
        results=results
    )