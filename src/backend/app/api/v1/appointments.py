"""Appointment CRUD + availability + conflict detection."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.appointment import Appointment
from app.models.business import Business
from app.models.client import Client
from app.models.employee import Employee
from app.models.service import Service
from app.models.user import User
from app.schemas.appointment import (
    AppointmentCancel,
    AppointmentCreate,
    AppointmentResponse,
    AppointmentUpdate,
    AvailabilityResponse,
    TimeSlot,
)

router = APIRouter()


async def _get_owned_business(business_id: int, user: User, db: AsyncSession) -> Business:
    result = await db.execute(
        select(Business).where(Business.id == business_id, Business.owner_id == user.id)
    )
    biz = result.scalar_one_or_none()
    if not biz:
        raise HTTPException(status_code=404, detail="Afacere negasita")
    return biz


async def _check_conflict(
    db: AsyncSession,
    employee_id: int,
    start: datetime,
    end: datetime,
    exclude_id: int | None = None,
) -> bool:
    """Check if employee has overlapping appointments."""
    query = select(Appointment).where(
        and_(
            Appointment.employee_id == employee_id,
            Appointment.status.in_(["pending", "confirmed", "in_progress"]),
            Appointment.start_time < end,
            Appointment.end_time > start,
        )
    )
    if exclude_id:
        query = query.where(Appointment.id != exclude_id)
    result = await db.execute(query)
    return result.scalar_one_or_none() is not None


@router.get("/", response_model=list[AppointmentResponse])
async def list_appointments(
    business_id: int,
    date_from: str | None = Query(None, description="YYYY-MM-DD"),
    date_to: str | None = Query(None, description="YYYY-MM-DD"),
    employee_id: int | None = Query(None),
    status: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_business(business_id, user, db)
    query = select(Appointment).where(Appointment.business_id == business_id)

    if date_from:
        query = query.where(Appointment.start_time >= datetime.fromisoformat(date_from))
    if date_to:
        dt_to = datetime.fromisoformat(date_to) + timedelta(days=1)
        query = query.where(Appointment.start_time < dt_to)
    if employee_id:
        query = query.where(Appointment.employee_id == employee_id)
    if status:
        query = query.where(Appointment.status == status)

    query = query.order_by(Appointment.start_time)
    result = await db.execute(query)
    appointments = result.scalars().all()

    # Enrich with names
    response = []
    for apt in appointments:
        data = AppointmentResponse.model_validate(apt)
        # Load related names
        emp = await db.get(Employee, apt.employee_id)
        svc = await db.get(Service, apt.service_id)
        data.employee_name = emp.display_name or emp.full_name if emp else None
        data.service_name = svc.name if svc else None
        if apt.client_id:
            cli = await db.get(Client, apt.client_id)
            data.client_name = cli.full_name if cli else apt.walk_in_name
        else:
            data.client_name = apt.walk_in_name
        response.append(data)

    return response


@router.post("/", response_model=AppointmentResponse, status_code=201)
async def create_appointment(
    business_id: int,
    body: AppointmentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    biz = await _get_owned_business(business_id, user, db)

    # Get service for duration and price
    svc = await db.get(Service, body.service_id)
    if not svc or svc.business_id != business_id:
        raise HTTPException(status_code=404, detail="Serviciu negasit")

    duration = svc.duration_minutes
    end_time = body.start_time + timedelta(minutes=duration + svc.buffer_after_minutes)

    # Conflict detection
    if await _check_conflict(db, body.employee_id, body.start_time, end_time):
        raise HTTPException(status_code=409, detail="Conflict de programare - interval ocupat")

    price = body.price if body.price is not None else svc.price
    discount = body.discount_percent or 0.0
    final_price = price * (1 - discount / 100)

    apt = Appointment(
        business_id=business_id,
        employee_id=body.employee_id,
        service_id=body.service_id,
        client_id=body.client_id,
        start_time=body.start_time,
        end_time=end_time,
        duration_minutes=duration,
        price=price,
        currency=biz.currency,
        vat_rate=svc.vat_rate,
        discount_percent=discount,
        final_price=final_price,
        walk_in_name=body.walk_in_name,
        walk_in_phone=body.walk_in_phone,
        internal_notes=body.internal_notes,
        client_notes=body.client_notes,
        source=body.source,
        status="confirmed" if biz.auto_confirm_bookings else "pending",
    )
    db.add(apt)
    await db.flush()
    return apt


@router.patch("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    business_id: int,
    appointment_id: int,
    body: AppointmentUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_business(business_id, user, db)
    result = await db.execute(
        select(Appointment).where(
            Appointment.id == appointment_id, Appointment.business_id == business_id
        )
    )
    apt = result.scalar_one_or_none()
    if not apt:
        raise HTTPException(status_code=404, detail="Programare negasita")

    # If rescheduling, check conflicts
    if body.start_time and body.start_time != apt.start_time:
        svc = await db.get(Service, body.service_id or apt.service_id)
        new_end = body.start_time + timedelta(minutes=svc.duration_minutes + svc.buffer_after_minutes)
        emp_id = body.employee_id or apt.employee_id
        if await _check_conflict(db, emp_id, body.start_time, new_end, exclude_id=apt.id):
            raise HTTPException(status_code=409, detail="Conflict de programare - interval ocupat")
        apt.end_time = new_end

    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(apt, key, value)
    await db.flush()
    return apt


@router.post("/{appointment_id}/cancel", response_model=AppointmentResponse)
async def cancel_appointment(
    business_id: int,
    appointment_id: int,
    body: AppointmentCancel,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_business(business_id, user, db)
    result = await db.execute(
        select(Appointment).where(
            Appointment.id == appointment_id, Appointment.business_id == business_id
        )
    )
    apt = result.scalar_one_or_none()
    if not apt:
        raise HTTPException(status_code=404, detail="Programare negasita")

    if apt.status in ("cancelled", "completed"):
        raise HTTPException(status_code=400, detail="Programarea nu poate fi anulata")

    apt.status = "cancelled"
    apt.cancelled_at = datetime.now(timezone.utc)
    apt.cancelled_by = body.cancelled_by
    apt.cancellation_reason = body.reason
    await db.flush()
    return apt


@router.post("/{appointment_id}/status")
async def update_appointment_status(
    business_id: int,
    appointment_id: int,
    new_status: str = Query(..., description="New status: confirmed|in_progress|completed|no_show"),
    payment_method: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Transition appointment to a new status."""
    await _get_owned_business(business_id, user, db)
    result = await db.execute(
        select(Appointment).where(
            Appointment.id == appointment_id, Appointment.business_id == business_id
        )
    )
    apt = result.scalar_one_or_none()
    if not apt:
        raise HTTPException(status_code=404, detail="Programare negasita")

    valid_transitions = {
        "pending": ["confirmed", "cancelled"],
        "confirmed": ["in_progress", "cancelled", "no_show"],
        "in_progress": ["completed", "cancelled"],
    }
    allowed = valid_transitions.get(apt.status, [])
    if new_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Nu se poate trece din '{apt.status}' in '{new_status}'"
        )

    apt.status = new_status

    # If completed, mark payment
    if new_status == "completed":
        apt.payment_status = "paid"
        if payment_method:
            apt.payment_method = payment_method

    await db.flush()
    return {"id": apt.id, "status": apt.status, "payment_status": apt.payment_status}


