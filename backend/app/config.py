"""Application configuration."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings from environment variables."""

    app_name: str = "SmartMoney"
    debug: bool = True

    # Database
    database_url: str = "sqlite:///./smartmoney.db"

    # CORS
    allowed_origins: list[str] = ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"]

    class Config:
        env_file = ".env"


settings = Settings()
