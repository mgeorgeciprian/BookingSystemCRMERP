"""Appointment schemas -- booking, availability, conflict detection, calendar CRUD.

Supports:
- Full CRUD for the calendar interface (create, update, list, filter)
- Availability checking with employee schedules
- Walk-in vs registered client bookings
- Status transitions: pending -> confirmed -> in_progress -> completed,
                       pending -> cancelled, confirmed -> no_show
- Batch operations for calendar views (day, week, month)
- Public booking flow (no auth)
"""

from datetime import datetime, date
from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


# --------------------------------------------------------------------------
# Enums for strict validation
# --------------------------------------------------------------------------

class AppointmentStatus(str, Enum):
    """Valid appointment statuses."""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class PaymentStatus(str, Enum):
    """Valid payment statuses."""
    UNPAID = "unpaid"
    PAID = "paid"
    PARTIAL = "partial"
    REFUNDED = "refunded"


class PaymentMethod(str, Enum):
    """Valid payment methods."""
    CASH = "cash"
    CARD = "card"
    ONLINE = "online"
    TRANSFER = "transfer"


class AppointmentSource(str, Enum):
    """How the appointment was created."""
    MANUAL = "manual"
    ONLINE = "online"
    ICAL_BLOCK = "ical_block"
    RECURRING = "recurring"


class CancelledBy(str, Enum):
    """Who cancelled the appointment."""
    CLIENT = "client"
    EMPLOYEE = "employee"
    SYSTEM = "system"


# Valid status transitions map: from_status -> list of allowed to_statuses
VALID_STATUS_TRANSITIONS: dict[str, list[str]] = {
    "pending": ["confirmed", "cancelled"],
    "confirmed": ["in_progress", "cancelled", "no_show"],
    "in_progress": ["completed"],
    "completed": [],  # terminal state
    "cancelled": [],  # terminal state
    "no_show": [],    # terminal state
}


# --------------------------------------------------------------------------
# Create schemas
# --------------------------------------------------------------------------

class AppointmentCreate(BaseModel):
    """Create a new appointment (from dashboard, requires auth)."""

    employee_id: int
    service_id: int
    client_id: int | None = None
    start_time: datetime

    # Walk-in client info (used when client_id is None)
    walk_in_name: str | None = None
    walk_in_phone: str | None = None

    # Notes
    internal_notes: str | None = None
    client_notes: str | None = None

    # Pricing overrides (optional, defaults to service price)
    price: float | None = None
    discount_percent: float = Field(default=0.0, ge=0.0, le=100.0)

    # Source tracking
    source: AppointmentSource = AppointmentSource.MANUAL

    # Optional: specify the payment method at creation time (e.g., walk-in pays cash)
    payment_method: PaymentMethod | None = None

    @model_validator(mode="after")
    def validate_client_or_walkin(self) -> "AppointmentCreate":
        """Either client_id or walk-in info must be provided."""
        has_client = self.client_id is not None
        has_walkin = bool(self.walk_in_name)
        if not has_client and not has_walkin:
            raise ValueError(
                "Trebuie specificat un client existent (client_id) "
                "sau datele clientului walk-in (walk_in_name)"
            )
        return self

    @field_validator("start_time")
    @classmethod
    def start_time_not_in_past(cls, value: datetime) -> datetime:
        """Appointments cannot be created in the past (with 5 min tolerance)."""
        from datetime import timezone, timedelta
        now = datetime.now(timezone.utc)
        # Allow up to 5 minutes in the past for clock skew / walk-in bookings
        minimum_allowed = now - timedelta(minutes=5)
        if value < minimum_allowed:
            raise ValueError("Data programarii nu poate fi in trecut")
        return value


class AppointmentQuickCreate(BaseModel):
    """Minimal appointment creation for quick calendar entry (drag-and-drop)."""

    employee_id: int
    service_id: int
    start_time: datetime
    client_id: int | None = None
    walk_in_name: str | None = None


# --------------------------------------------------------------------------
# Update schemas
# --------------------------------------------------------------------------

