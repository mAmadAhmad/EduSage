# app/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):

    GOOGLE_API_KEY : str
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    WEAVIATE_COLLECTION: str = "EduSageChunk"
    TEXT_CHUNK_SIZE: int = 1500
    TEXT_CHUNK_OVERLAP: int = 200

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", env_file_encoding="utf-8")

settings = Settings()