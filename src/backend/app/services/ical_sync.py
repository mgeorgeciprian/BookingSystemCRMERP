"""iCal sync service -- imports events from Airbnb/Booking.com/Google Calendar.

Syncs external calendars by:
1. Fetching iCal feed URL
2. Parsing VEVENT entries (handling platform-specific quirks)
3. Creating/updating blocked appointments for the assigned employee
4. Removing events that no longer exist in the feed

Platform-specific handling:
- Airbnb: Uses X-AIRBNB-LISTING-ID, all-day events with DTSTART;VALUE=DATE,
  summary format "Reserved - XXXX", "Airbnb (Not available)", etc.
- Booking.com: Uses PRODID:-//Booking.com, guest name in SUMMARY,
  reference in DESCRIPTION, also all-day DATE format.
- Google Calendar: Standard RFC 5545 with timezone support (TZID).

Enhanced with:
- Retry logic for transient network failures
- Feed content validation before parsing
- Detailed error tracking per-event
- Skip events that are in the past (configurable)
- iCal export (generate RFC 5545 for our appointments)
"""

import logging
import re
from datetime import date, datetime, timedelta, timezone
from typing import Any

import httpx
from icalendar import Calendar, Event as ICalEvent
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment
from app.models.ical_source import ICalSource

logger = logging.getLogger(__name__)

# Maximum number of retries for fetching iCal feeds
ICAL_FETCH_MAX_RETRIES = 3
ICAL_FETCH_TIMEOUT = 30

# How far in the past to keep synced events (days)
ICAL_PAST_EVENT_RETENTION_DAYS = 7

# Known iCal producers and their quirks
KNOWN_PRODUCERS = {
    "airbnb": {"id_pattern": r"airbnb", "date_format": "date"},
    "booking_com": {"id_pattern": r"booking\.com", "date_format": "date"},
    "google": {"id_pattern": r"google", "date_format": "datetime"},
}


