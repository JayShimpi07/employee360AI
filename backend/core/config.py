import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "Employee360 AI"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:5173"
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]

    # Security
    SECRET_KEY: str = "dev_secret_key_employee360_replace_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440 # 24 hours
    CANDIDATE_TOKEN_EXPIRE_HOURS: int = 72 # 3 days

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./employee360.db"

    # AI Model Providers
    LLM_PROVIDER: str = "gemini" # "mock", "gemini", "ollama", "openai"
    GEMINI_API_KEY: str = ""
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3:8b"

    # Audio & Vision
    STT_PROVIDER: str = "faster-whisper"
    WHISPER_MODEL_SIZE: str = "base.en"
    WHISPER_DEVICE: str = "cpu"
    TTS_PROVIDER: str = "edge-tts"
    TTS_VOICE: str = "en-US-GuyNeural"

    # Storage Paths
    MEDIA_STORAGE_PATH: str = "./storage/media"
    SNAPSHOT_STORAGE_PATH: str = "./storage/snapshots"
    TRANSCRIPT_STORAGE_PATH: str = "./storage/transcripts"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Ensure local storage directories exist
os.makedirs(settings.MEDIA_STORAGE_PATH, exist_ok=True)
os.makedirs(settings.SNAPSHOT_STORAGE_PATH, exist_ok=True)
os.makedirs(settings.TRANSCRIPT_STORAGE_PATH, exist_ok=True)
