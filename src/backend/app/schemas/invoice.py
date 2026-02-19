"""Invoice schemas -- e-Factura compatible."""

from datetime import datetime

from pydantic import BaseModel


class InvoiceLineItem(BaseModel):
    description: str
    quantity: float = 1.0
    unit_price: float
    vat_rate: float = 19.0
    total: float | None = None  # auto-calculated


class InvoiceCreate(BaseModel):
    client_id: int | None = None
    invoice_date: datetime | None = None
    due_date: datetime | None = None
    buyer_name: str
    buyer_cui: str | None = None
    buyer_address: str | None = None
    buyer_reg_com: str | None = None
    buyer_email: str | None = None
    buyer_phone: str | None = None
    buyer_is_company: bool = False
    line_items: list[InvoiceLineItem]
    notes: str | None = None


class InvoiceResponse(BaseModel):
    id: int
    business_id: int
    client_id: int | None
    series: str
    number: int
    invoice_date: datetime
    due_date: datetime | None
    buyer_name: str
    buyer_cui: str | None
    buyer_address: str | None
    subtotal: float
    vat_amount: float
    total: float
    currency: str
    line_items: list
    status: str
    payment_status: str
    paid_amount: float
    efactura_status: str | None
    pdf_url: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