async def fetch_ical_feed(url: str) -> str | None:
    """Fetch iCal feed content from URL with retry logic.

    Retries up to ICAL_FETCH_MAX_RETRIES times for transient errors
    (network timeouts, 5xx responses). Does not retry on 4xx errors.

    Args:
        url: The iCal feed URL to fetch.

    Returns:
        Raw iCal text content, or None if all retries failed.
    """
    last_error: str | None = None

    for attempt in range(1, ICAL_FETCH_MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(
                timeout=ICAL_FETCH_TIMEOUT,
                follow_redirects=True,
            ) as http_client:
                resp = await http_client.get(url, headers={
                    "User-Agent": "BookingCRM-iCal-Sync/1.0",
                    "Accept": "text/calendar, application/ics, text/plain",
                })

                if resp.status_code == 200:
                    content = resp.text

                    # Basic validation: must contain VCALENDAR
                    if "BEGIN:VCALENDAR" not in content:
                        logger.warning(
                            "iCal feed %s returned non-calendar content (attempt %d/%d)",
                            url, attempt, ICAL_FETCH_MAX_RETRIES,
                        )
                        last_error = "Feed-ul nu contine date calendar valide (VCALENDAR lipseste)"
                        continue

                    return content

                elif 400 <= resp.status_code < 500:
                    # Client error: do not retry
                    logger.error(
                        "iCal feed %s returned client error %d, not retrying",
                        url, resp.status_code,
                    )
                    return None

                else:
                    # Server error: retry
                    last_error = f"HTTP {resp.status_code}"
                    logger.warning(
                        "iCal feed %s returned %d (attempt %d/%d)",
                        url, resp.status_code, attempt, ICAL_FETCH_MAX_RETRIES,
                    )

        except httpx.TimeoutException:
            last_error = "Timeout la descarcarea feed-ului"
            logger.warning(
                "Timeout fetching iCal feed %s (attempt %d/%d)",
                url, attempt, ICAL_FETCH_MAX_RETRIES,
            )
        except httpx.HTTPError as http_error:
            last_error = str(http_error)
            logger.warning(
                "HTTP error fetching iCal feed %s: %s (attempt %d/%d)",
                url, http_error, attempt, ICAL_FETCH_MAX_RETRIES,
            )

    logger.error(
        "Failed to fetch iCal feed %s after %d attempts: %s",
        url, ICAL_FETCH_MAX_RETRIES, last_error,
    )
    return None


def _detect_source_type(cal: Calendar) -> str:
    """Detect the iCal feed source (airbnb, booking_com, google, other).

    Uses the PRODID and X- properties to identify the source platform.
    """
    prodid = str(cal.get("PRODID", "")).lower()

    if "airbnb" in prodid:
        return "airbnb"
    elif "booking.com" in prodid:
        return "booking_com"
    elif "google" in prodid:
        return "google"

    # Check X- properties of first event
    for component in cal.walk():
        if component.name == "VEVENT":
            if component.get("X-AIRBNB-LISTING-ID"):
                return "airbnb"
            uid = str(component.get("UID", "")).lower()
            if "airbnb" in uid:
                return "airbnb"
            if "booking.com" in uid:
                return "booking_com"
            break

    return "other"


def _normalize_datetime(dt_value: Any, source_type: str = "other") -> datetime | None:
    """Normalize a DTSTART/DTEND value to a timezone-aware UTC datetime.

    Handles:
    - date objects (all-day events from Airbnb/Booking.com)
    - datetime with timezone
    - datetime without timezone (naive, assumed UTC)
    """
    if dt_value is None:
        return None

    dt = dt_value.dt if hasattr(dt_value, "dt") else dt_value

    if isinstance(dt, datetime):
        # Already a datetime; ensure timezone-aware
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    elif isinstance(dt, date):
        # All-day event (common with Airbnb/Booking.com)
        # For DTSTART: start of day (00:00 UTC)
        # For DTEND: end of previous day (23:59 UTC) -- handled by caller
        return datetime(dt.year, dt.month, dt.day, 0, 0, tzinfo=timezone.utc)

    else:
        logger.warning("Unexpected dt type: %s for value %s", type(dt), dt)
        return None


def _extract_guest_info(component: Any, source_type: str) -> dict[str, str]:
    """Extract guest/booking info from event properties based on source platform.

    Returns dict with keys: summary, guest_name, booking_reference, platform_id
    """
    summary = str(component.get("SUMMARY", "Blocked"))
    description = str(component.get("DESCRIPTION", ""))
    info: dict[str, str] = {
        "summary": summary,
        "guest_name": "",
        "booking_reference": "",
        "platform_id": "",
    }

    if source_type == "airbnb":
        # Airbnb summaries: "Reserved - John D", "Airbnb (Not available)", "Blocked"
        if summary.startswith("Reserved"):
            # Extract guest name from "Reserved - John D"
            parts = summary.split(" - ", 1)
            if len(parts) > 1:
                info["guest_name"] = parts[1].strip()
        # Airbnb confirmation code may be in description
        confirmation_match = re.search(r"Reservation code:\s*(\w+)", description)
        if confirmation_match:
            info["booking_reference"] = confirmation_match.group(1)
        # Check for listing ID
        airbnb_listing = component.get("X-AIRBNB-LISTING-ID")
        if airbnb_listing:
            info["platform_id"] = str(airbnb_listing)

    elif source_type == "booking_com":
        # Booking.com: Guest name usually in SUMMARY
        # Description often has: "BOOKING REFERENCE: 12345\nPhone: +40...\n..."
        if summary and summary.lower() not in ("closed", "not available"):
            info["guest_name"] = summary
        ref_match = re.search(r"(?:BOOKING REFERENCE|Reservation ID):\s*(\w+)", description)
        if ref_match:
            info["booking_reference"] = ref_match.group(1)
        phone_match = re.search(r"Phone:\s*(\+?\d[\d\s-]+)", description)
        if phone_match:
            info["booking_reference"] += f" | Tel: {phone_match.group(1).strip()}"

    return info


def parse_ical_events(
    ical_text: str,
    skip_past_events: bool = True,
    past_retention_days: int = ICAL_PAST_EVENT_RETENTION_DAYS,
) -> list[dict]:
    """Parse iCal text and extract events with platform-specific handling.

    Args:
        ical_text: Raw iCal feed content.
        skip_past_events: If True, skip events that ended more than
            past_retention_days ago.
        past_retention_days: Number of days to keep past events.

    Returns:
        List of event dicts with keys: uid, summary, start, end,
        duration_minutes, guest_info, source_type.
    """
    try:
        cal = Calendar.from_ical(ical_text)
    except Exception as parse_error:
        logger.error("Failed to parse iCal content: %s", parse_error)
        raise ValueError(f"Format iCal invalid: {parse_error}") from parse_error

    source_type = _detect_source_type(cal)
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=past_retention_days)
    events: list[dict] = []
    parse_errors: list[str] = []

    for component in cal.walk():
        if component.name != "VEVENT":
            continue

        uid = str(component.get("UID", ""))
        if not uid:
            parse_errors.append("Event fara UID -- ignorat")
            continue

        dtstart = component.get("DTSTART")
        dtend = component.get("DTEND")

        if not dtstart:
            parse_errors.append(f"Event {uid}: DTSTART lipseste -- ignorat")
            continue

        start = _normalize_datetime(dtstart, source_type)
        if start is None:
            parse_errors.append(f"Event {uid}: DTSTART invalid -- ignorat")
            continue

        # Handle missing DTEND
        if dtend:
            end = _normalize_datetime(dtend, source_type)
        else:
            # If DTEND is missing, check DURATION property
            duration_prop = component.get("DURATION")
            if duration_prop:
                end = start + duration_prop.dt
            else:
                # Default: 1 hour for timed events, end of day for all-day events
                dt_raw = dtstart.dt if hasattr(dtstart, "dt") else dtstart
                if isinstance(dt_raw, date) and not isinstance(dt_raw, datetime):
                    end = start + timedelta(days=1)
                else:
                    end = start + timedelta(hours=1)

        if end is None:
            parse_errors.append(f"Event {uid}: DTEND invalid -- ignorat")
            continue

        # For Airbnb/Booking.com all-day events, DTEND is actually the checkout date
        # (exclusive). For example, check-in Jan 5, check-out Jan 8 means:
        # DTSTART=20240105, DTEND=20240108 (guest leaves on Jan 8)
        # We keep the end as-is since the date itself represents checkout day start.
        # The slot is blocked from start (00:00) to end (00:00 of checkout day).

        # Skip events that are too far in the past
        if skip_past_events and end < cutoff_date:
            continue

        # Calculate duration
        duration_seconds = (end - start).total_seconds()
        duration_minutes = max(int(duration_seconds / 60), 1)  # Minimum 1 minute

        # Extract guest/booking info
        guest_info = _extract_guest_info(component, source_type)
        summary = guest_info["summary"]

        events.append({
            "uid": uid,
            "summary": summary,
            "start": start,
            "end": end,
            "duration_minutes": duration_minutes,
            "guest_info": guest_info,
            "source_type": source_type,
        })

    if parse_errors:
        logger.warning(
            "iCal parse had %d warnings: %s",
            len(parse_errors),
            "; ".join(parse_errors[:5]),  # Log first 5 only
        )

    return events


