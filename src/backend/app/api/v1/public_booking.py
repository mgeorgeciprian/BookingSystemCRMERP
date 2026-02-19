"""Public booking endpoints -- no auth required. Accessed by clients via slug URL."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.appointment import Appointment
from app.models.business import Business
from app.models.client import Client
from app.models.employee import Employee, EmployeeService
from app.models.service import Service
from app.schemas.appointment import AvailabilityResponse, PublicBookingRequest, TimeSlot
from app.schemas.business import BusinessPublicResponse
from app.schemas.employee import EmployeePublicResponse
from app.schemas.service import ServicePublicResponse

router = APIRouter()


@router.get("/{slug}", response_model=BusinessPublicResponse)
async def get_public_profile(slug: str, db: AsyncSession = Depends(get_db)):
    """Public business profile by slug."""
    result = await db.execute(
        select(Business).where(Business.slug == slug, Business.is_active == True)
    )
    biz = result.scalar_one_or_none()
    if not biz:
        raise HTTPException(status_code=404, detail="Afacere negasita")
    return biz


@router.get("/{slug}/services", response_model=list[ServicePublicResponse])
async def get_public_services(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Business).where(Business.slug == slug, Business.is_active == True)
    )
    biz = result.scalar_one_or_none()
    if not biz:
        raise HTTPException(status_code=404, detail="Afacere negasita")

    services = await db.execute(
        select(Service)
        .where(Service.business_id == biz.id, Service.is_active == True, Service.is_public == True)
        .order_by(Service.sort_order)
    )
    return services.scalars().all()


@router.get("/{slug}/employees", response_model=list[EmployeePublicResponse])
async def get_public_employees(
    slug: str,
    service_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Business).where(Business.slug == slug, Business.is_active == True)
    )
    biz = result.scalar_one_or_none()
    if not biz:
        raise HTTPException(status_code=404, detail="Afacere negasita")

    query = select(Employee).where(
        Employee.business_id == biz.id, Employee.is_active == True
    )

    if service_id:
        # Only employees assigned to this service
        query = query.join(EmployeeService).where(EmployeeService.service_id == service_id)

    employees = await db.execute(query.order_by(Employee.sort_order))
    return employees.scalars().all()


@router.get("/{slug}/availability", response_model=AvailabilityResponse)
async def get_public_availability(
    slug: str,
    employee_id: int = Query(...),
    service_id: int = Query(...),
    date: str = Query(..., description="YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
):
    """Public availability -- same logic as private but no auth."""
    result = await db.execute(
        select(Business).where(Business.slug == slug, Business.is_active == True)
    )
    biz = result.scalar_one_or_none()
    if not biz:
        raise HTTPException(status_code=404, detail="Afacere negasita")

    emp = await db.get(Employee, employee_id)
    if not emp or emp.business_id != biz.id or not emp.is_active:
        raise HTTPException(status_code=404, detail="Angajat negasit")

    svc = await db.get(Service, service_id)
    if not svc or svc.business_id != biz.id:
        raise HTTPException(status_code=404, detail="Serviciu negasit")

    day_map = {"0": "mon", "1": "tue", "2": "wed", "3": "thu", "4": "fri", "5": "sat", "6": "sun"}
    target_date = datetime.fromisoformat(date).date()
    day_key = day_map[str(target_date.weekday())]
    schedule_intervals = emp.weekly_schedule.get(day_key, [])

    if not schedule_intervals:
        return AvailabilityResponse(employee_id=employee_id, date=date, slots=[])

    day_start = datetime(target_date.year, target_date.month, target_date.day, tzinfo=timezone.utc)
    day_end = day_start + timedelta(days=1)

    existing_result = await db.execute(
        select(Appointment).where(
            and_(
                Appointment.employee_id == employee_id,
                Appointment.status.in_(["pending", "confirmed", "in_progress"]),
                Appointment.start_time >= day_start,
                Appointment.start_time < day_end,
            )
        ).order_by(Appointment.start_time)
    )
    existing = existing_result.scalars().all()

    slot_duration = svc.duration_minutes + svc.buffer_after_minutes
    slots: list[TimeSlot] = []

    for interval in schedule_intervals:
        h_start, m_start = map(int, interval["start"].split(":"))
        h_end, m_end = map(int, interval["end"].split(":"))
        current = day_start.replace(hour=h_start, minute=m_start)
        interval_end = day_start.replace(hour=h_end, minute=m_end)

        while current + timedelta(minutes=slot_duration) <= interval_end:
            slot_end = current + timedelta(minutes=slot_duration)
            available = not any(
                apt.start_time < slot_end and apt.end_time > current for apt in existing
            )
            # Don't show past slots
            if current > datetime.now(timezone.utc):
                slots.append(TimeSlot(start=current, end=slot_end, available=available))
            current += timedelta(minutes=30)

    return AvailabilityResponse(employee_id=employee_id, date=date, slots=slots)


@router.post("/{slug}/book", status_code=201)
async def public_book(
    slug: str,
    body: PublicBookingRequest,
    db: AsyncSession = Depends(get_db),
):
    """Public booking -- creates appointment + client record if needed."""
    result = await db.execute(
        select(Business).where(Business.slug == slug, Business.is_active == True)
    )
    biz = result.scalar_one_or_none()
    if not biz:
        raise HTTPException(status_code=404, detail="Afacere negasita")

    if not body.gdpr_consent:
        raise HTTPException(status_code=400, detail="Consimtamantul GDPR este obligatoriu")

    svc = await db.get(Service, body.service_id)
    if not svc or svc.business_id != biz.id:
        raise HTTPException(status_code=404, detail="Serviciu negasit")

    emp = await db.get(Employee, body.employee_id)
    if not emp or emp.business_id != biz.id:
        raise HTTPException(status_code=404, detail="Angajat negasit")

    duration = svc.duration_minutes
    end_time = body.start_time + timedelta(minutes=duration + svc.buffer_after_minutes)

    # Conflict check
    conflict = await db.execute(
        select(Appointment).where(
            and_(
                Appointment.employee_id == body.employee_id,
                Appointment.status.in_(["pending", "confirmed", "in_progress"]),
                Appointment.start_time < end_time,
                Appointment.end_time > body.start_time,
            )
        )
    )
    if conflict.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Intervalul nu mai este disponibil")

    # Find or create client
    client = None
    if body.client_phone:
        client_result = await db.execute(
            select(Client).where(
                Client.business_id == biz.id, Client.phone == body.client_phone
            )
        )
        client = client_result.scalar_one_or_none()

    if not client:
        client = Client(
            business_id=biz.id,
            full_name=body.client_name,
            phone=body.client_phone,
            email=body.client_email,
            source="online_booking",
            gdpr_consent=True,
            gdpr_consent_date=datetime.now(timezone.utc),
        )
        db.add(client)
        await db.flush()

    apt = Appointment(
        business_id=biz.id,
        employee_id=body.employee_id,
        service_id=body.service_id,
        client_id=client.id,
        start_time=body.start_time,
        end_time=end_time,
        duration_minutes=duration,
        price=svc.price,
        currency=biz.currency,
        vat_rate=svc.vat_rate,
        final_price=svc.price,
        client_notes=body.client_notes,
        source="online",
        status="confirmed" if biz.auto_confirm_bookings else "pending",
    )
    db.add(apt)
    await db.flush()

    return {
        "appointment_id": apt.id,
        "status": apt.status,
        "start_time": apt.start_time.isoformat(),
        "end_time": apt.end_time.isoformat(),
        "message": "Programare confirmata!" if apt.status == "confirmed" else "Programare in asteptare",
    }
