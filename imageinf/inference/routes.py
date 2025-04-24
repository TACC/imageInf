from fastapi import APIRouter, Header, HTTPException, Depends
from .models import InferenceRequest, InferenceResponse
from .processor import run_vit_on_tapis_images
from ..utils.auth import get_tapis_user, TapisUser


router = APIRouter(
    prefix="/inference", tags=["inference"], dependencies=[Depends(get_tapis_user)]
)  # validates Tapis JWT


@router.post("")
def submit_async_inference():
    # TODO: Accept request payload, validate, enqueue async task
    raise HTTPException(status_code=501, detail="Async inference not implemented yet")


@router.get("/{job_id}")
def get_inference_result(job_id: str):
    # TODO: Look up job status + result from DB or task
    raise HTTPException(status_code=501, detail="Job status lookup not implemented yet")


@router.post(
    "/sync",
    summary="Run synchronous inference",
    description="""
This endpoint is designed for quick, small jobs that can be processed immediately.
Recommended for ≤ 5 image files. For larger workloads, use the asynchronous `/inference` endpoint.
""",
    response_model=InferenceResponse,
)
def run_sync_inference(
    request: InferenceRequest, user: TapisUser = Depends(get_tapis_user)
):
    if len(request.files) > 5:
        raise HTTPException(400, detail="Too many files. Use async endpoint for >5.")

    return run_vit_on_tapis_images(request.files, user.tapis_token)
