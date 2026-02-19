"""Tests for appointment endpoints -- CRUD, availability, status transitions, conflicts."""

import pytest
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_appointment(client: AsyncClient, test_user, test_business, test_service, test_employee, test_client_record):
    """Test creating an appointment."""
    tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
    start_time = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)

    response = await client.post(
        f"/api/v1/businesses/{test_business.id}/appointments/",
        headers=test_user["headers"],
        json={
            "employee_id": test_employee.id,
            "service_id": test_service.id,
            "client_id": test_client_record.id,
            "start_time": start_time.isoformat(),
            "source": "manual",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["employee_id"] == test_employee.id
    assert data["service_id"] == test_service.id
    assert data["status"] in ["pending", "confirmed"]
    assert data["price"] == 80.0


@pytest.mark.asyncio
async def test_appointment_conflict_detection(client: AsyncClient, test_user, test_business, test_service, test_employee, test_client_record):
    """Test that overlapping appointments are rejected."""
    tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
    start_time = tomorrow.replace(hour=14, minute=0, second=0, microsecond=0)

    # Create first appointment
    response1 = await client.post(
        f"/api/v1/businesses/{test_business.id}/appointments/",
        headers=test_user["headers"],
        json={
            "employee_id": test_employee.id,
            "service_id": test_service.id,
            "client_id": test_client_record.id,
            "start_time": start_time.isoformat(),
            "source": "manual",
        },
    )
    assert response1.status_code == 201

    # Try to create overlapping appointment (same employee, same time)
    response2 = await client.post(
        f"/api/v1/businesses/{test_business.id}/appointments/",
        headers=test_user["headers"],
        json={
            "employee_id": test_employee.id,
            "service_id": test_service.id,
            "client_id": test_client_record.id,
            "start_time": start_time.isoformat(),
            "source": "manual",
        },
    )
    assert response2.status_code == 409


@pytest.mark.asyncio
async def test_availability_endpoint(client: AsyncClient, test_user, test_business, test_service, test_employee):
    """Test availability endpoint returns slots."""
    tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
    date_str = tomorrow.strftime("%Y-%m-%d")

    # Skip if tomorrow is Sunday (employee doesn't work)
    if tomorrow.weekday() == 6:
        pytest.skip("Employee doesn't work on Sunday")

    response = await client.get(
        f"/api/v1/businesses/{test_business.id}/appointments/availability",
        headers=test_user["headers"],
        params={
            "employee_id": test_employee.id,
            "service_id": test_service.id,
            "date": date_str,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "slots" in data
    assert data["employee_id"] == test_employee.id


@pytest.mark.asyncio
async def test_status_transition(client: AsyncClient, test_user, test_business, test_service, test_employee, test_client_record):
    """Test appointment status transitions: pending -> confirmed -> in_progress -> completed."""
    tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
    start_time = tomorrow.replace(hour=11, minute=0, second=0, microsecond=0)

    # Create appointment
    create_response = await client.post(
        f"/api/v1/businesses/{test_business.id}/appointments/",
        headers=test_user["headers"],
        json={
            "employee_id": test_employee.id,
            "service_id": test_service.id,
            "client_id": test_client_record.id,
            "start_time": start_time.isoformat(),
            "source": "manual",
        },
    )
    apt_id = create_response.json()["id"]

    # Transition: pending/confirmed -> confirmed (if auto_confirm was off, otherwise already confirmed)
    status = create_response.json()["status"]
    if status == "pending":
        resp = await client.post(
            f"/api/v1/businesses/{test_business.id}/appointments/{apt_id}/status",
            headers=test_user["headers"],
            params={"new_status": "confirmed"},
        )
        assert resp.status_code == 200

    # Transition: confirmed -> in_progress
    resp = await client.post(
        f"/api/v1/businesses/{test_business.id}/appointments/{apt_id}/status",
        headers=test_user["headers"],
        params={"new_status": "in_progress"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "in_progress"

    # Transition: in_progress -> completed
    resp = await client.post(
        f"/api/v1/businesses/{test_business.id}/appointments/{apt_id}/status",
        headers=test_user["headers"],
        params={"new_status": "completed", "payment_method": "card"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "completed"
    assert resp.json()["payment_status"] == "paid"


@pytest.mark.asyncio
async def test_invalid_status_transition(client: AsyncClient, test_user, test_business, test_service, test_employee, test_client_record):
    """Test that invalid status transitions are rejected."""
    tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
    start_time = tomorrow.replace(hour=15, minute=0, second=0, microsecond=0)

    create_response = await client.post(
        f"/api/v1/businesses/{test_business.id}/appointments/",
        headers=test_user["headers"],
        json={
            "employee_id": test_employee.id,
            "service_id": test_service.id,
            "client_id": test_client_record.id,
            "start_time": start_time.isoformat(),
            "source": "manual",
        },
    )
    apt_id = create_response.json()["id"]

    # Try invalid transition: confirmed -> completed (should go through in_progress first)
    resp = await client.post(
        f"/api/v1/businesses/{test_business.id}/appointments/{apt_id}/status",
        headers=test_user["headers"],
        params={"new_status": "completed"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_cancel_appointment(client: AsyncClient, test_user, test_business, test_service, test_employee, test_client_record):
    """Test cancelling an appointment."""
    tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
    start_time = tomorrow.replace(hour=16, minute=0, second=0, microsecond=0)

    create_response = await client.post(
        f"/api/v1/businesses/{test_business.id}/appointments/",
        headers=test_user["headers"],
        json={
            "employee_id": test_employee.id,
            "service_id": test_service.id,
            "client_id": test_client_record.id,
            "start_time": start_time.isoformat(),
            "source": "manual",
        },
    )
    apt_id = create_response.json()["id"]

    resp = await client.post(
        f"/api/v1/businesses/{test_business.id}/appointments/{apt_id}/cancel",
        headers=test_user["headers"],
        json={"cancelled_by": "employee", "reason": "Test cancel"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "cancelled"