async def sync_ical_source(db: AsyncSession, source: ICalSource) -> dict:
    """Sync a single iCal source. Returns sync result details.

    Args:
        db: Async database session.
        source: The ICalSource to sync.

    Returns:
        Dict with keys: created, updated, deleted, errors, total_events.
    """
    sync_result = {
        "created": 0,
        "updated": 0,
        "deleted": 0,
        "errors": [],
        "total_events": 0,
    }

    ical_text = await fetch_ical_feed(source.ical_url)
    if not ical_text:
        error_message = "Eroare la descarcarea feed-ului iCal"
        source.last_sync_error = error_message
        source.last_synced_at = datetime.now(timezone.utc)
        sync_result["errors"].append(error_message)
        return sync_result

    try:
        events = parse_ical_events(ical_text)
    except (ValueError, Exception) as parse_error:
        error_message = f"Eroare la parsarea feed-ului iCal: {parse_error}"
        source.last_sync_error = error_message
        source.last_synced_at = datetime.now(timezone.utc)
        sync_result["errors"].append(error_message)
        return sync_result

    sync_result["total_events"] = len(events)

    # Get existing iCal-imported appointments for this source
    existing_query = select(Appointment).where(
        and_(
            Appointment.ical_source_id == source.id,
            Appointment.source == "ical_block",
        )
    )
    existing_result = await db.execute(existing_query)
    existing_appointments_by_uid = {
        appointment.ical_uid: appointment
        for appointment in existing_result.scalars().all()
    }

    synced_uids: set[str] = set()

    for event in events:
        uid = event["uid"]
        synced_uids.add(uid)

        # Build the internal notes with guest/booking info
        guest_info = event.get("guest_info", {})
        notes_parts = [f"iCal: {event['summary']}"]
        if guest_info.get("guest_name"):
            notes_parts.append(f"Oaspete: {guest_info['guest_name']}")
        if guest_info.get("booking_reference"):
            notes_parts.append(f"Referinta: {guest_info['booking_reference']}")
        internal_notes = " | ".join(notes_parts)

        if uid in existing_appointments_by_uid:
            # Update existing appointment
            existing_appointment = existing_appointments_by_uid[uid]
            changed = False

            if existing_appointment.start_time != event["start"]:
                existing_appointment.start_time = event["start"]
                changed = True
            if existing_appointment.end_time != event["end"]:
                existing_appointment.end_time = event["end"]
                changed = True
            if existing_appointment.duration_minutes != event["duration_minutes"]:
                existing_appointment.duration_minutes = event["duration_minutes"]
                changed = True
            if existing_appointment.internal_notes != internal_notes:
                existing_appointment.internal_notes = internal_notes
                changed = True

            if changed:
                sync_result["updated"] += 1
        else:
            # Create new blocked appointment
            employee_id = source.employee_id
            if not employee_id:
                sync_result["errors"].append(
                    f"Event {uid}: Sursa iCal nu are angajat asociat -- ignorat"
                )
                continue

            new_appointment = Appointment(
                business_id=source.business_id,
                employee_id=employee_id,
                service_id=None,  # No service for calendar blocks
                start_time=event["start"],
                end_time=event["end"],
                duration_minutes=event["duration_minutes"],
                status="confirmed",
                source="ical_block",
                ical_source_id=source.id,
                ical_uid=uid,
                internal_notes=internal_notes,
                price=0,
                final_price=0,
            )
            db.add(new_appointment)
            sync_result["created"] += 1

    # Remove events that no longer exist in the feed
    for uid, existing_appointment in existing_appointments_by_uid.items():
        if uid not in synced_uids:
            await db.delete(existing_appointment)
            sync_result["deleted"] += 1

    # Update source metadata
    source.last_synced_at = datetime.now(timezone.utc)
    source.last_sync_error = None if not sync_result["errors"] else "; ".join(sync_result["errors"][:3])
    source.events_count = len(events)

    logger.info(
        "iCal sync for source %d (%s): created=%d, updated=%d, deleted=%d, total=%d",
        source.id, source.name,
        sync_result["created"], sync_result["updated"],
        sync_result["deleted"], sync_result["total_events"],
    )

    return sync_result


