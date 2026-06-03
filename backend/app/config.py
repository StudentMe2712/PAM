from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, loaded from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+asyncpg://pam:pam@localhost:5432/pam"
    CORS_ORIGINS: str = "chrome-extension://*,http://localhost:3000"
    LOG_LEVEL: str = "INFO"

    # Phase 2 — local embeddings via Ollama
    OLLAMA_URL: str = "http://localhost:11434"
    EMBED_MODEL: str = "nomic-embed-text"

    # Phase 4 — chat LLM (provider-agnostic). "groq" (cloud, free) | "ollama" (local).
    LLM_PROVIDER: str = "groq"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    OLLAMA_CHAT_MODEL: str = "llama3.2:3b"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
