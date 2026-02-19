"""Invoice schemas -- e-Factura compatible, PDF generation pipeline support.

Supports:
- Invoice creation from appointments (auto-generate after payment)
- Manual invoice creation
- Line item calculation with multiple TVA rates (19%, 9%, 5%, 0%)
- Invoice status tracking (draft -> issued -> sent -> paid -> cancelled)
- e-Factura ANAF submission status
- PDF generation and delivery tracking
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, field_validator, model_validator


class InvoiceStatus(str, Enum):
    """Valid invoice statuses."""
    DRAFT = "draft"
    ISSUED = "issued"
    SENT = "sent"
    PAID = "paid"
    CANCELLED = "cancelled"
    STORNO = "storno"


class InvoicePaymentStatus(str, Enum):
    """Valid payment statuses for invoices."""
    UNPAID = "unpaid"
    PAID = "paid"
    PARTIAL = "partial"


class EFacturaStatus(str, Enum):
    """e-Factura ANAF submission statuses."""
    PENDING = "pending"
    UPLOADED = "uploaded"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class VatRate(float, Enum):
    """Valid Romanian VAT rates."""
    STANDARD = 19.0    # Standard rate (most services)
    REDUCED_9 = 9.0    # Food, medical, hotels
    REDUCED_5 = 5.0    # Social housing, certain books
    ZERO = 0.0         # Intra-community, export


class InvoiceLineItem(BaseModel):
    """A single line item on an invoice."""

    description: str = Field(..., min_length=1, max_length=500)
    quantity: float = Field(default=1.0, gt=0)
    unit_price: float = Field(..., ge=0)
    vat_rate: float = Field(default=19.0)
    unit_measure: str = Field(default="buc", max_length=10)  # U.M.: buc, ora, luna, etc.
    total: float | None = None  # auto-calculated if not provided

    @field_validator("vat_rate")
    @classmethod
    def validate_vat_rate(cls, value: float) -> float:
        """Validate that the VAT rate is a legal Romanian rate."""
        allowed_rates = [0.0, 5.0, 9.0, 19.0]
        if value not in allowed_rates:
            raise ValueError(
                f"Cota TVA invalida: {value}%. "
                f"Cotele permise in Romania sunt: {', '.join(str(r) for r in allowed_rates)}%"
            )
        return value

    @model_validator(mode="after")
    def calculate_total(self) -> "InvoiceLineItem":
        """Auto-calculate total if not provided."""
        if self.total is None:
            subtotal = self.quantity * self.unit_price
            vat = subtotal * self.vat_rate / 100
            self.total = round(subtotal + vat, 2)
        return self


class InvoiceCreate(BaseModel):
    """Create a new invoice (manual or from appointment)."""

    client_id: int | None = None
    appointment_id: int | None = None  # Link to the appointment if auto-generated

    # Dates
    invoice_date: datetime | None = None  # Defaults to now
    due_date: datetime | None = None

    # Buyer info (required for Romanian invoices)
    buyer_name: str = Field(..., min_length=2, max_length=300)
    buyer_cui: str | None = Field(default=None, max_length=20)
    buyer_address: str | None = None
    buyer_reg_com: str | None = Field(default=None, max_length=30)
    buyer_email: str | None = None
    buyer_phone: str | None = None
    buyer_is_company: bool = False

    # Line items
    line_items: list[InvoiceLineItem] = Field(..., min_length=1)

    # Notes
    notes: str | None = None

    # Optional: custom invoice series (defaults to business default)
    series: str | None = Field(default=None, max_length=10)

    @field_validator("buyer_cui")
    @classmethod
    def validate_cui_format(cls, value: str | None) -> str | None:
        """Basic CUI format validation for Romanian companies."""
        if value is None:
            return None
        cleaned = value.strip().upper().replace("RO", "")
        # CUI should be numeric, 2-10 digits
        if not cleaned.isdigit() or not (2 <= len(cleaned) <= 10):
            raise ValueError(
                "CUI invalid. Format asteptat: RO12345678 sau 12345678 (2-10 cifre)"
            )
        return value.strip().upper()

    @model_validator(mode="after")
    def company_requires_cui(self) -> "InvoiceCreate":
        """If buyer is a company, CUI is recommended (warning, not error)."""
        # Note: CUI is strongly recommended for B2B but not enforced at schema level
        # because some small businesses may not have it yet. The e-Factura service
        # will enforce it when submitting to ANAF.
        return self


class InvoiceFromAppointment(BaseModel):
    """Auto-generate an invoice from a completed appointment."""

    appointment_id: int
    buyer_name: str | None = None  # Override client name
    buyer_cui: str | None = None
    buyer_address: str | None = None
    buyer_reg_com: str | None = None
    buyer_is_company: bool = False
    notes: str | None = None
    generate_pdf: bool = True
    send_to_client: bool = True


class InvoiceUpdate(BaseModel):
    """Update an existing invoice (only draft/issued status)."""

    buyer_name: str | None = None
    buyer_cui: str | None = None
    buyer_address: str | None = None
    buyer_reg_com: str | None = None
    buyer_email: str | None = None
    buyer_phone: str | None = None
    due_date: datetime | None = None
    notes: str | None = None
    line_items: list[InvoiceLineItem] | None = None


class InvoiceMarkPaid(BaseModel):
    """Mark an invoice as paid."""

    payment_method: str = "cash"  # cash | card | online | transfer
    paid_amount: float | None = None  # None = full amount
    payment_date: datetime | None = None  # None = now


class InvoiceResponse(BaseModel):
    """Full invoice response."""

    id: int
    business_id: int
    client_id: int | None
    series: str
    number: int
    invoice_number_display: str | None = None  # Computed: "BCR000001"
    invoice_date: datetime
    due_date: datetime | None

    # Buyer
    buyer_name: str
    buyer_cui: str | None
    buyer_address: str | None
    buyer_reg_com: str | None
    buyer_email: str | None
    buyer_phone: str | None
    buyer_is_company: bool

    # Totals
    subtotal: float
    vat_amount: float
    total: float
    currency: str
    line_items: list

    # Status
    status: str
    payment_status: str
    paid_amount: float
    paid_at: datetime | None

    # e-Factura
    efactura_status: str | None
    efactura_upload_id: str | None

    # PDF
    pdf_url: str | None

    # Notes
    notes: str | None

    # Timestamps
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def compute_display_number(self) -> "InvoiceResponse":
        """Compute the human-readable invoice number."""
        if self.invoice_number_display is None:
            self.invoice_number_display = f"{self.series}{self.number:06d}"
        return self


class InvoiceListResponse(BaseModel):
    """Paginated invoice list response."""

    items: list[InvoiceResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class InvoicePipelineResult(BaseModel):
    """Result of the full invoice pipeline (generate PDF -> send -> e-Factura)."""

    invoice_id: int
    pdf_generated: bool = False
    pdf_url: str | None = None
    notification_sent: bool = False
    notification_channel: str | None = None
    efactura_submitted: bool = False
    efactura_upload_id: str | None = None
    errors: list[str] = []
