import os
from pydantic_settings import BaseSettings, SettingsConfigDict
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
    NEMOTRON_SYNTHESIS_MODEL: str = os.getenv("NEMOTRON_SYNTHESIS_MODEL", "nvidia/llama-3.1-nemotron-70b-instruct")
    NEMOTRON_VERIFIER_MODEL: str = os.getenv("NEMOTRON_VERIFIER_MODEL", "nvidia/nemotron-mini-4b-instruct")

    # Feature flags from Methodology
    LLM_POLICY_ASSISTANT_ENABLED: bool = True
    ATTACK_MEMORY_ENABLED: bool = True
    TRANSFORMER_DETECTOR_ENABLED: bool = False
    LLM_RISK_JUDGE_ENABLED: bool = True
    GUARDED_TOOL_MODE: str = "simulated"
    DEMO_MODE: bool = True
    AUDIT_REDACTION_ENABLED: bool = True

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

    model_config = SettingsConfigDict(env_file=".env", extra="allow")


settings = Settings()
