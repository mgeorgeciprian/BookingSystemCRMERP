"""Appointment model -- core booking entity with conflict detection support."""

from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Appointment(Base):
    __tablename__ = "appointments"
    __table_args__ = (
        # Index for conflict detection: find overlapping appointments for an employee
        Index("ix_appointments_employee_time", "employee_id", "start_time", "end_time"),
        # Index for business dashboard queries
        Index("ix_appointments_business_date", "business_id", "start_time"),
        # Index for client history
        Index("ix_appointments_client", "client_id", "start_time"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False
    )
    employee_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False
    )
    service_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("services.id", ondelete="SET NULL"), nullable=True
    )
    client_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("clients.id", ondelete="SET NULL"), nullable=True
    )

    # Scheduling
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)

    # Status flow: pending -> confirmed -> in_progress -> completed
    #              pending -> cancelled
    #              confirmed -> no_show
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending", index=True
    )  # pending | confirmed | in_progress | completed | cancelled | no_show

    # Pricing
    price: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    currency: Mapped[str] = mapped_column(String(3), default="RON")
    vat_rate: Mapped[float] = mapped_column(Float, default=19.0)
    discount_percent: Mapped[float] = mapped_column(Float, default=0.0)
    final_price: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    # Payment
    payment_status: Mapped[str] = mapped_column(
        String(15), default="unpaid"
    )  # unpaid | paid | partial | refunded
    payment_method: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )  # cash | card | online | transfer

    # Client info (for walk-ins without CRM record)
    walk_in_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    walk_in_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Notes
    internal_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    client_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Source tracking
    source: Mapped[str] = mapped_column(
        String(20), default="manual"
    )  # manual | online | ical_block | recurring
    ical_source_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("ical_sources.id", ondelete="SET NULL"), nullable=True
    )
    ical_uid: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Recurrence (for recurring appointments)
    recurrence_rule: Mapped[str | None] = mapped_column(String(255), nullable=True)
    recurrence_parent_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True
    )

    # e-Factura
    invoice_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True
    )

    # Extra data
    extra_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Cancellation
    cancelled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    cancelled_by: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )  # client | employee | system
    cancellation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    business = relationship("Business", back_populates="appointments")
    employee = relationship("Employee", back_populates="appointments")
    service = relationship("Service", back_populates="appointments")
    client = relationship("Client", back_populates="appointments")
    ical_source = relationship("ICalSource")
    invoice = relationship("Invoice")
    notifications = relationship(
        "NotificationLog", back_populates="appointment", cascade="all, delete-orphan"
    )
