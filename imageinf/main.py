import logging
import os

from fastapi import FastAPI

from imageinf.status.routes import router as status_router
from imageinf.inference.routes import router as inference_router

log_level = os.getenv("LOG_LEVEL", "INFO").upper()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logging.getLogger("imageinf").setLevel(getattr(logging, log_level))

app = FastAPI(
    title="imageInf API",
    description="A simple image inference API",
    version="0.1.0",
    root_path="/api",
)

app.include_router(status_router)
app.include_router(inference_router)