class AppointmentUpdate(BaseModel):
    """Update an existing appointment (partial update via PATCH)."""

    employee_id: int | None = None
    service_id: int | None = None
    client_id: int | None = None
    start_time: datetime | None = None

    # Notes
    internal_notes: str | None = None
    client_notes: str | None = None

    # Pricing
    price: float | None = None
    discount_percent: float | None = Field(default=None, ge=0.0, le=100.0)

    # Payment
    payment_status: PaymentStatus | None = None
    payment_method: PaymentMethod | None = None


class AppointmentStatusTransition(BaseModel):
    """Explicitly change an appointment's status with validation.

    Use this instead of setting status in the generic update,
    to enforce valid transitions.
    """

    new_status: AppointmentStatus

    @field_validator("new_status")
    @classmethod
    def no_transition_to_pending(cls, value: AppointmentStatus) -> AppointmentStatus:
        """Cannot transition back to pending from any state."""
        if value == AppointmentStatus.PENDING:
            raise ValueError("Nu se poate reveni la statusul 'pending'")
        return value


class AppointmentReschedule(BaseModel):
    """Reschedule an appointment to a new time (and optionally a new employee)."""

    new_start_time: datetime
    new_employee_id: int | None = None
    notify_client: bool = True

    @field_validator("new_start_time")
    @classmethod
    def new_start_not_in_past(cls, value: datetime) -> datetime:
        from datetime import timezone
        if value < datetime.now(timezone.utc):
            raise ValueError("Noua data nu poate fi in trecut")
        return value


class AppointmentCancel(BaseModel):
    """Cancel an appointment with reason tracking."""

    cancelled_by: CancelledBy = CancelledBy.EMPLOYEE
    reason: str | None = None
    notify_client: bool = True


class AppointmentComplete(BaseModel):
    """Mark an appointment as completed, optionally with payment info."""

    payment_status: PaymentStatus = PaymentStatus.PAID
    payment_method: PaymentMethod | None = None
    final_price: float | None = None
    generate_invoice: bool = False
    internal_notes: str | None = None


# --------------------------------------------------------------------------
# Response schemas
# --------------------------------------------------------------------------

class AppointmentResponse(BaseModel):
    """Full appointment response with all fields."""

    id: int
    business_id: int
    employee_id: int
    service_id: int | None
    client_id: int | None
    start_time: datetime
    end_time: datetime
    duration_minutes: int

    # Status
    status: str
    source: str

    # Pricing
    price: float
    currency: str
    vat_rate: float
    discount_percent: float
    final_price: float

    # Payment
    payment_status: str
    payment_method: str | None

    # Walk-in info
    walk_in_name: str | None
    walk_in_phone: str | None

    # Notes
    internal_notes: str | None
    client_notes: str | None

    # Cancellation
    cancelled_at: datetime | None
    cancelled_by: str | None
    cancellation_reason: str | None

    # Invoice link
    invoice_id: int | None = None

    # Timestamps
    created_at: datetime
    updated_at: datetime | None = None

    # Enriched names (populated by the endpoint, not from DB directly)
    employee_name: str | None = None
    employee_color: str | None = None
    service_name: str | None = None
    service_color: str | None = None
    client_name: str | None = None
    client_phone: str | None = None

    model_config = {"from_attributes": True}


class AppointmentCalendarEvent(BaseModel):
    """Lightweight appointment data for calendar rendering.

    Optimized for the frontend calendar component (FullCalendar / custom)
    to minimize payload size in day/week/month views.
    """

    id: int
    employee_id: int
    start_time: datetime
    end_time: datetime
    status: str
    source: str

    # Display info
    title: str  # Composed: "Service - Client"
    color: str  # Employee or service color
    employee_name: str | None = None

    # Quick info for tooltip
    client_name: str | None = None
    service_name: str | None = None
    final_price: float | None = None
    payment_status: str | None = None

    model_config = {"from_attributes": True}


