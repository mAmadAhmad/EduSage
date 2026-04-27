from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE_PATH = BASE_DIR / ".env"

class Settings(BaseSettings):

    GOOGLE_API_KEY : str
    GROQ_API_KEY : str
    EMBEDDING_MODEL: str = "BAAI/bge-base-en-v1.5"
    WEAVIATE_COLLECTION: str = "EduSageChunk"
    TEXT_CHUNK_SIZE: int = 1024
    TEXT_CHUNK_OVERLAP: int = 100
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    model_config = SettingsConfigDict(case_sensitive=True, env_file=str(ENV_FILE_PATH), env_file_encoding="utf-8", extra='ignore')

settings = Settings()