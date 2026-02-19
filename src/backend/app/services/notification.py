"""Notification service -- Viber-first, WhatsApp fallback, SMS last resort.

Uses Infobip API for all channels. Strategy: try channels in order of cost-effectiveness
until one succeeds. Viber (~$0.02) -> WhatsApp (~$0.014) -> SMS (~$0.06).

Enhanced with:
- Email sending via Infobip Email API (for invoice PDF delivery)
- WhatsApp document/PDF attachment support via Infobip
- Invoice-specific notification formatting and delivery
- Cancellation, no-show follow-up, and review request templates
"""

import base64
import logging
from datetime import datetime, timezone
from typing import TYPE_CHECKING

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.business import Business
from app.models.client import Client
from app.models.notification import NotificationLog

if TYPE_CHECKING:
    from app.models.invoice import Invoice

logger = logging.getLogger(__name__)
settings = get_settings()

CHANNEL_ORDER = settings.NOTIFICATION_STRATEGY.split(",")

# Infobip timeout for HTTP requests (seconds)
INFOBIP_REQUEST_TIMEOUT = 30


def _get_infobip_headers() -> dict[str, str]:
    """Return standard Infobip API headers."""
    return {
        "Authorization": f"App {settings.INFOBIP_API_KEY}",
        "Content-Type": "application/json",
    }


