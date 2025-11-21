"""Application configuration."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings from environment variables."""

    app_name: str = "SmartMoney"
    debug: bool = True

    # Database
    database_url: str = "sqlite:///./smartmoney.db"

    # CORS
    allowed_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "https://money.khanh.page",
    ]

    # JWT Configuration
    secret_key: str = "smartmoney-dev-secret-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    class Config:
        env_file = ".env"


settings = Settings()
