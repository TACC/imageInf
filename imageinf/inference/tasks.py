import logging
from imageinf.celery_app import celery

logger = logging.getLogger(__name__)


@celery.task(bind=True)
def run_inference_task(
    self,
    files: list[dict],
    user_data: dict,
    model: str,
    labels: list[str] | None = None,
    sensitivity: float | None = None,
):
    logger.info(
        "Task %s: Starting inference model=%s files=%d",
        self.request.id,
        model,
        len(files),
    )

    from imageinf.inference.processor import run_model_on_tapis_images
    from imageinf.inference.models import TapisFile
    from imageinf.utils.auth import TapisUser

    user = TapisUser(**user_data)
    tapis_files = [TapisFile(**f) for f in files]

    result = run_model_on_tapis_images(
        tapis_files, user, model, labels=labels, sensitivity=sensitivity
    )

    logger.info("Task %s: Complete", self.request.id)
    return result.model_dump()
