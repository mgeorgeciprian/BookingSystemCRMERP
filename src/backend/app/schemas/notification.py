"""Notification schemas."""

from datetime import datetime

from pydantic import BaseModel


class NotificationLogResponse(BaseModel):
    id: int
    business_id: int
    appointment_id: int | None
    channel: str
    message_type: str
    recipient: str
    content: str
    status: str
    error_message: str | None
    cost: float
    cost_currency: str
    created_at: datetime
    delivered_at: datetime | None

    model_config = {"from_attributes": True}


class SendNotificationRequest(BaseModel):
    client_id: int
    message_type: str = "custom"
    content: str
    channel: str | None = None  # None = use client preference + fallback strategy
