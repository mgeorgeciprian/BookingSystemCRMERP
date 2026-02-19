"""Tests for invoice endpoints -- CRUD, mark-paid, auto-generate from appointment."""

import pytest
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_invoice(client: AsyncClient, test_user, test_business, test_client_record):
    """Test manual invoice creation."""
    response = await client.post(
        f"/api/v1/businesses/{test_business.id}/invoices/",
        headers=test_user["headers"],
        json={
            "client_id": test_client_record.id,
            "buyer_name": "Ioana Marinescu",
            "buyer_is_company": False,
            "subtotal": 67.23,
            "vat_amount": 12.77,
            "total": 80.0,
            "currency": "RON",
            "line_items": [
                {
                    "description": "Tuns dama",
                    "quantity": 1,
                    "unit_price": 67.23,
                    "vat_rate": 19,
                    "total": 80.0,
                }
            ],
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["buyer_name"] == "Ioana Marinescu"
    assert data["total"] == 80.0
    assert data["status"] == "draft"


@pytest.mark.asyncio
async def test_list_invoices(client: AsyncClient, test_user, test_business):
    """Test listing invoices."""
    response = await client.get(
        f"/api/v1/businesses/{test_business.id}/invoices/",
        headers=test_user["headers"],
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_mark_invoice_paid(client: AsyncClient, test_user, test_business, test_client_record):
    """Test marking an invoice as paid."""
    # Create invoice first
    create_response = await client.post(
        f"/api/v1/businesses/{test_business.id}/invoices/",
        headers=test_user["headers"],
        json={
            "buyer_name": "Test Buyer",
            "buyer_is_company": False,
            "subtotal": 100.0,
            "vat_amount": 19.0,
            "total": 119.0,
            "currency": "RON",
            "line_items": [{"description": "Service", "quantity": 1, "unit_price": 100, "vat_rate": 19, "total": 119}],
        },
    )
    invoice_id = create_response.json()["id"]

    # Mark as paid
    response = await client.post(
        f"/api/v1/businesses/{test_business.id}/invoices/{invoice_id}/mark-paid",
        headers=test_user["headers"],
        json={"payment_method": "card", "amount": 119.0},
    )
    assert response.status_code == 200
    assert response.json()["payment_status"] == "paid"


@pytest.mark.asyncio
async def test_invoice_from_appointment(client: AsyncClient, test_user, test_business, test_service, test_employee, test_client_record):
    """Test auto-generating invoice from a completed appointment."""
    tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
    start_time = tomorrow.replace(hour=9, minute=0, second=0, microsecond=0)

    # Create appointment
    apt_response = await client.post(
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
    apt_id = apt_response.json()["id"]

    # Generate invoice from appointment
    response = await client.post(
        f"/api/v1/businesses/{test_business.id}/invoices/from-appointment",
        headers=test_user["headers"],
        json={"appointment_id": apt_id},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["buyer_name"] == "Ioana Marinescu"
    assert data["total"] > 0
    assert data["status"] == "issued"
