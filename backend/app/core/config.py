# app/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    WEAVIATE_COLLECTION: str = "EduSageChunk"
    TEXT_CHUNK_SIZE: int = 1000
    TEXT_CHUNK_OVERLAP: int = 150

    model_config = SettingsConfigDict(case_sensitive=True)

settings = Settings()