async def sync_all_sources(db: AsyncSession) -> dict:
    """Sync all active iCal sources (called by Celery beat).

    Returns:
        Summary dict with per-source results.
    """
    result = await db.execute(
        select(ICalSource).where(ICalSource.is_active == True)
    )
    sources = result.scalars().all()

    summary = {
        "total_sources": len(sources),
        "synced": 0,
        "failed": 0,
        "results": {},
    }

    for source in sources:
        try:
            source_result = await sync_ical_source(db, source)
            summary["results"][source.id] = source_result
            if source_result["errors"]:
                summary["failed"] += 1
            else:
                summary["synced"] += 1
        except Exception as sync_error:
            logger.error("Failed to sync iCal source %d: %s", source.id, sync_error)
            source.last_sync_error = str(sync_error)
            summary["failed"] += 1
            summary["results"][source.id] = {"error": str(sync_error)}

    await db.commit()

    logger.info(
        "iCal sync complete: %d sources, %d synced, %d failed",
        summary["total_sources"], summary["synced"], summary["failed"],
    )
    return summary


def generate_ical_export(
    appointments: list[Appointment],
    business_name: str,
    business_slug: str,
) -> str:
    """Generate an RFC 5545 iCal feed for exporting appointments.

    This creates a VCALENDAR with VEVENT entries for each appointment,
    suitable for import into Airbnb, Booking.com, Google Calendar, etc.

    Args:
        appointments: List of Appointment models to export.
        business_name: The business name for the calendar title.
        business_slug: The business slug for UID generation.

    Returns:
        iCal text content as a string.
    """
    cal = Calendar()
    cal.add("PRODID", f"-//BookingCRM//{business_name}//RO")
    cal.add("VERSION", "2.0")
    cal.add("CALSCALE", "GREGORIAN")
    cal.add("METHOD", "PUBLISH")
    cal.add("X-WR-CALNAME", f"{business_name} - BookingCRM")
    cal.add("X-WR-TIMEZONE", "Europe/Bucharest")

    for appointment in appointments:
        event = ICalEvent()

        # Generate a stable UID for each appointment
        event_uid = f"apt-{appointment.id}@{business_slug}.bookingcrm.ro"
        event.add("UID", event_uid)

        event.add("DTSTART", appointment.start_time)
        event.add("DTEND", appointment.end_time)
        event.add("DTSTAMP", datetime.now(timezone.utc))

        # Summary: "Service - Client" or "Blocked" for iCal blocks
        if appointment.source == "ical_block":
            summary = "Not available"
        else:
            service_name = "Programare"
            if hasattr(appointment, "service") and appointment.service:
                service_name = appointment.service.name

            client_name = ""
            if hasattr(appointment, "client") and appointment.client:
                client_name = appointment.client.full_name
            elif appointment.walk_in_name:
                client_name = appointment.walk_in_name

            summary = f"{service_name}"
            if client_name:
                summary += f" - {client_name}"

        event.add("SUMMARY", summary)
        event.add("STATUS", "CONFIRMED" if appointment.status in ("confirmed", "in_progress") else "TENTATIVE")

        # Description with appointment details
        description_parts = [f"Status: {appointment.status}"]
        if appointment.internal_notes:
            description_parts.append(f"Note: {appointment.internal_notes}")
        event.add("DESCRIPTION", "\n".join(description_parts))

        # Make blocked times show as busy
        event.add("TRANSP", "OPAQUE")

        cal.add_component(event)

    return cal.to_ical().decode("utf-8")
