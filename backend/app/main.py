# app/main.py
import logging
import warnings
warnings.filterwarnings("ignore", category=UserWarning, module="google.protobuf")
logging.getLogger("uvicorn").setLevel(logging.WARNING)
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.services.vector_service import init_vector_service, close_vector_service
from app.api.endpoints import documents



@asynccontextmanager
async def lifespan(_app: FastAPI):
    # On startup
    init_vector_service()
    yield
    # On shutdown
    close_vector_service()

app = FastAPI(
    title="EduSage API",
    description="API for ingesting documents and powering the EduSage assistant.",
    lifespan=lifespan
)

# Include the API router
app.include_router(documents.router, prefix="/api/v1", tags=["documents"])