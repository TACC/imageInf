from .clip_base import BaseCLIPModel
from .registry import register_model_runner


@register_model_runner(
    "openai/clip-vit-large-patch14",
    model_type="clip",
    description="CLIP ViT-Large - zero-shot multi-label (~400M params)",
    link="https://huggingface.co/openai/clip-vit-large-patch14",
)
class CLIPViTLarge(BaseCLIPModel):
    """Standard OpenAI CLIP with ViT-Large backbone"""

    pass


@register_model_runner(
    "wkcn/TinyCLIP-ViT-40M-32-Text-19M-LAION400M",
    model_type="clip",
    description="TinyCLIP - efficient zero-shot classifier (~59M params total)",
    link="https://huggingface.co/wkcn/TinyCLIP-ViT-40M-32-Text-19M-LAION400M",
)
class TinyCLIP(BaseCLIPModel):
    """Lightweight CLIP variant - great for resource-constrained environments"""

    DEFAULT_THRESHOLD = 0.50
    pass


@register_model_runner(
    "laion/CLIP-ViT-H-14-laion2B-s32B-b79K",
    model_type="clip",
    description="CLIP ViT-Huge - highest accuracy zero-shot (~1B params)",
    link="https://huggingface.co/laion/CLIP-ViT-H-14-laion2B-s32B-b79K",
)
class CLIPViTHuge(BaseCLIPModel):
    """Largest CLIP variant trained on LAION-2B - best performance"""

    DEFAULT_THRESHOLD = 0.60
    pass
