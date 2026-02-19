"""iCal sync service -- imports events from Airbnb/Booking.com/Google Calendar.

Syncs external calendars by:
1. Fetching iCal feed URL
2. Parsing VEVENT entries
3. Creating/updating blocked appointments for the assigned employee
4. Removing events that no longer exist in the feed
"""

import logging
from datetime import datetime, timezone

import httpx
from icalendar import Calendar
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment
from app.models.ical_source import ICalSource

logger = logging.getLogger(__name__)


async def fetch_ical_feed(url: str) -> str | None:
    """Fetch iCal feed content from URL."""
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.text
    except httpx.HTTPError as e:
        logger.error("Failed to fetch iCal feed %s: %s", url, e)
        return None


def parse_ical_events(ical_text: str) -> list[dict]:
    """Parse iCal text and extract events."""
    cal = Calendar.from_ical(ical_text)
    events = []

    for component in cal.walk():
        if component.name != "VEVENT":
            continue

        uid = str(component.get("uid", ""))
        summary = str(component.get("summary", "Blocked"))
        dtstart = component.get("dtstart")
        dtend = component.get("dtend")

        if not dtstart or not dtend:
            continue

        start = dtstart.dt
        end = dtend.dt

        # Convert date to datetime if needed (all-day events)
        if not isinstance(start, datetime):
            start = datetime(start.year, start.month, start.day, 0, 0, tzinfo=timezone.utc)
        if not isinstance(end, datetime):
            end = datetime(end.year, end.month, end.day, 23, 59, tzinfo=timezone.utc)

        # Ensure timezone-aware
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        if end.tzinfo is None:
            end = end.replace(tzinfo=timezone.utc)

        events.append({
            "uid": uid,
            "summary": summary,
            "start": start,
            "end": end,
            "duration_minutes": int((end - start).total_seconds() / 60),
        })

    return events


async def sync_ical_source(db: AsyncSession, source: ICalSource) -> int:
    """Sync a single iCal source. Returns number of events synced."""

    ical_text = await fetch_ical_feed(source.ical_url)
    if not ical_text:
        source.last_sync_error = "Failed to fetch iCal feed"
        source.last_synced_at = datetime.now(timezone.utc)
        return 0

    try:
        events = parse_ical_events(ical_text)
    except Exception as e:
        source.last_sync_error = f"Failed to parse iCal: {e}"
        source.last_synced_at = datetime.now(timezone.utc)
        return 0

    # Get existing ical-imported appointments for this source
    existing = await db.execute(
        select(Appointment).where(
            and_(
                Appointment.ical_source_id == source.id,
                Appointment.source == "ical_block",
            )
        )
    )
    existing_by_uid = {apt.ical_uid: apt for apt in existing.scalars().all()}

    synced_uids = set()
    count = 0

    for event in events:
        uid = event["uid"]
        synced_uids.add(uid)

        if uid in existing_by_uid:
            # Update existing
            apt = existing_by_uid[uid]
            apt.start_time = event["start"]
            apt.end_time = event["end"]
            apt.duration_minutes = event["duration_minutes"]
            apt.internal_notes = f"iCal: {event['summary']}"
        else:
            # Create new blocked appointment
            employee_id = source.employee_id
            if not employee_id:
                continue

            apt = Appointment(
                business_id=source.business_id,
                employee_id=employee_id,
                service_id=0,  # No service for blocks
                start_time=event["start"],
                end_time=event["end"],
                duration_minutes=event["duration_minutes"],
                status="confirmed",
                source="ical_block",
                ical_source_id=source.id,
                ical_uid=uid,
                internal_notes=f"iCal: {event['summary']}",
                price=0,
                final_price=0,
            )
            db.add(apt)
            count += 1

    # Remove events no longer in the feed
    for uid, apt in existing_by_uid.items():
        if uid not in synced_uids:
            await db.delete(apt)

    source.last_synced_at = datetime.now(timezone.utc)
    source.last_sync_error = None
    source.events_count = len(events)

    return count


async def sync_all_sources(db: AsyncSession):
    """Sync all active iCal sources (called by Celery beat)."""
    result = await db.execute(
        select(ICalSource).where(ICalSource.is_active == True)
    )
    sources = result.scalars().all()

    for source in sources:
        try:
            await sync_ical_source(db, source)
        except Exception as e:
            logger.error("Failed to sync iCal source %d: %s", source.id, e)
            source.last_sync_error = str(e)

    await db.commit()
