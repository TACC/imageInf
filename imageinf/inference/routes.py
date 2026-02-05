import logging

from fastapi import APIRouter, HTTPException, Depends
from .models import InferenceRequest, InferenceResponse
from .processor import run_model_on_tapis_images
from .registry import MODEL_METADATA
from ..utils.auth import get_tapis_user, TapisUser

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/inference", tags=["inference"], dependencies=[Depends(get_tapis_user)]
)  # validates Tapis JWT


@router.post("")
def submit_async_inference():
    # TODO: Accept request payload, validate, enqueue async task
    raise HTTPException(status_code=501, detail="Async inference not implemented yet")


@router.get("/models", summary="List available models")
def list_models():
    return list(MODEL_METADATA.values())


@router.get("/{job_id}")
def get_inference_result(job_id: str):
    # TODO: Look up job status + result from DB or task
    raise HTTPException(status_code=501, detail="Job status lookup not implemented yet")


@router.post(
    "/sync",
    summary="Run synchronous inference",
    description="""
This endpoint is designed for quick, small jobs that can be processed immediately.
Recommended for ≤ 5 image files. For larger workloads, use the asynchronous
`/inference` endpoint.
""",
    response_model=InferenceResponse,
)
def run_sync_inference(
    request: InferenceRequest, user: TapisUser = Depends(get_tapis_user)
):
    logger.info(
        "Sync inference request: user=%s model=%s files=%d",
        user.username,
        request.model,
        len(request.files),
    )

    if len(request.files) > 5:
        raise HTTPException(400, detail="Too many files. Use async endpoint for >5.")

    try:
        result = run_model_on_tapis_images(
            request.files,
            user,
            request.model,
            labels=request.labels,
            sensitivity=request.sensitivity,
        )
        logger.info("Sync inference complete: user=%s model=%s", user.username, request.model)
        return result
    except ValueError as e:
        logger.warning("Inference ValueError: user=%s error=%s", user.username, e)
        raise HTTPException(400, detail=str(e))
    except Exception as e:
        logger.exception("Unexpected error during inference: user=%s", user.username)
        raise HTTPException(500, detail="Internal inference error")