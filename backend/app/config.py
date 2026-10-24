import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "ContractGuard Backend"
    VERSION: str = "2.0.0"
    
    # Database Settings: PostgreSQL (hackathon database) with SQLite fallback
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:hackathon@localhost:5432/hackathon"
    )
    
    # Nebius Token Factory Cloud Settings
    NEBIUS_BASE_URL: str = os.getenv("NEBIUS_BASE_URL", "https://api.tokenfactory.nebius.ai/v1")
    DEFAULT_NEBIUS_API_KEY: str = os.getenv("NEBIUS_API_KEY", "")
    NEMOTRON_SYNTHESIS_MODEL: str = "nvidia/llama-3.1-nemotron-70b-instruct"
    NEMOTRON_VERIFIER_MODEL: str = "nvidia/nemotron-mini-4b-instruct"
    
    # CORS Origins for Next.js Frontend
    CORS_ORIGINS: List[str] = [
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "*"
    ]
    
    # Upload limits
    MAX_UPLOAD_SIZE_MB: int = 25

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
