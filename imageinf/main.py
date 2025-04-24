from fastapi import FastAPI
from imageinf import status_routes

app = FastAPI(
    title="imageInf API",
    description="A simple image inference API",
    version="0.1.0",
)
app.include_router(status_routes.router)
