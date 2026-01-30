from typing import List, Optional
from tapipy.tapis import Tapis
from imageinf.utils.auth import TapisUser

from imageinf.utils.io import get_image_file

from .config import DEFAULT_MODEL_NAME
from .registry import MODEL_REGISTRY, MODEL_METADATA
from .categories import aggregate_predictions
from .models import TapisFile, InferenceResult, InferenceResponse

# Ensure models are registered
from . import vit_models  # noqa: F401
from . import clip_models  # noqa: F401


# Public interface: plugin dispatch
def run_model_on_tapis_images(
    files: List[TapisFile],
    user: TapisUser,
    model_name: str = DEFAULT_MODEL_NAME,
    labels: Optional[List[str]] = None,  # only for CLIP
    sensitivity: str = "medium",  # only for CLIP
) -> InferenceResponse:
    if model_name not in MODEL_REGISTRY:
        raise ValueError(f"Model '{model_name}' is not supported.")

    model_meta = MODEL_METADATA[model_name]
    ModelClass = MODEL_REGISTRY[model_name]

    if model_meta["type"] == "clip":
        # pass labels for CLIP
        model = ModelClass(model_name, labels=labels)
    else:
        model = ModelClass(model_name)

    tapis = Tapis(base_url=user.tenant_host, access_token=user.tapis_token)

    results = []
    aggregated_results = []

    for file in files:
        try:
            image, metadata = get_image_file(tapis, file.systemId, file.path)

            if model_meta["type"] == "clip":
                predictions = model.classify_image(image, sensitivity=sensitivity)
            else:
                predictions = model.classify_image(image)

            # Always create detailed results
            results.append(
                InferenceResult(
                    systemId=file.systemId,
                    path=file.path,
                    predictions=predictions,
                    metadata=metadata,
                )
            )

            if model_meta["type"] == "clip":
                # For CLIP, just copy the results since it's already aggregated
                aggregated_results.append(
                    InferenceResult(
                        systemId=file.systemId, path=file.path, predictions=predictions
                    )
                )
            else:
                aggregated = aggregate_predictions(predictions)
                aggregated_results.append(
                    InferenceResult(
                        systemId=file.systemId, path=file.path, predictions=aggregated
                    )
                )

        except Exception as e:
            raise RuntimeError(f"Failed to process {file.path}: {str(e)}")

    return InferenceResponse(
        model=model_name, aggregated_results=aggregated_results, results=results
    )
