# app/main.py
import logging
import warnings
warnings.filterwarnings("ignore", category=UserWarning, module="google.protobuf")
logging.getLogger("uvicorn").setLevel(logging.WARNING)
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.services.vector_service import init_vector_service, close_vector_service
from app.api.endpoints import documents, quizzes
from app.db import session
from app.models import quiz_models



@asynccontextmanager
async def lifespan(_app: FastAPI):
    # On startup
    print("Creating database tables...")
    quiz_models.Base.metadata.create_all(bind=session.engine)
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
app.include_router(documents.router, prefix="/api/v1/docs", tags=["documents"])
app.include_router(quizzes.router, prefix="/api/v1/quizzes", tags=["Quiz Management"])