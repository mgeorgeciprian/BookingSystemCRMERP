"""Tests for public booking endpoints -- no auth required."""

import pytest
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_public_profile(client: AsyncClient, test_business):
    """Test public business profile by slug."""
    response = await client.get(f"/api/v1/book/{test_business.slug}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Salon"
    assert data["slug"] == "test-salon"


@pytest.mark.asyncio
async def test_public_profile_not_found(client: AsyncClient):
    """Test 404 for non-existent slug."""
    response = await client.get("/api/v1/book/non-existent-slug")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_public_services(client: AsyncClient, test_business, test_service):
    """Test public services list."""
    response = await client.get(f"/api/v1/book/{test_business.slug}/services")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["name"] == "Tuns dama"


@pytest.mark.asyncio
async def test_public_employees(client: AsyncClient, test_business, test_employee):
    """Test public employees list."""
    response = await client.get(f"/api/v1/book/{test_business.slug}/employees")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["full_name"] == "Ana Popescu"


@pytest.mark.asyncio
async def test_public_availability(client: AsyncClient, test_business, test_service, test_employee):
    """Test public availability endpoint."""
    tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
    date_str = tomorrow.strftime("%Y-%m-%d")

    if tomorrow.weekday() == 6:
        pytest.skip("Employee doesn't work on Sunday")

    response = await client.get(
        f"/api/v1/book/{test_business.slug}/availability",
        params={
            "employee_id": test_employee.id,
            "service_id": test_service.id,
            "date": date_str,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "slots" in data


@pytest.mark.asyncio
async def test_public_book(client: AsyncClient, test_business, test_service, test_employee):
    """Test public booking flow."""
    tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
    start_time = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)

    if tomorrow.weekday() == 6:
        pytest.skip("Employee doesn't work on Sunday")

    response = await client.post(
        f"/api/v1/book/{test_business.slug}/book",
        json={
            "service_id": test_service.id,
            "employee_id": test_employee.id,
            "start_time": start_time.isoformat(),
            "client_name": "Test Client",
            "client_phone": "+40723999888",
            "client_email": "test.client@gmail.com",
            "gdpr_consent": True,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert "appointment_id" in data
    assert data["status"] in ["confirmed", "pending"]


@pytest.mark.asyncio
async def test_public_book_without_gdpr(client: AsyncClient, test_business, test_service, test_employee):
    """Test that booking without GDPR consent fails."""
    tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
    start_time = tomorrow.replace(hour=12, minute=0, second=0, microsecond=0)

    response = await client.post(
        f"/api/v1/book/{test_business.slug}/book",
        json={
            "service_id": test_service.id,
            "employee_id": test_employee.id,
            "start_time": start_time.isoformat(),
            "client_name": "No GDPR Client",
            "client_phone": "+40723888777",
            "gdpr_consent": False,
        },
    )
    assert response.status_code == 400
