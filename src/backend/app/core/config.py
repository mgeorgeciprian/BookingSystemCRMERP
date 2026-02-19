"""Application configuration via environment variables."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "BookingCRM"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"  # development | staging | production

    # Database (Cloud SQL PostgreSQL)
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/bookingcrm"
    CLOUD_SQL_CONNECTION_NAME: str = ""  # project:region:instance
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10

    # Redis (Cloud Memorystore)
    REDIS_URL: str = "redis://localhost:6379/0"

    # Auth
    SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Infobip (SMS / Viber / WhatsApp / Email)
    INFOBIP_BASE_URL: str = ""
    INFOBIP_API_KEY: str = ""
    INFOBIP_SENDER: str = "BookingCRM"
    INFOBIP_EMAIL_SENDER: str = "noreply@bookingcrm.ro"  # Infobip email sender address
    NOTIFICATION_STRATEGY: str = "viber,whatsapp,sms"  # fallback order

    # e-Factura / ANAF
    ANAF_OAUTH_CLIENT_ID: str = ""
    ANAF_OAUTH_CLIENT_SECRET: str = ""
    ANAF_OAUTH_REDIRECT_URI: str = ""
    ANAF_API_BASE_URL: str = "https://api.anaf.ro"

    # Google Cloud Storage
    GCS_BUCKET: str = ""
    GCS_PROJECT_ID: str = ""

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:3001", "http://localhost:5025"]

    # iCal sync interval (minutes)
    ICAL_SYNC_INTERVAL: int = 15

    # Timezone
    DEFAULT_TIMEZONE: str = "Europe/Bucharest"

    model_config = {"env_file": ".env", "case_sensitive": True}


@lru_cache
def get_settings() -> Settings:
    return Settings()
