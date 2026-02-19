"""Employee model -- staff members with weekly schedules and service assignments."""

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # Info
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    role: Mapped[str] = mapped_column(
        String(30), default="specialist"
    )  # specialist | manager | receptionist
    color: Mapped[str] = mapped_column(String(7), default="#2563eb")  # hex color for calendar

    # Weekly schedule: {"mon": [{"start": "09:00", "end": "18:00"}], "tue": [...], ...}
    # Null day = day off, multiple intervals = split shifts
    weekly_schedule: Mapped[dict] = mapped_column(
        JSONB,
        default=lambda: {
            "mon": [{"start": "09:00", "end": "18:00"}],
            "tue": [{"start": "09:00", "end": "18:00"}],
            "wed": [{"start": "09:00", "end": "18:00"}],
            "thu": [{"start": "09:00", "end": "18:00"}],
            "fri": [{"start": "09:00", "end": "18:00"}],
            "sat": [],
            "sun": [],
        },
    )

    # Commission
    commission_type: Mapped[str] = mapped_column(
        String(10), default="none"
    )  # none | percent | fixed
    commission_value: Mapped[float | None] = mapped_column(nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    business = relationship("Business", back_populates="employees")
    user = relationship("User")
    service_assignments = relationship(
        "EmployeeService", back_populates="employee", cascade="all, delete-orphan"
    )
    appointments = relationship("Appointment", back_populates="employee")


class EmployeeService(Base):
    """Many-to-many: which employees can perform which services (with optional price override)."""

    __tablename__ = "employee_services"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    employee_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True
    )
    service_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True
    )
    price_override: Mapped[float | None] = mapped_column(nullable=True)
    duration_override: Mapped[int | None] = mapped_column(Integer, nullable=True)

    employee = relationship("Employee", back_populates="service_assignments")
    service = relationship("Service", back_populates="employee_assignments")
