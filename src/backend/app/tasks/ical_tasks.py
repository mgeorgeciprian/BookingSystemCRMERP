"""Celery tasks for iCal sync."""

import asyncio
import logging

from app.core.database import AsyncSessionLocal
from app.services.ical_sync import sync_all_sources
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.ical_tasks.sync_all_ical_sources")
def sync_all_ical_sources():
    asyncio.run(_sync())


async def _sync():
    async with AsyncSessionLocal() as db:
        await sync_all_sources(db)
