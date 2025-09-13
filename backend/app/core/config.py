# app/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):

    GOOGLE_API_KEY : str
    EMBEDDING_MODEL: str = "BAAI/bge-base-en-v1.5"
    WEAVIATE_COLLECTION: str = "EduSageChunk"
    TEXT_CHUNK_SIZE: int = 1024
    TEXT_CHUNK_OVERLAP: int = 100

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", env_file_encoding="utf-8")

settings = Settings()