@router.get("/availability", response_model=AvailabilityResponse)
async def get_availability(
    business_id: int,
    employee_id: int = Query(...),
    service_id: int = Query(...),
    date: str = Query(..., description="YYYY-MM-DD"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get available time slots for an employee on a given date."""
    await _get_owned_business(business_id, user, db)

    emp = await db.get(Employee, employee_id)
    if not emp or emp.business_id != business_id:
        raise HTTPException(status_code=404, detail="Angajat negasit")

    svc = await db.get(Service, service_id)
    if not svc or svc.business_id != business_id:
        raise HTTPException(status_code=404, detail="Serviciu negasit")

    # Get day of week schedule
    day_map = {"0": "mon", "1": "tue", "2": "wed", "3": "thu", "4": "fri", "5": "sat", "6": "sun"}
    target_date = datetime.fromisoformat(date).date()
    day_key = day_map[str(target_date.weekday())]
    schedule_intervals = emp.weekly_schedule.get(day_key, [])

    if not schedule_intervals:
        return AvailabilityResponse(employee_id=employee_id, date=date, slots=[])

    # Get existing appointments for that day
    day_start = datetime(target_date.year, target_date.month, target_date.day, tzinfo=timezone.utc)
    day_end = day_start + timedelta(days=1)

    result = await db.execute(
        select(Appointment).where(
            and_(
                Appointment.employee_id == employee_id,
                Appointment.status.in_(["pending", "confirmed", "in_progress"]),
                Appointment.start_time >= day_start,
                Appointment.start_time < day_end,
            )
        ).order_by(Appointment.start_time)
    )
    existing = result.scalars().all()

    # Generate slots
    slot_duration = svc.duration_minutes + svc.buffer_after_minutes
    slots: list[TimeSlot] = []

    for interval in schedule_intervals:
        h_start, m_start = map(int, interval["start"].split(":"))
        h_end, m_end = map(int, interval["end"].split(":"))

        current = day_start.replace(hour=h_start, minute=m_start)
        interval_end = day_start.replace(hour=h_end, minute=m_end)

        while current + timedelta(minutes=slot_duration) <= interval_end:
            slot_end = current + timedelta(minutes=slot_duration)
            # Check against existing appointments
            available = not any(
                apt.start_time < slot_end and apt.end_time > current for apt in existing
            )
            slots.append(TimeSlot(start=current, end=slot_end, available=available))
            current += timedelta(minutes=30)  # 30-min step

    return AvailabilityResponse(employee_id=employee_id, date=date, slots=slots)
