from fastapi import APIRouter

router = APIRouter(
    prefix="/status",
    tags=["Status"],
)


@router.get(
    "", summary="Check service status", description="Returns 200 OK if the API is up."
)
def get_status():
    return {"status": "ok"}
