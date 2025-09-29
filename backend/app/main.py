# app/main.py
import logging
import warnings
warnings.filterwarnings("ignore", category=UserWarning, module="google.protobuf")
logging.getLogger("uvicorn").setLevel(logging.WARNING)
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.services.vector_service import init_vector_service, close_vector_service
from app.api.endpoints import documents, quizzes, student, submissions, content
from app.db import session
from app.models import quiz_models
from fastapi.middleware.cors import CORSMiddleware



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

# Add this block to allow CORS requests from your Next.js frontend
origins = [
    "http://localhost:3000",
    "http://10.8.24.199:3000",
    "http://localhost:8000" # Add this line to allow your local host to access the server
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the API router
app.include_router(documents.router, prefix="/api/v1/docs", tags=["Document and RAQ Ops"])
app.include_router(quizzes.router, prefix="/api/v1/quizzes", tags=["Quiz Management"])
app.include_router(student.router, prefix="/api/v1/take-quiz", tags=["Student Quiz Access"])
app.include_router(submissions.router, prefix="/api/v1/submissions", tags=["Submission Management"])
app.include_router(content.router, prefix="/api/v1/content", tags=["Lesson Plan Management"])