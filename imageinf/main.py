from fastapi import FastAPI
from imageinf.status.routes import router as status_router
from imageinf.inference.routes import router as inference_router

app = FastAPI(
    title="imageInf API",
    description="A simple image inference API",
    version="0.1.0",
)

app.include_router(status_router)
app.include_router(inference_router)
