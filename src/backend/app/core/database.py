"""Async database engine and session factory for Cloud SQL PostgreSQL."""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()


def _build_engine():
    """Build async engine. Uses Cloud SQL connector in production."""
    if settings.CLOUD_SQL_CONNECTION_NAME:
        from google.cloud.sql.connector import Connector
        import asyncpg

        connector = Connector()

        async def getconn():
            return await connector.connect_async(
                settings.CLOUD_SQL_CONNECTION_NAME,
                "asyncpg",
                user=settings.DATABASE_URL.split("://")[1].split(":")[0],
                password=settings.DATABASE_URL.split(":")[2].split("@")[0],
                db=settings.DATABASE_URL.split("/")[-1],
            )

        return create_async_engine(
            "postgresql+asyncpg://",
            async_creator=getconn,
            pool_size=settings.DB_POOL_SIZE,
            max_overflow=settings.DB_MAX_OVERFLOW,
            echo=settings.DEBUG,
        )
    else:
        return create_async_engine(
            settings.DATABASE_URL,
            pool_size=settings.DB_POOL_SIZE,
            max_overflow=settings.DB_MAX_OVERFLOW,
            echo=settings.DEBUG,
        )


engine = _build_engine()

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    """FastAPI dependency for database sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
