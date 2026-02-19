"""Client (CRM) schemas."""

from datetime import datetime

from pydantic import BaseModel, EmailStr


class ClientCreate(BaseModel):
    full_name: str
    phone: str | None = None
    email: EmailStr | None = None
    source: str = "manual"
    tags: list[str] = []
    notes: str | None = None
    preferred_employee_id: int | None = None
    preferred_channel: str = "viber"
    gdpr_consent: bool = False
    gdpr_article9_consent: bool = False


class ClientUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    tags: list[str] | None = None
    notes: str | None = None
    preferred_employee_id: int | None = None
    preferred_channel: str | None = None
    notifications_enabled: bool | None = None
    is_blocked: bool | None = None
    blocked_reason: str | None = None


class ClientResponse(BaseModel):
    id: int
    business_id: int
    full_name: str
    phone: str | None
    email: str | None
    source: str
    tags: list
    notes: str | None
    preferred_employee_id: int | None
    preferred_channel: str
    notifications_enabled: bool
    gdpr_consent: bool
    gdpr_consent_date: datetime | None
    gdpr_article9_consent: bool
    total_appointments: int
    total_revenue: float
    no_show_count: int
    last_visit_at: datetime | None
    is_blocked: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ClientListResponse(BaseModel):
    """Lighter response for list views."""

    id: int
    full_name: str
    phone: str | None
    email: str | None
    tags: list
    total_appointments: int
    total_revenue: float
    no_show_count: int
    last_visit_at: datetime | None
    is_blocked: bool

    model_config = {"from_attributes": True}
