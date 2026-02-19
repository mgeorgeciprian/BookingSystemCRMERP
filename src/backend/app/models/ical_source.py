"""iCal source model -- sync external calendars (Airbnb, Booking.com, Google Calendar)."""

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ICalSource(Base):
    __tablename__ = "ical_sources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    employee_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True
    )

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    source_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # airbnb | booking_com | google | apple | other
    ical_url: Mapped[str] = mapped_column(Text, nullable=False)

    # Sync status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_synced_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_sync_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    sync_interval_minutes: Mapped[int] = mapped_column(Integer, default=15)
    events_count: Mapped[int] = mapped_column(Integer, default=0)

    # Export (our calendar -> external)
    export_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    export_enabled: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    business = relationship("Business", back_populates="ical_sources")
    employee = relationship("Employee")
