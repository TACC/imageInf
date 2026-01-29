from .base_transformer import TransformerModel
from .registry import register_model_runner


@register_model_runner(
    "google/vit-base-patch16-224",
    model_type="vit",
    description="Vision Transformer (ViT) base model - 86M params, 224x224",
    link="https://huggingface.co/google/vit-base-patch16-224",
)
class ViTBaseModel(TransformerModel):
    pass


@register_model_runner(
    "google/vit-large-patch16-224",
    model_type="vit",
    description="Vision Transformer (ViT) large model - 304M params, 224x224",
    link="https://huggingface.co/google/vit-large-patch16-224",
)
class ViTLargeModel(TransformerModel):
    pass


@register_model_runner(
    "google/vit-large-patch16-384",
    model_type="vit",
    description=(
        "Vision Transformer (ViT) large model - 304M params, 384x384 (high res)"
    ),
    link="https://huggingface.co/google/vit-large-patch16-384",
)
class ViTLarge384Model(TransformerModel):
    pass


# @register_model_runner(
#     "google/vit-huge-patch14-224-in21k",
#     description="Vision Transformer (ViT) huge model - 632M params, "
#     "trained on ImageNet-21k",
#     link="https://huggingface.co/google/vit-huge-patch14-224-in21k",
# )
class ViTHugeModel(TransformerModel):
    pass


@register_model_runner(
    "microsoft/swin-large-patch4-window7-224",
    model_type="vit",
    description="Swin Transformer large - 197M params, 224x224",
    link="https://huggingface.co/microsoft/swin-large-patch4-window7-224",
)
class SwinLargeModel(TransformerModel):
    pass
