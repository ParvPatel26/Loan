from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5433/loan_origination"
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    # Dev-only key. Generate your own with:
    #   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    # and set FERNET_KEY in .env for anything beyond local dev.
    fernet_key: str = "oQnhLA65tI_WbXmC9ktjprWzawU5zrO1eVVRRxPjFvU="
    # Shared secret for server-to-server callers (e.g. the chat-agent backend
    # reading the product catalog, or posting a completed application back).
    # Dev-only default — set SERVICE_API_KEY in .env for anything beyond local dev.
    service_api_key: str = "dev-service-key-change-me"


settings = Settings()
