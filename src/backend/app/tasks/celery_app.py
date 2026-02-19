"""Celery app configuration for background tasks."""

from celery import Celery
from celery.schedules import crontab

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "bookingcrm",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.tasks.reminders",
        "app.tasks.ical_tasks",
        "app.tasks.invoice_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Europe/Bucharest",
    enable_utc=True,
)

# Periodic tasks
celery_app.conf.beat_schedule = {
    # Send 24h reminders every hour
    "send-24h-reminders": {
        "task": "app.tasks.reminders.send_upcoming_reminders",
        "schedule": crontab(minute=0),  # Every hour at :00
        "args": (24,),
    },
    # Send 1h reminders every 15 minutes
    "send-1h-reminders": {
        "task": "app.tasks.reminders.send_upcoming_reminders",
        "schedule": crontab(minute="*/15"),
        "args": (1,),
    },
    # Sync iCal sources every 15 minutes
    "sync-ical-sources": {
        "task": "app.tasks.ical_tasks.sync_all_ical_sources",
        "schedule": crontab(minute="*/15"),
    },
    # Mark no-shows daily at midnight
    "mark-noshows": {
        "task": "app.tasks.reminders.mark_no_shows",
        "schedule": crontab(hour=0, minute=30),
    },
}
