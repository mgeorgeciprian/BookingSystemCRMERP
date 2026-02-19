"""Service schemas."""

from pydantic import BaseModel


class ServiceCategoryCreate(BaseModel):
    name: str
    sort_order: int = 0


class ServiceCategoryResponse(BaseModel):
    id: int
    name: str
    sort_order: int

    model_config = {"from_attributes": True}


class ServiceCreate(BaseModel):
    category_id: int | None = None
    name: str
    description: str | None = None
    duration_minutes: int = 60
    buffer_after_minutes: int = 0
    price: float
    price_max: float | None = None
    vat_rate: float = 19.0
    color: str = "#2563eb"
    is_public: bool = True
    sort_order: int = 0


class ServiceUpdate(BaseModel):
    category_id: int | None = None
    name: str | None = None
    description: str | None = None
    duration_minutes: int | None = None
    buffer_after_minutes: int | None = None
    price: float | None = None
    price_max: float | None = None
    vat_rate: float | None = None
    color: str | None = None
    is_active: bool | None = None
    is_public: bool | None = None
    sort_order: int | None = None


class ServiceResponse(BaseModel):
    id: int
    business_id: int
    category_id: int | None
    name: str
    description: str | None
    duration_minutes: int
    buffer_after_minutes: int
    price: float
    price_max: float | None
    currency: str
    vat_rate: float
    color: str
    is_active: bool
    is_public: bool
    sort_order: int

    model_config = {"from_attributes": True}


class ServicePublicResponse(BaseModel):
    """Public view for booking page."""

    id: int
    name: str
    description: str | None
    duration_minutes: int
    price: float
    price_max: float | None
    currency: str
    color: str

    model_config = {"from_attributes": True}
