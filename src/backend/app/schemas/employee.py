"""Employee schemas."""

from pydantic import BaseModel


class EmployeeCreate(BaseModel):
    full_name: str
    display_name: str | None = None
    phone: str | None = None
    email: str | None = None
    role: str = "specialist"
    color: str = "#2563eb"
    weekly_schedule: dict | None = None
    commission_type: str = "none"
    commission_value: float | None = None
    sort_order: int = 0


class EmployeeUpdate(BaseModel):
    full_name: str | None = None
    display_name: str | None = None
    phone: str | None = None
    email: str | None = None
    role: str | None = None
    color: str | None = None
    weekly_schedule: dict | None = None
    commission_type: str | None = None
    commission_value: float | None = None
    is_active: bool | None = None
    sort_order: int | None = None


class EmployeeResponse(BaseModel):
    id: int
    business_id: int
    user_id: int | None
    full_name: str
    display_name: str | None
    phone: str | None
    email: str | None
    avatar_url: str | None
    role: str
    color: str
    weekly_schedule: dict
    commission_type: str
    commission_value: float | None
    is_active: bool
    sort_order: int

    model_config = {"from_attributes": True}


class EmployeePublicResponse(BaseModel):
    """Public view for booking page."""

    id: int
    full_name: str
    display_name: str | None
    avatar_url: str | None
    color: str

    model_config = {"from_attributes": True}


class EmployeeServiceAssign(BaseModel):
    service_id: int
    price_override: float | None = None
    duration_override: int | None = None
