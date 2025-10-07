# app/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):

    GOOGLE_API_KEY : str
    EMBEDDING_MODEL: str = "BAAI/bge-base-en-v1.5"
    WEAVIATE_COLLECTION: str = "EduSageChunk"
    TEXT_CHUNK_SIZE: int = 1024
    TEXT_CHUNK_OVERLAP: int = 100

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", env_file_encoding="utf-8")

    # Generate a secret key with: openssl rand -hex 32
    SECRET_KEY: str = "8758d8240360190d9cecae4af7c20805708c33466f8b79f894f37da8f42440ef"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

settings = Settings()