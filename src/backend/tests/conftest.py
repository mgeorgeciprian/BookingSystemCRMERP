"""Test configuration and fixtures for BookingCRM backend."""

import asyncio
import os
from datetime import datetime, timezone

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.core.security import create_access_token, hash_password
from app.main import app

# Use a separate test database
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://bookingcrm:bookingcrm@localhost:5432/bookingcrm_test",
)

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for the test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_database():
    """Create all tables before tests, drop after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()


@pytest_asyncio.fixture
async def db_session():
    """Provide a transactional database session that rolls back after each test."""
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession):
    """HTTP test client with database session override."""

    async def override_get_db():
        try:
            yield db_session
            await db_session.commit()
        except Exception:
            await db_session.rollback()
            raise

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession):
    """Create a test user and return user data with auth token."""
    from app.models.user import User

    hashed_pw = hash_password("TestPass123!")
    user = User(
        email="test@salonelegance.ro",
        hashed_password=hashed_pw,
        full_name="Test User",
        phone="+40721000000",
    )
    db_session.add(user)
    await db_session.flush()

    token = create_access_token({"sub": str(user.id)})

    return {
        "user": user,
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"},
    }


@pytest_asyncio.fixture
async def test_business(db_session: AsyncSession, test_user):
    """Create a test business owned by the test user."""
    from app.models.business import Business

    biz = Business(
        owner_id=test_user["user"].id,
        name="Test Salon",
        slug="test-salon",
        vertical="salon",
        cui="RO12345678",
        address="Str. Test 1",
        city="Bucuresti",
        county="Bucuresti",
        phone="+40721111111",
        email="salon@test.ro",
        timezone="Europe/Bucharest",
        currency="RON",
        booking_buffer_minutes=10,
        cancellation_policy_hours=24,
        auto_confirm_bookings=True,
        is_active=True,
    )
    db_session.add(biz)
    await db_session.flush()

    return biz


@pytest_asyncio.fixture
async def test_service(db_session: AsyncSession, test_business):
    """Create a test service."""
    from app.models.service import Service

    svc = Service(
        business_id=test_business.id,
        name="Tuns dama",
        duration_minutes=45,
        buffer_after_minutes=10,
        price=80.0,
        currency="RON",
        vat_rate=19,
        is_active=True,
        is_public=True,
        sort_order=0,
    )
    db_session.add(svc)
    await db_session.flush()

    return svc


@pytest_asyncio.fixture
async def test_employee(db_session: AsyncSession, test_business):
    """Create a test employee."""
    from app.models.employee import Employee

    emp = Employee(
        business_id=test_business.id,
        full_name="Ana Popescu",
        display_name="Ana P.",
        phone="+40722111222",
        email="ana@test.ro",
        role="specialist",
        color="#8b5cf6",
        is_active=True,
        sort_order=0,
        weekly_schedule={
            "mon": [{"start": "09:00", "end": "18:00"}],
            "tue": [{"start": "09:00", "end": "18:00"}],
            "wed": [{"start": "09:00", "end": "18:00"}],
            "thu": [{"start": "09:00", "end": "18:00"}],
            "fri": [{"start": "09:00", "end": "18:00"}],
            "sat": [{"start": "10:00", "end": "15:00"}],
            "sun": [],
        },
    )
    db_session.add(emp)
    await db_session.flush()

    return emp


@pytest_asyncio.fixture
async def test_client_record(db_session: AsyncSession, test_business):
    """Create a test client."""
    from app.models.client import Client

    cl = Client(
        business_id=test_business.id,
        full_name="Ioana Marinescu",
        phone="+40723111222",
        email="ioana@gmail.com",
        source="online_booking",
        gdpr_consent=True,
        gdpr_consent_date=datetime.now(timezone.utc),
    )
    db_session.add(cl)
    await db_session.flush()

    return cl
