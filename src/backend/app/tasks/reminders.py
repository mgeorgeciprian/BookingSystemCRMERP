"""Celery tasks for appointment reminders and no-show detection."""

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, select

from app.core.database import AsyncSessionLocal
from app.models.appointment import Appointment
from app.models.business import Business
from app.models.client import Client
from app.models.employee import Employee
from app.models.service import Service
from app.services.notification import format_reminder, send_message
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


async def _send_reminders(hours_before: int):
    """Send reminders for appointments happening in `hours_before` hours."""
    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)
        window_start = now + timedelta(hours=hours_before - 0.5)
        window_end = now + timedelta(hours=hours_before + 0.5)

        result = await db.execute(
            select(Appointment).where(
                and_(
                    Appointment.status.in_(["pending", "confirmed"]),
                    Appointment.start_time >= window_start,
                    Appointment.start_time < window_end,
                )
            )
        )
        appointments = result.scalars().all()

        for apt in appointments:
            try:
                business = await db.get(Business, apt.business_id)
                client = await db.get(Client, apt.client_id) if apt.client_id else None
                service = await db.get(Service, apt.service_id)

                if not client or not business or not service:
                    continue

                content = format_reminder(
                    business_name=business.name,
                    service_name=service.name,
                    start_time=apt.start_time,
                    hours_before=hours_before,
                )

                await send_message(
                    db=db,
                    business=business,
                    client=client,
                    message_type=f"reminder_{hours_before}h",
                    content=content,
                    appointment_id=apt.id,
                )
            except Exception as e:
                logger.error("Failed to send reminder for appointment %d: %s", apt.id, e)

        await db.commit()


async def _mark_no_shows():
    """Mark appointments from yesterday that are still 'confirmed' as no_show."""
    async with AsyncSessionLocal() as db:
        yesterday = datetime.now(timezone.utc) - timedelta(days=1)
        yesterday_start = yesterday.replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday_end = yesterday_start + timedelta(days=1)

        result = await db.execute(
            select(Appointment).where(
                and_(
                    Appointment.status == "confirmed",
                    Appointment.start_time >= yesterday_start,
                    Appointment.start_time < yesterday_end,
                )
            )
        )

        for apt in result.scalars().all():
            apt.status = "no_show"
            # Update client no-show count
            if apt.client_id:
                client = await db.get(Client, apt.client_id)
                if client:
                    client.no_show_count += 1

        await db.commit()


@celery_app.task(name="app.tasks.reminders.send_upcoming_reminders")
def send_upcoming_reminders(hours_before: int):
    asyncio.run(_send_reminders(hours_before))


@celery_app.task(name="app.tasks.reminders.mark_no_shows")
def mark_no_shows():
    asyncio.run(_mark_no_shows())
