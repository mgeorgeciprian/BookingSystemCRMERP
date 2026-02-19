"""Notification schemas -- messaging, email, invoice delivery.

Supports:
- Standard text notifications via Viber/WhatsApp/SMS
- Email notifications with optional PDF attachment
- Invoice delivery tracking
- Notification log with cost tracking and delivery status
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class NotificationChannel(str, Enum):
    """Available notification channels."""
    VIBER = "viber"
    WHATSAPP = "whatsapp"
    SMS = "sms"
    EMAIL = "email"


class NotificationMessageType(str, Enum):
    """Types of notification messages."""
    BOOKING_CONFIRM = "booking_confirm"
    REMINDER_24H = "reminder_24h"
    REMINDER_1H = "reminder_1h"
    CANCELLATION = "cancellation"
    NO_SHOW_FOLLOWUP = "no_show_followup"
    REVIEW_REQUEST = "review_request"
    INVOICE = "invoice"
    CUSTOM = "custom"


class NotificationStatus(str, Enum):
    """Notification delivery statuses."""
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"
    REJECTED = "rejected"


class NotificationLogResponse(BaseModel):
    """Notification log entry response."""

    id: int
    business_id: int
    appointment_id: int | None
    client_id: int | None
    channel: str
    message_type: str
    recipient: str
    content: str
    status: str
    provider_message_id: str | None
    error_message: str | None
    fallback_from: str | None
    attempt_number: int
    cost: float
    cost_currency: str
    created_at: datetime
    delivered_at: datetime | None

    model_config = {"from_attributes": True}


class SendNotificationRequest(BaseModel):
    """Request to send a custom notification to a client."""

    client_id: int
    message_type: str = "custom"
    content: str = Field(..., min_length=1, max_length=2000)
    channel: str | None = None  # None = use client preference + fallback strategy


class SendInvoiceNotificationRequest(BaseModel):
    """Request to send an invoice to a client (triggers PDF generation + delivery)."""

    invoice_id: int
    channel: str | None = None  # None = whatsapp preferred, email fallback


class NotificationStatsResponse(BaseModel):
    """Notification statistics for a business."""

    total_sent: int = 0
    total_delivered: int = 0
    total_failed: int = 0
    total_cost: float = 0.0
    cost_currency: str = "EUR"
    by_channel: dict[str, int] = {}
    by_type: dict[str, int] = {}
