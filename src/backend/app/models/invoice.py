"""Invoice model -- e-Factura compatible invoicing for Romanian businesses."""

from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Invoice(Base):
    __tablename__ = "invoices"
    __table_args__ = (
        UniqueConstraint("business_id", "series", "number", name="uq_invoice_business_series_number"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    client_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("clients.id", ondelete="SET NULL"), nullable=True
    )

    # Invoice identification
    series: Mapped[str] = mapped_column(String(10), nullable=False)  # e.g. "BCR"
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    invoice_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Buyer info (denormalized for invoice immutability)
    buyer_name: Mapped[str] = mapped_column(String(300), nullable=False)
    buyer_cui: Mapped[str | None] = mapped_column(String(20), nullable=True)
    buyer_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    buyer_reg_com: Mapped[str | None] = mapped_column(String(30), nullable=True)
    buyer_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    buyer_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    buyer_is_company: Mapped[bool] = mapped_column(default=False)

    # Totals
    subtotal: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    vat_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    total: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    currency: Mapped[str] = mapped_column(String(3), default="RON")

    # Line items stored as JSON for flexibility
    # [{"description": "...", "qty": 1, "unit_price": 100, "vat_rate": 19, "total": 119}]
    line_items: Mapped[list] = mapped_column(JSONB, default=list)

    # Status
    status: Mapped[str] = mapped_column(
        String(20), default="draft"
    )  # draft | issued | sent | paid | cancelled | storno

    # Payment
    payment_status: Mapped[str] = mapped_column(
        String(15), default="unpaid"
    )  # unpaid | paid | partial
    paid_amount: Mapped[float] = mapped_column(Float, default=0.0)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # e-Factura ANAF
    efactura_xml: Mapped[str | None] = mapped_column(Text, nullable=True)
    efactura_upload_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    efactura_status: Mapped[str | None] = mapped_column(
        String(30), nullable=True
    )  # pending | uploaded | accepted | rejected
    efactura_response: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # PDF storage
    pdf_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    business = relationship("Business", back_populates="invoices")
    client = relationship("Client")
