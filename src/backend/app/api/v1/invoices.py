"""Invoice endpoints -- create, list, mark paid, auto-generate from appointment."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.appointment import Appointment
from app.models.business import Business
from app.models.client import Client
from app.models.invoice import Invoice
from app.models.service import Service
from app.models.user import User
from app.schemas.invoice import InvoiceCreate, InvoiceFromAppointment, InvoiceResponse

router = APIRouter()


async def _get_owned_business(business_id: int, user: User, db: AsyncSession) -> Business:
    result = await db.execute(
        select(Business).where(Business.id == business_id, Business.owner_id == user.id)
    )
    biz = result.scalar_one_or_none()
    if not biz:
        raise HTTPException(status_code=404, detail="Afacere negasita")
    return biz


@router.get("/", response_model=list[InvoiceResponse])
async def list_invoices(
    business_id: int,
    status: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_business(business_id, user, db)
    query = select(Invoice).where(Invoice.business_id == business_id)
    if status:
        query = query.where(Invoice.status == status)
    query = query.order_by(Invoice.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=InvoiceResponse, status_code=201)
async def create_invoice(
    business_id: int,
    body: InvoiceCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    biz = await _get_owned_business(business_id, user, db)

    # Auto-increment invoice number
    last = await db.execute(
        select(func.max(Invoice.number)).where(Invoice.business_id == business_id)
    )
    next_number = (last.scalar() or 0) + 1

    # Calculate totals
    subtotal = 0.0
    vat_total = 0.0
    items = []
    for item in body.line_items:
        item_total = item.quantity * item.unit_price
        item_vat = item_total * item.vat_rate / 100
        subtotal += item_total
        vat_total += item_vat
        items.append({
            "description": item.description,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "vat_rate": item.vat_rate,
            "total": round(item_total + item_vat, 2),
        })

    inv = Invoice(
        business_id=business_id,
        client_id=body.client_id,
        series="BCR",
        number=next_number,
        invoice_date=body.invoice_date or datetime.now(timezone.utc),
        due_date=body.due_date,
        buyer_name=body.buyer_name,
        buyer_cui=body.buyer_cui,
        buyer_address=body.buyer_address,
        buyer_reg_com=body.buyer_reg_com,
        buyer_email=body.buyer_email,
        buyer_phone=body.buyer_phone,
        buyer_is_company=body.buyer_is_company,
        subtotal=round(subtotal, 2),
        vat_amount=round(vat_total, 2),
        total=round(subtotal + vat_total, 2),
        currency=biz.currency,
        line_items=items,
        notes=body.notes,
        status="issued",
    )
    db.add(inv)
    await db.flush()
    return inv


@router.post("/from-appointment", response_model=InvoiceResponse, status_code=201)
async def create_invoice_from_appointment(
    business_id: int,
    body: InvoiceFromAppointment,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Auto-generate invoice from a completed appointment."""
    biz = await _get_owned_business(business_id, user, db)

    apt_result = await db.execute(
        select(Appointment).where(
            Appointment.id == body.appointment_id,
            Appointment.business_id == business_id,
        )
    )
    apt = apt_result.scalar_one_or_none()
    if not apt:
        raise HTTPException(status_code=404, detail="Programare negasita")

    # Get client info for buyer details
    buyer_name = body.buyer_name
    buyer_email = None
    buyer_phone = None
    if apt.client_id:
        client = await db.get(Client, apt.client_id)
        if client:
            buyer_name = buyer_name or client.full_name
            buyer_email = client.email
            buyer_phone = client.phone
    elif apt.walk_in_name:
        buyer_name = buyer_name or apt.walk_in_name
        buyer_phone = apt.walk_in_phone

    if not buyer_name:
        raise HTTPException(status_code=400, detail="Numele cumparatorului este obligatoriu")

    # Get service name for line item description
    service_description = "Serviciu"
    if apt.service_id:
        svc = await db.get(Service, apt.service_id)
        if svc:
            service_description = svc.name

    # Auto-increment invoice number
    last = await db.execute(
        select(func.max(Invoice.number)).where(Invoice.business_id == business_id)
    )
    next_number = (last.scalar() or 0) + 1

    subtotal = apt.price
    vat_amount = round(subtotal * apt.vat_rate / 100, 2)
    total = round(subtotal + vat_amount, 2)

    items = [{
        "description": service_description,
        "quantity": 1,
        "unit_price": apt.price,
        "vat_rate": apt.vat_rate,
        "unit_measure": "buc",
        "total": total,
    }]

    inv = Invoice(
        business_id=business_id,
        client_id=apt.client_id,
        series=biz.cui[:3].upper() if biz.cui else "BCR",
        number=next_number,
        invoice_date=datetime.now(timezone.utc),
        buyer_name=buyer_name,
        buyer_cui=body.buyer_cui,
        buyer_address=body.buyer_address,
        buyer_reg_com=body.buyer_reg_com,
        buyer_email=buyer_email,
        buyer_phone=buyer_phone,
        buyer_is_company=body.buyer_is_company,
        subtotal=round(subtotal, 2),
        vat_amount=vat_amount,
        total=total,
        currency=biz.currency,
        line_items=items,
        notes=body.notes,
        status="issued",
    )
    db.add(inv)
    await db.flush()

    # Link invoice to appointment
    apt.invoice_id = inv.id
    await db.flush()

    return inv


@router.post("/{invoice_id}/mark-paid")
async def mark_paid(
    business_id: int,
    invoice_id: int,
    payment_method: str = Query("cash"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_business(business_id, user, db)
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id, Invoice.business_id == business_id)
    )
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Factura negasita")

    inv.payment_status = "paid"
    inv.paid_amount = inv.total
    inv.paid_at = datetime.now(timezone.utc)
    await db.flush()
    return {"status": "paid"}
