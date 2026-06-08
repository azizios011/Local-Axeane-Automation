from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    # OpenRouter
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_model: str = "google/gemini-2.0-flash-001"  # fast + good at tables

    # Playwright CDP
    cdp_port: int = 9222
    cdp_host: str = "localhost"

    # PWA page URL pattern to identify Saisie des écritures tab
    pwa_saisie_url_pattern: str = "saisie"

    # Storage
    formulas_file: Path = Path("data/formulas.json")

    # PDF extraction prompt tweak
    extraction_language: str = "fr"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