async def _send_via_infobip(
    channel: str,
    recipient: str,
    content: str,
    sender: str,
) -> dict:
    """Send a text message via Infobip API.

    Returns: {"success": bool, "message_id": str | None, "error": str | None}
    """

    if not settings.INFOBIP_API_KEY:
        logger.warning("Infobip API key not configured, skipping %s send", channel)
        return {"success": False, "message_id": None, "error": "API key not configured"}

    headers = _get_infobip_headers()

    async with httpx.AsyncClient(
        base_url=settings.INFOBIP_BASE_URL,
        timeout=INFOBIP_REQUEST_TIMEOUT,
    ) as http_client:
        try:
            if channel == "viber":
                resp = await http_client.post(
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
                resp = await http_client.post(
                    "/whatsapp/1/message/text",
                    headers=headers,
                    json={
                        "from": sender,
                        "to": recipient,
                        "content": {"text": content},
                    },
                )
            elif channel == "sms":
                resp = await http_client.post(
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
                message_id = None
                if "messages" in data and data["messages"]:
                    message_id = data["messages"][0].get("messageId")
                return {"success": True, "message_id": message_id, "error": None}
            else:
                error_text = (
                    data.get("requestError", {})
                    .get("serviceException", {})
                    .get("text", str(data))
                )
                return {"success": False, "message_id": None, "error": error_text}

        except httpx.HTTPError as http_error:
            return {"success": False, "message_id": None, "error": str(http_error)}


async def _send_whatsapp_document(
    recipient: str,
    caption: str,
    pdf_bytes: bytes,
    filename: str,
    sender: str,
) -> dict:
    """Send a WhatsApp message with a PDF document attachment via Infobip.

    Infobip WhatsApp document API expects a base64-encoded file or a URL.
    We use the base64 inline approach for direct delivery without pre-uploading.

    Returns: {"success": bool, "message_id": str | None, "error": str | None}
    """
    if not settings.INFOBIP_API_KEY:
        return {"success": False, "message_id": None, "error": "API key not configured"}

    headers = _get_infobip_headers()
    pdf_base64 = base64.b64encode(pdf_bytes).decode("utf-8")

    payload = {
        "from": sender,
        "to": recipient,
        "content": {
            "mediaUrl": f"data:application/pdf;base64,{pdf_base64}",
            "caption": caption,
            "fileName": filename,
        },
    }

    async with httpx.AsyncClient(
        base_url=settings.INFOBIP_BASE_URL,
        timeout=INFOBIP_REQUEST_TIMEOUT,
    ) as http_client:
        try:
            resp = await http_client.post(
                "/whatsapp/1/message/document",
                headers=headers,
                json=payload,
            )
            data = resp.json()
            if resp.status_code in (200, 201):
                message_id = None
                if "messages" in data and data["messages"]:
                    message_id = data["messages"][0].get("messageId")
                return {"success": True, "message_id": message_id, "error": None}
            else:
                error_text = (
                    data.get("requestError", {})
                    .get("serviceException", {})
                    .get("text", str(data))
                )
                return {"success": False, "message_id": None, "error": error_text}
        except httpx.HTTPError as http_error:
            return {"success": False, "message_id": None, "error": str(http_error)}


async def _send_email_via_infobip(
    recipient_email: str,
    subject: str,
    html_body: str,
    sender_email: str,
    sender_name: str,
    pdf_bytes: bytes | None = None,
    pdf_filename: str | None = None,
) -> dict:
    """Send an email via Infobip Email API with optional PDF attachment.

    Returns: {"success": bool, "message_id": str | None, "error": str | None}
    """
    if not settings.INFOBIP_API_KEY:
        return {"success": False, "message_id": None, "error": "API key not configured"}

    headers = {
        "Authorization": f"App {settings.INFOBIP_API_KEY}",
    }

    # Infobip Email API uses multipart/form-data
    form_data = {
        "from": f"{sender_name} <{sender_email}>",
        "to": recipient_email,
        "subject": subject,
        "html": html_body,
    }

    async with httpx.AsyncClient(
        base_url=settings.INFOBIP_BASE_URL,
        timeout=INFOBIP_REQUEST_TIMEOUT,
    ) as http_client:
        try:
            files = None
            if pdf_bytes and pdf_filename:
                files = {
                    "attachment": (pdf_filename, pdf_bytes, "application/pdf"),
                }

            resp = await http_client.post(
                "/email/3/send",
                headers=headers,
                data=form_data,
                files=files,
            )

            data = resp.json()
            if resp.status_code in (200, 201):
                message_id = None
                if "messages" in data and data["messages"]:
                    message_id = data["messages"][0].get("messageId")
                return {"success": True, "message_id": message_id, "error": None}
            else:
                error_text = (
                    data.get("requestError", {})
                    .get("serviceException", {})
                    .get("text", str(data))
                )
                return {"success": False, "message_id": None, "error": error_text}
        except httpx.HTTPError as http_error:
            return {"success": False, "message_id": None, "error": str(http_error)}


async def send_message(
    db: AsyncSession,
    business: Business,
    client: Client,
    message_type: str,
    content: str,
    appointment_id: int | None = None,
    preferred_channel: str | None = None,
) -> dict:
    """Send notification with Viber -> WhatsApp -> SMS fallback strategy.

    Args:
        db: Database session for logging.
        business: The business sending the notification.
        client: The client receiving the notification.
        message_type: Type of notification (booking_confirm, reminder_24h, etc.).
        content: Text content of the message.
        appointment_id: Optional linked appointment ID.
        preferred_channel: Override the channel (skip fallback chain).

    Returns:
        Dict with status, channel used, message_id, and attempt count.
    """

    # Determine channel order
    if preferred_channel:
        channels = [preferred_channel]
    elif client.preferred_channel:
        # Client's preferred channel first, then fallback chain
        channels = [client.preferred_channel] + [
            channel for channel in CHANNEL_ORDER if channel != client.preferred_channel
        ]
    else:
        channels = CHANNEL_ORDER.copy()

    # Resolve recipient address for each channel type
    def resolve_recipient(channel_name: str) -> str | None:
        if channel_name == "viber":
            return client.viber_id or client.phone
        elif channel_name == "whatsapp":
            return client.whatsapp_phone or client.phone
        elif channel_name == "sms":
            return client.phone
        elif channel_name == "email":
            return client.email
        return None

    # Try each channel in order
    for attempt_number, channel_name in enumerate(channels, 1):
        recipient = resolve_recipient(channel_name)
        if not recipient:
            continue

        # Check if channel is enabled for this business
        if not business.notification_channels.get(channel_name, False):
            continue

        # For email, use the email-specific sender; for others, use Infobip
        if channel_name == "email":
            sender_email = business.email or f"noreply@bookingcrm.ro"
            result = await _send_email_via_infobip(
                recipient_email=recipient,
                subject=f"Notificare de la {business.name}",
                html_body=f"<p>{content.replace(chr(10), '<br>')}</p>",
                sender_email=sender_email,
                sender_name=business.name,
            )
        else:
            result = await _send_via_infobip(
                channel=channel_name,
                recipient=recipient,
                content=content,
                sender=settings.INFOBIP_SENDER,
            )

        # Log the attempt in the database
        notification_log = NotificationLog(
            business_id=business.id,
            appointment_id=appointment_id,
            client_id=client.id,
            channel=channel_name,
            message_type=message_type,
            recipient=recipient,
            content=content,
            status="sent" if result["success"] else "failed",
            provider_message_id=result.get("message_id"),
            error_message=result.get("error"),
            fallback_from=channels[0] if attempt_number > 1 else None,
            attempt_number=attempt_number,
        )
        db.add(notification_log)
        await db.flush()

        if result["success"]:
            return {
                "status": "sent",
                "channel": channel_name,
                "message_id": result.get("message_id"),
                "attempt": attempt_number,
            }

        logger.warning(
            "Failed to send %s via %s to %s: %s",
            message_type, channel_name, recipient, result.get("error"),
        )

    return {"status": "failed", "error": "Toate canalele de notificare au esuat"}


async def send_invoice_notification(
    db: AsyncSession,
    business: Business,
    client: Client,
    invoice: "Invoice",
    pdf_bytes: bytes,
) -> dict:
    """Send an invoice PDF to a client via WhatsApp (preferred) or email fallback.

    This is a specialized notification path for invoices that need PDF attachment.
    Channel priority for invoice delivery:
    1. WhatsApp with PDF document attachment
    2. Email with PDF attachment
    3. SMS with text-only (no attachment possible, just a notification)

    Args:
        db: Database session for logging.
        business: The business sending the invoice.
        client: The client receiving the invoice.
        invoice: The Invoice model instance.
        pdf_bytes: The generated PDF as bytes.

    Returns:
        Dict with status, channel, and message_id.
    """
    invoice_number_display = f"{invoice.series}{invoice.number:06d}"
    pdf_filename = f"factura_{invoice_number_display}.pdf"

    # Build the notification text
    invoice_text = format_invoice_notification(
        business_name=business.name,
        invoice_number=invoice_number_display,
        total=invoice.total,
        currency=invoice.currency,
    )

    # Invoice delivery channel priority: whatsapp (with PDF) -> email (with PDF) -> sms (text only)
    # This differs from standard messaging since we want to deliver the PDF
    invoice_channels = ["whatsapp", "email", "sms"]

    # Respect client preferences if they have one among the invoice channels
    if client.preferred_channel in invoice_channels:
        invoice_channels.remove(client.preferred_channel)
        invoice_channels.insert(0, client.preferred_channel)

    for attempt_number, channel_name in enumerate(invoice_channels, 1):
        # Resolve recipient for this channel
        if channel_name == "whatsapp":
            recipient = client.whatsapp_phone or client.phone
        elif channel_name == "email":
            recipient = client.email
        elif channel_name == "sms":
            recipient = client.phone
        else:
            continue

        if not recipient:
            continue

        # Check if channel is enabled
        if not business.notification_channels.get(channel_name, False):
            continue

        result: dict

        if channel_name == "whatsapp":
            # Send WhatsApp with PDF attachment
            result = await _send_whatsapp_document(
                recipient=recipient,
                caption=invoice_text,
                pdf_bytes=pdf_bytes,
                filename=pdf_filename,
                sender=settings.INFOBIP_SENDER,
            )
        elif channel_name == "email":
            # Send email with PDF attachment
            sender_email = business.email or "noreply@bookingcrm.ro"
            email_html_body = _build_invoice_email_html(
                business_name=business.name,
                invoice_number=invoice_number_display,
                total=invoice.total,
                currency=invoice.currency,
                buyer_name=invoice.buyer_name,
            )
            result = await _send_email_via_infobip(
                recipient_email=recipient,
                subject=f"Factura {invoice_number_display} de la {business.name}",
                html_body=email_html_body,
                sender_email=sender_email,
                sender_name=business.name,
                pdf_bytes=pdf_bytes,
                pdf_filename=pdf_filename,
            )
        elif channel_name == "sms":
            # SMS: text only, no attachment possible
            sms_text = (
                f"Factura {invoice_number_display} de la {business.name}: "
                f"{invoice.total:.2f} {invoice.currency}. "
                f"Veti primi factura pe email."
            )
            result = await _send_via_infobip(
                channel="sms",
                recipient=recipient,
                content=sms_text,
                sender=settings.INFOBIP_SENDER,
            )
        else:
            continue

        # Log the attempt
        notification_log = NotificationLog(
            business_id=business.id,
            client_id=client.id,
            channel=channel_name,
            message_type="invoice",
            recipient=recipient,
            content=invoice_text,
            status="sent" if result["success"] else "failed",
            provider_message_id=result.get("message_id"),
            error_message=result.get("error"),
            fallback_from=invoice_channels[0] if attempt_number > 1 else None,
            attempt_number=attempt_number,
        )
        db.add(notification_log)
        await db.flush()

        if result["success"]:
            logger.info(
                "Invoice %s sent via %s to client %d",
                invoice_number_display, channel_name, client.id,
            )
            return {
                "status": "sent",
                "channel": channel_name,
                "message_id": result.get("message_id"),
                "attempt": attempt_number,
            }

        logger.warning(
            "Failed to send invoice %s via %s to %s: %s",
            invoice_number_display, channel_name, recipient, result.get("error"),
        )

    return {
        "status": "failed",
        "error": "Factura nu a putut fi trimisa pe niciun canal",
    }


def _build_invoice_email_html(
    business_name: str,
    invoice_number: str,
    total: float,
    currency: str,
    buyer_name: str,
) -> str:
    """Build an HTML email body for invoice delivery.

    Uses the brand colors (navy #0f172a, blue #2563eb) and clean Romanian text.
    """
    total_formatted = f"{total:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

    return f"""
    <!DOCTYPE html>
    <html lang="ro">
    <head><meta charset="UTF-8"></head>
    <body style="font-family: 'Inter', Arial, sans-serif; color: #1e293b; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; padding: 30px 20px;">
            <div style="text-align: center; padding: 20px 0; border-bottom: 3px solid #0f172a;">
                <h1 style="color: #0f172a; font-size: 20px; margin: 0;">{business_name}</h1>
            </div>

            <div style="padding: 25px 0;">
                <p style="font-size: 15px; margin-bottom: 15px;">
                    Buna ziua, <strong>{buyer_name}</strong>,
                </p>
                <p style="font-size: 14px; margin-bottom: 20px;">
                    Va trimitem atasat factura <strong style="color: #2563eb;">{invoice_number}</strong>
                    in valoare de <strong>{total_formatted} {currency}</strong>.
                </p>

                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
                            padding: 16px; margin-bottom: 20px;">
                    <table style="width: 100%; font-size: 14px;">
                        <tr>
                            <td style="padding: 4px 0; color: #64748b;">Numar factura:</td>
                            <td style="padding: 4px 0; text-align: right; font-weight: 600;">{invoice_number}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; color: #64748b;">Total de plata:</td>
                            <td style="padding: 4px 0; text-align: right; font-weight: 700; color: #0f172a;
                                       font-size: 16px;">{total_formatted} {currency}</td>
                        </tr>
                    </table>
                </div>

                <p style="font-size: 13px; color: #64748b;">
                    Factura este atasata in format PDF la acest email.
                    Daca aveti intrebari, nu ezitati sa ne contactati.
                </p>
            </div>

            <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center;">
                <p style="font-size: 11px; color: #94a3b8; margin: 0;">
                    Acest email a fost trimis automat de {business_name} prin BookingCRM.
                </p>
            </div>
        </div>
    </body>
    </html>
    """


# --------------------------------------------------------------------------
# Message formatting templates (Romanian)
# --------------------------------------------------------------------------

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


def format_cancellation(
    business_name: str,
    service_name: str,
    start_time: datetime,
    cancelled_by: str,
) -> str:
    """Format a cancellation notification in Romanian."""
    time_str = start_time.strftime("%d.%m.%Y la %H:%M")
    if cancelled_by == "client":
        return (
            f"Programarea ta la {business_name} a fost anulata conform cererii tale.\n\n"
            f"Serviciu: {service_name}\n"
            f"Data initiala: {time_str}\n\n"
            f"Te asteptam cu o noua programare oricand!"
        )
    else:
        return (
            f"Programarea ta la {business_name} a fost anulata.\n\n"
            f"Serviciu: {service_name}\n"
            f"Data initiala: {time_str}\n\n"
            f"Ne cerem scuze pentru inconvenient. Te rugam sa reprogramezi."
        )


def format_no_show_followup(
    business_name: str,
    service_name: str,
    start_time: datetime,
) -> str:
    """Format a no-show follow-up message in Romanian."""
    time_str = start_time.strftime("%d.%m.%Y la %H:%M")
    return (
        f"Am observat ca nu ai ajuns la programarea de la {business_name}.\n\n"
        f"Serviciu: {service_name}\n"
        f"Data: {time_str}\n\n"
        f"Sper ca totul este bine! Te rugam sa ne contactezi "
        f"daca doresti sa reprogramezi."
    )


def format_review_request(
    business_name: str,
    service_name: str,
) -> str:
    """Format a review request message in Romanian."""
    return (
        f"Multumim ca ai ales {business_name}!\n\n"
        f"Serviciu: {service_name}\n\n"
        f"Ne-ar face placere sa ne lasi o recenzie. "
        f"Parerea ta ne ajuta sa ne imbunatatim serviciile. Multumim!"
    )


def format_invoice_notification(
    business_name: str,
    invoice_number: str,
    total: float,
    currency: str,
) -> str:
    """Format an invoice notification message in Romanian."""
    total_formatted = f"{total:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return (
        f"Factura {invoice_number} de la {business_name}\n\n"
        f"Total de plata: {total_formatted} {currency}\n\n"
        f"Factura este atasata in format PDF."
    )
