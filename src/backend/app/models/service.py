"""Service model -- bookable services with pricing and duration."""

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
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ServiceCategory(Base):
    __tablename__ = "service_categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    services = relationship("Service", back_populates="category")


class Service(Base):
    __tablename__ = "services"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    category_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("service_categories.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    buffer_after_minutes: Mapped[int] = mapped_column(Integer, default=0)
    price: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    price_max: Mapped[float | None] = mapped_column(Float, nullable=True)  # for "de la X" pricing
    currency: Mapped[str] = mapped_column(String(3), default="RON")
    vat_rate: Mapped[float] = mapped_column(Float, default=19.0)  # Romania standard VAT
    color: Mapped[str] = mapped_column(String(7), default="#2563eb")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)  # visible on public page
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    business = relationship("Business", back_populates="services")
    category = relationship("ServiceCategory", back_populates="services")
    employee_assignments = relationship(
        "EmployeeService", back_populates="service", cascade="all, delete-orphan"
    )
    appointments = relationship("Appointment", back_populates="service")
