import logging

from fastapi import APIRouter, HTTPException, Depends
from celery.result import AsyncResult
from celery.exceptions import TimeoutError as CeleryTimeoutError

from .models import InferenceRequest, InferenceResponse
from .registry import MODEL_METADATA
from .tasks import run_inference_task
from ..utils.auth import get_tapis_user, TapisUser

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/inference", tags=["inference"], dependencies=[Depends(get_tapis_user)]
)


@router.post("/jobs")
def submit_async_inference(
    request: InferenceRequest, user: TapisUser = Depends(get_tapis_user)
):
    """Enqueue an async inference job."""
    logger.info(
        "Async inference request: user=%s model=%s files=%d",
        user.username,
        request.model,
        len(request.files),
    )

    task = run_inference_task.delay(
        [f.model_dump() for f in request.files],
        user.model_dump(),
        request.model,
        labels=request.labels,
        sensitivity=request.sensitivity,
    )

    return {"task_id": task.id, "status": "PENDING"}


@router.get("/models", summary="List available models")
def list_models():
    return list(MODEL_METADATA.values())


@router.get("/jobs/{job_id}")
def get_inference_result(job_id: str):
    """Get job status and result."""
    # TODO: Persist results to DB for durability and to enforce user-scoped
    #  access (verify requesting user owns this job). Currently relying on
    #  Redis and its 24 hr default storage with no kind of access control.
    result = AsyncResult(job_id)

    response = {"task_id": job_id, "status": result.state}

    if result.state == "SUCCESS":
        response["result"] = result.result
    elif result.state == "FAILURE":
        response["error"] = str(result.result)

    return response


@router.post(
    "/jobs/sync",
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
    """Sync endpoint — use Celery but blocks until done.

    TODO consider dropping or making a sync=true param in /jobs/"""
    logger.info(
        "Sync inference request: user=%s model=%s files=%d",
        user.username,
        request.model,
        len(request.files),
    )

    if len(request.files) > 5:
        raise HTTPException(400, detail="Too many files. Use async endpoint for >5.")

    try:
        result = run_inference_task.delay(
            [f.model_dump() for f in request.files],
            user.model_dump(),
            request.model,
            labels=request.labels,
            sensitivity=request.sensitivity,
        ).get(timeout=120)

        logger.info(
            "Sync inference complete: user=%s model=%s", user.username, request.model
        )
        return result
    except CeleryTimeoutError:
        raise HTTPException(504, detail="Inference timed out")
    except ValueError as e:
        raise HTTPException(400, detail=str(e))
    except Exception:
        logger.exception("Unexpected error during inference: user=%s", user.username)
        raise HTTPException(500, detail="Internal inference error")
