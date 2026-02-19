"""Notification service -- Viber-first, WhatsApp fallback, SMS last resort.

Uses Infobip API for all channels. Strategy: try channels in order of cost-effectiveness
until one succeeds. Viber (~$0.02) -> WhatsApp (~$0.014) -> SMS (~$0.06).
"""

import logging
from datetime import datetime, timezone

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.business import Business
from app.models.client import Client
from app.models.notification import NotificationLog

logger = logging.getLogger(__name__)
settings = get_settings()

CHANNEL_ORDER = settings.NOTIFICATION_STRATEGY.split(",")


async def _send_via_infobip(
    channel: str,
    recipient: str,
    content: str,
    sender: str,
) -> dict:
    """Send message via Infobip API. Returns {"success": bool, "message_id": str, "error": str}."""

    if not settings.INFOBIP_API_KEY:
        logger.warning("Infobip API key not configured, skipping %s send", channel)
        return {"success": False, "message_id": None, "error": "API key not configured"}

    headers = {
        "Authorization": f"App {settings.INFOBIP_API_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(base_url=settings.INFOBIP_BASE_URL) as client:
        try:
            if channel == "viber":
                resp = await client.post(
                    "/viber/2/messages",
                    headers=headers,
                    json={
                        "messages": [{
                            "from": sender,
                            "to": recipient,
                            "content": {"text": content},
                        }]
                    },
                )
            elif channel == "whatsapp":
                resp = await client.post(
                    "/whatsapp/1/message/text",
                    headers=headers,
                    json={
                        "from": sender,
                        "to": recipient,
                        "content": {"text": content},
                    },
                )
            elif channel == "sms":
                resp = await client.post(
                    "/sms/2/text/advanced",
                    headers=headers,
                    json={
                        "messages": [{
                            "from": sender,
                            "destinations": [{"to": recipient}],
                            "text": content,
                        }]
                    },
                )
            else:
                return {"success": False, "message_id": None, "error": f"Unknown channel: {channel}"}

            data = resp.json()
            if resp.status_code in (200, 201):
                msg_id = None
                if "messages" in data and data["messages"]:
                    msg_id = data["messages"][0].get("messageId")
                return {"success": True, "message_id": msg_id, "error": None}
            else:
                error = data.get("requestError", {}).get("serviceException", {}).get("text", str(data))
                return {"success": False, "message_id": None, "error": error}

        except httpx.HTTPError as e:
            return {"success": False, "message_id": None, "error": str(e)}


async def send_message(
    db: AsyncSession,
    business: Business,
    client: Client,
    message_type: str,
    content: str,
    appointment_id: int | None = None,
    preferred_channel: str | None = None,
) -> dict:
    """Send notification with Viber -> WhatsApp -> SMS fallback strategy."""

    # Determine channel order
    if preferred_channel:
        channels = [preferred_channel]
    elif client.preferred_channel:
        channels = [client.preferred_channel] + [c for c in CHANNEL_ORDER if c != client.preferred_channel]
    else:
        channels = CHANNEL_ORDER.copy()

    # Get recipient for each channel
    def get_recipient(ch: str) -> str | None:
        if ch == "viber":
            return client.viber_id or client.phone
        elif ch == "whatsapp":
            return client.whatsapp_phone or client.phone
        elif ch == "sms":
            return client.phone
        elif ch == "email":
            return client.email
        return None

    # Try each channel
    for attempt, channel in enumerate(channels, 1):
        recipient = get_recipient(channel)
        if not recipient:
            continue

        # Check if channel is enabled for this business
        if not business.notification_channels.get(channel, False):
            continue

        result = await _send_via_infobip(
            channel=channel,
            recipient=recipient,
            content=content,
            sender=settings.INFOBIP_SENDER,
        )

        # Log the attempt
        log = NotificationLog(
            business_id=business.id,
            appointment_id=appointment_id,
            client_id=client.id,
            channel=channel,
            message_type=message_type,
            recipient=recipient,
            content=content,
            status="sent" if result["success"] else "failed",
            provider_message_id=result.get("message_id"),
            error_message=result.get("error"),
            fallback_from=channels[0] if attempt > 1 else None,
            attempt_number=attempt,
        )
        db.add(log)
        await db.flush()

        if result["success"]:
            return {
                "status": "sent",
                "channel": channel,
                "message_id": result.get("message_id"),
                "attempt": attempt,
            }

        logger.warning(
            "Failed to send %s via %s to %s: %s",
            message_type, channel, recipient, result.get("error"),
        )

    return {"status": "failed", "error": "Toate canalele de notificare au esuat"}


def format_booking_confirmation(
    business_name: str,
    service_name: str,
    employee_name: str,
    start_time: datetime,
) -> str:
    """Format a booking confirmation message in Romanian."""
    time_str = start_time.strftime("%d.%m.%Y la %H:%M")
    return (
        f"Programare confirmata la {business_name}!\n\n"
        f"Serviciu: {service_name}\n"
        f"Specialist: {employee_name}\n"
        f"Data: {time_str}\n\n"
        f"Pentru anulare, contacteaza-ne cu cel putin 24h inainte."
    )


def format_reminder(
    business_name: str,
    service_name: str,
    start_time: datetime,
    hours_before: int,
) -> str:
    """Format a reminder message in Romanian."""
    time_str = start_time.strftime("%d.%m.%Y la %H:%M")
    return (
        f"Reminder: Ai o programare la {business_name} "
        f"{'maine' if hours_before >= 24 else f'in {hours_before}h'}!\n\n"
        f"Serviciu: {service_name}\n"
        f"Data: {time_str}\n\n"
        f"Te asteptam!"
    )
