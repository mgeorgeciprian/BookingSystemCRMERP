"""Business schemas -- CRUD + public profile."""

from datetime import datetime

from pydantic import BaseModel, EmailStr


class BusinessCreate(BaseModel):
    name: str
    vertical: str = "salon"
    description: str | None = None
    cui: str | None = None
    reg_com: str | None = None
    address: str | None = None
    city: str | None = None
    county: str | None = None
    postal_code: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    website: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    timezone: str = "Europe/Bucharest"
    currency: str = "RON"
    booking_buffer_minutes: int = 0
    cancellation_policy_hours: int = 24
    auto_confirm_bookings: bool = True


class BusinessUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    cui: str | None = None
    reg_com: str | None = None
    address: str | None = None
    city: str | None = None
    county: str | None = None
    postal_code: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    website: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    booking_buffer_minutes: int | None = None
    cancellation_policy_hours: int | None = None
    auto_confirm_bookings: bool | None = None
    allow_online_payments: bool | None = None
    notification_channels: dict | None = None
    efactura_enabled: bool | None = None


class BusinessResponse(BaseModel):
    id: int
    name: str
    slug: str
    vertical: str
    description: str | None
    logo_url: str | None
    cover_url: str | None
    cui: str | None
    address: str | None
    city: str | None
    county: str | None
    phone: str | None
    email: str | None
    website: str | None
    latitude: float | None
    longitude: float | None
    timezone: str
    currency: str
    booking_buffer_minutes: int
    cancellation_policy_hours: int
    auto_confirm_bookings: bool
    allow_online_payments: bool
    subscription_plan: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class BusinessPublicResponse(BaseModel):
    """Public-facing business profile (no sensitive data)."""

    id: int
    name: str
    slug: str
    vertical: str
    description: str | None
    logo_url: str | None
    cover_url: str | None
    address: str | None
    city: str | None
    county: str | None
    phone: str | None
    latitude: float | None
    longitude: float | None

    model_config = {"from_attributes": True}
