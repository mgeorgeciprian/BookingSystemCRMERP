"""Appointment schemas -- booking, availability, conflict detection."""

from datetime import datetime

from pydantic import BaseModel


class AppointmentCreate(BaseModel):
    employee_id: int
    service_id: int
    client_id: int | None = None
    start_time: datetime
    walk_in_name: str | None = None
    walk_in_phone: str | None = None
    internal_notes: str | None = None
    client_notes: str | None = None
    price: float | None = None
    discount_percent: float = 0.0
    source: str = "manual"


class AppointmentUpdate(BaseModel):
    employee_id: int | None = None
    service_id: int | None = None
    client_id: int | None = None
    start_time: datetime | None = None
    status: str | None = None
    internal_notes: str | None = None
    client_notes: str | None = None
    price: float | None = None
    discount_percent: float | None = None
    payment_status: str | None = None
    payment_method: str | None = None


class AppointmentResponse(BaseModel):
    id: int
    business_id: int
    employee_id: int
    service_id: int
    client_id: int | None
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    status: str
    price: float
    currency: str
    vat_rate: float
    discount_percent: float
    final_price: float
    payment_status: str
    payment_method: str | None
    walk_in_name: str | None
    walk_in_phone: str | None
    internal_notes: str | None
    client_notes: str | None
    source: str
    cancelled_at: datetime | None
    cancelled_by: str | None
    cancellation_reason: str | None
    created_at: datetime

    # Nested
    employee_name: str | None = None
    service_name: str | None = None
    client_name: str | None = None

    model_config = {"from_attributes": True}


class AppointmentCancel(BaseModel):
    cancelled_by: str = "employee"  # client | employee | system
    reason: str | None = None


class PublicBookingRequest(BaseModel):
    """Public booking by a client (no auth required)."""

    service_id: int
    employee_id: int
    start_time: datetime
    client_name: str
    client_phone: str
    client_email: str | None = None
    client_notes: str | None = None
    gdpr_consent: bool = True


class AvailabilityQuery(BaseModel):
    employee_id: int
    service_id: int
    date: str  # YYYY-MM-DD


class TimeSlot(BaseModel):
    start: datetime
    end: datetime
    available: bool = True


class AvailabilityResponse(BaseModel):
    employee_id: int
    date: str
    slots: list[TimeSlot]