class AppointmentListResponse(BaseModel):
    """Paginated appointment list response."""

    items: list[AppointmentResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


# --------------------------------------------------------------------------
# Availability schemas
# --------------------------------------------------------------------------

class AvailabilityQuery(BaseModel):
    """Query parameters for checking employee availability."""

    employee_id: int
    service_id: int
    date: str  # YYYY-MM-DD format

    @field_validator("date")
    @classmethod
    def validate_date_format(cls, value: str) -> str:
        """Ensure date is in YYYY-MM-DD format."""
        try:
            datetime.strptime(value, "%Y-%m-%d")
        except ValueError:
            raise ValueError("Data trebuie sa fie in format YYYY-MM-DD")
        return value


class TimeSlot(BaseModel):
    """A single time slot in the availability grid."""

    start: datetime
    end: datetime
    available: bool = True


class AvailabilityResponse(BaseModel):
    """Available time slots for an employee on a given date."""

    employee_id: int
    date: str
    slots: list[TimeSlot]
    total_available: int = 0
    total_slots: int = 0


class MultiEmployeeAvailabilityQuery(BaseModel):
    """Query availability for multiple employees at once (used in booking UI)."""

    service_id: int
    date: str  # YYYY-MM-DD
    employee_ids: list[int] | None = None  # None = all active employees


class EmployeeAvailability(BaseModel):
    """Availability for a single employee within a multi-employee query."""

    employee_id: int
    employee_name: str
    employee_color: str
    slots: list[TimeSlot]
    total_available: int = 0


class MultiEmployeeAvailabilityResponse(BaseModel):
    """Availability for all requested employees."""

    service_id: int
    date: str
    employees: list[EmployeeAvailability]


# --------------------------------------------------------------------------
# Public booking schemas (no auth required)
# --------------------------------------------------------------------------

class PublicBookingRequest(BaseModel):
    """Public booking by a client (no auth required, accessible via business slug)."""

    service_id: int
    employee_id: int
    start_time: datetime
    client_name: str = Field(..., min_length=2, max_length=200)
    client_phone: str = Field(..., min_length=6, max_length=20)
    client_email: str | None = None
    client_notes: str | None = Field(default=None, max_length=500)
    gdpr_consent: bool = True

    @field_validator("gdpr_consent")
    @classmethod
    def require_gdpr_consent(cls, value: bool) -> bool:
        """GDPR consent is required for public bookings."""
        if not value:
            raise ValueError("Consimtamantul GDPR este obligatoriu pentru programari online")
        return value

    @field_validator("start_time")
    @classmethod
    def public_booking_not_in_past(cls, value: datetime) -> datetime:
        """Public bookings cannot be in the past."""
        from datetime import timezone
        if value < datetime.now(timezone.utc):
            raise ValueError("Data programarii nu poate fi in trecut")
        return value

    @field_validator("client_phone")
    @classmethod
    def validate_phone_format(cls, value: str) -> str:
        """Basic Romanian phone number validation."""
        cleaned = value.strip().replace(" ", "").replace("-", "")
        # Accept Romanian format: +40..., 07..., 004...
        if not (
            cleaned.startswith("+40")
            or cleaned.startswith("07")
            or cleaned.startswith("004")
        ):
            raise ValueError(
                "Numarul de telefon trebuie sa fie in format romanesc "
                "(ex: +40712345678, 0712345678)"
            )
        return cleaned


class PublicBookingResponse(BaseModel):
    """Response after a successful public booking."""

    appointment_id: int
    status: str
    start_time: datetime
    end_time: datetime
    service_name: str
    employee_name: str
    business_name: str
    confirmation_message: str


# --------------------------------------------------------------------------
# Calendar view helpers
# --------------------------------------------------------------------------

class CalendarViewQuery(BaseModel):
    """Query parameters for calendar view (day/week/month)."""

    view: Literal["day", "week", "month"] = "week"
    date: str  # Center date YYYY-MM-DD
    employee_ids: list[int] | None = None  # None = show all employees
    statuses: list[AppointmentStatus] | None = None  # None = show all

    @field_validator("date")
    @classmethod
    def validate_calendar_date(cls, value: str) -> str:
        try:
            datetime.strptime(value, "%Y-%m-%d")
        except ValueError:
            raise ValueError("Data trebuie sa fie in format YYYY-MM-DD")
        return value


class CalendarViewResponse(BaseModel):
    """Response for a calendar view request."""

    view: str
    date_from: str
    date_to: str
    events: list[AppointmentCalendarEvent]
    total_events: int


class DailyStats(BaseModel):
    """Daily statistics for the dashboard."""

    date: str
    total_appointments: int = 0
    completed: int = 0
    cancelled: int = 0
    no_shows: int = 0
    total_revenue: float = 0.0
    average_rating: float | None = None
