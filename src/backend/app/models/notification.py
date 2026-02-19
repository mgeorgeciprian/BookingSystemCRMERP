"""Notification log -- tracks all Viber/WhatsApp/SMS/email messages sent."""

from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    appointment_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True, index=True
    )
    client_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("clients.id", ondelete="SET NULL"), nullable=True
    )

    # Message details
    channel: Mapped[str] = mapped_column(
        String(15), nullable=False
    )  # viber | whatsapp | sms | email
    message_type: Mapped[str] = mapped_column(
        String(30), nullable=False
    )  # booking_confirm | reminder_24h | reminder_1h | cancellation | review_request | custom
    recipient: Mapped[str] = mapped_column(String(255), nullable=False)  # phone or email
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Delivery status
    status: Mapped[str] = mapped_column(
        String(20), default="pending"
    )  # pending | sent | delivered | read | failed | rejected
    provider_message_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Fallback tracking
    fallback_from: Mapped[str | None] = mapped_column(
        String(15), nullable=True
    )  # original channel if this was a fallback
    attempt_number: Mapped[int] = mapped_column(Integer, default=1)

    # Cost tracking
    cost: Mapped[float] = mapped_column(Float, default=0.0)
    cost_currency: Mapped[str] = mapped_column(String(3), default="EUR")

    # Provider response
    provider_response: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    appointment = relationship("Appointment", back_populates="notifications")
