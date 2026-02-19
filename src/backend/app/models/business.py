"""Business model -- multi-tenant, multi-vertical (salon, dental, therapy, fitness, etc.)."""

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Business(Base):
    __tablename__ = "businesses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    owner_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Business info
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, index=True)
    vertical: Mapped[str] = mapped_column(
        String(30), nullable=False, default="salon"
    )  # salon | dental | therapy | fitness | massage | tutor | medical | other
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Legal (Romania)
    cui: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)  # CUI / CIF
    reg_com: Mapped[str | None] = mapped_column(String(30), nullable=True)  # J12/345/2024
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    county: Mapped[str | None] = mapped_column(String(50), nullable=True)
    postal_code: Mapped[str | None] = mapped_column(String(10), nullable=True)
    country: Mapped[str] = mapped_column(String(5), default="RO")

    # Contact
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    website: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Location
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    google_place_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Settings
    timezone: Mapped[str] = mapped_column(String(50), default="Europe/Bucharest")
    currency: Mapped[str] = mapped_column(String(3), default="RON")
    booking_buffer_minutes: Mapped[int] = mapped_column(Integer, default=0)
    cancellation_policy_hours: Mapped[int] = mapped_column(Integer, default=24)
    auto_confirm_bookings: Mapped[bool] = mapped_column(Boolean, default=True)
    allow_online_payments: Mapped[bool] = mapped_column(Boolean, default=False)
    notification_channels: Mapped[dict] = mapped_column(
        JSONB, default=lambda: {"viber": True, "whatsapp": True, "sms": True, "email": True}
    )

    # e-Factura
    efactura_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    anaf_oauth_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    anaf_token_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Subscription
    subscription_plan: Mapped[str] = mapped_column(
        String(20), default="free"
    )  # free | starter | professional | enterprise
    subscription_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    owner = relationship("User", back_populates="businesses")
    employees = relationship("Employee", back_populates="business", cascade="all, delete-orphan")
    services = relationship("Service", back_populates="business", cascade="all, delete-orphan")
    clients = relationship("Client", back_populates="business", cascade="all, delete-orphan")
    appointments = relationship(
        "Appointment", back_populates="business", cascade="all, delete-orphan"
    )
    ical_sources = relationship(
        "ICalSource", back_populates="business", cascade="all, delete-orphan"
    )
    invoices = relationship("Invoice", back_populates="business", cascade="all, delete-orphan")
