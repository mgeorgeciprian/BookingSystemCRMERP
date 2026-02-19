"""Dashboard statistics endpoint -- aggregated metrics for business owners."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, func, select, extract
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.appointment import Appointment
from app.models.business import Business
from app.models.client import Client
from app.models.notification import NotificationLog
from app.models.service import Service
from app.models.user import User

router = APIRouter()

RO_MONTHS = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Nov", "Dec"]


async def _get_owned_business(business_id: int, user: User, db: AsyncSession) -> Business:
    result = await db.execute(
        select(Business).where(Business.id == business_id, Business.owner_id == user.id)
    )
    biz = result.scalar_one_or_none()
    if not biz:
        raise HTTPException(status_code=404, detail="Afacere negasita")
    return biz


@router.get("/")
async def get_dashboard_stats(
    business_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Compute aggregated dashboard statistics."""
    await _get_owned_business(business_id, user, db)

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    # Week boundaries (Monday to Sunday)
    days_since_monday = now.weekday()
    week_start = (now - timedelta(days=days_since_monday)).replace(hour=0, minute=0, second=0, microsecond=0)
    week_end = week_start + timedelta(days=7)

    # Month boundaries
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if now.month == 12:
        month_end = now.replace(year=now.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        month_end = now.replace(month=now.month + 1, day=1, hour=0, minute=0, second=0, microsecond=0)

    biz_filter = Appointment.business_id == business_id

    # === TODAY STATS ===
    today_result = await db.execute(
        select(
            func.count(Appointment.id).label("total"),
            func.count(Appointment.id).filter(Appointment.status == "completed").label("completed"),
            func.count(Appointment.id).filter(Appointment.status == "in_progress").label("in_progress"),
            func.count(Appointment.id).filter(Appointment.status == "confirmed").label("confirmed"),
            func.count(Appointment.id).filter(Appointment.status == "pending").label("pending"),
            func.coalesce(func.sum(Appointment.final_price).filter(Appointment.status == "completed"), 0).label("revenue_today"),
            func.coalesce(func.sum(Appointment.final_price).filter(Appointment.status.notin_(["cancelled"])), 0).label("revenue_expected"),
        ).where(
            biz_filter,
            Appointment.start_time >= today_start,
            Appointment.start_time < today_end,
        )
    )
    today_row = today_result.one()

    # === WEEK STATS ===
    week_apt_result = await db.execute(
        select(
            func.count(Appointment.id).label("appointments"),
            func.coalesce(func.sum(Appointment.final_price).filter(Appointment.status == "completed"), 0).label("revenue"),
            func.count(Appointment.id).filter(Appointment.status == "no_show").label("no_shows"),
        ).where(
            biz_filter,
            Appointment.start_time >= week_start,
            Appointment.start_time < week_end,
        )
    )
    week_row = week_apt_result.one()

    week_new_clients = await db.execute(
        select(func.count(Client.id)).where(
            Client.business_id == business_id,
            Client.created_at >= week_start,
            Client.created_at < week_end,
        )
    )
    week_new_clients_count = week_new_clients.scalar() or 0

    # === MONTH STATS ===
    month_apt_result = await db.execute(
        select(
            func.count(Appointment.id).label("appointments"),
            func.coalesce(func.sum(Appointment.final_price).filter(Appointment.status == "completed"), 0).label("revenue"),
            func.count(Appointment.id).filter(Appointment.status == "no_show").label("no_shows"),
            func.count(Appointment.id).filter(Appointment.status == "completed").label("completed_count"),
            func.count(Appointment.id).filter(Appointment.status.notin_(["cancelled"])).label("non_cancelled"),
            func.count(Appointment.id).filter(Appointment.status.in_(["completed", "in_progress"])).label("served"),
        ).where(
            biz_filter,
            Appointment.start_time >= month_start,
            Appointment.start_time < month_end,
        )
    )
    month_row = month_apt_result.one()

    month_new_clients = await db.execute(
        select(func.count(Client.id)).where(
            Client.business_id == business_id,
            Client.created_at >= month_start,
            Client.created_at < month_end,
        )
    )
    month_new_clients_count = month_new_clients.scalar() or 0

    month_revenue = float(month_row.revenue)
    month_completed = int(month_row.completed_count)
    month_non_cancelled = int(month_row.non_cancelled)
    month_served = int(month_row.served)
    avg_ticket = round(month_revenue / month_completed, 2) if month_completed > 0 else 0
    occupancy_rate = round((month_served / month_non_cancelled) * 100) if month_non_cancelled > 0 else 0

    # === TOTAL STATS ===
    total_clients = await db.execute(
        select(func.count(Client.id)).where(Client.business_id == business_id)
    )
    total_apt_result = await db.execute(
        select(
            func.count(Appointment.id).label("appointments"),
            func.coalesce(func.sum(Appointment.final_price).filter(Appointment.status == "completed"), 0).label("revenue"),
            func.count(Appointment.id).filter(Appointment.status == "no_show").label("no_shows"),
        ).where(biz_filter)
    )
    total_row = total_apt_result.one()

    # === REVENUE CHART (last 6 months) ===
    revenue_chart = []
    for i in range(5, -1, -1):
        chart_date = now - timedelta(days=30 * i)
        chart_month_start = chart_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if chart_date.month == 12:
            chart_month_end = chart_date.replace(year=chart_date.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            chart_month_end = chart_date.replace(month=chart_date.month + 1, day=1, hour=0, minute=0, second=0, microsecond=0)

        rev_result = await db.execute(
            select(
                func.coalesce(func.sum(Appointment.final_price).filter(Appointment.status == "completed"), 0)
            ).where(
                biz_filter,
                Appointment.start_time >= chart_month_start,
                Appointment.start_time < chart_month_end,
            )
        )
        month_rev = float(rev_result.scalar() or 0)
        revenue_chart.append({
            "month": RO_MONTHS[chart_month_start.month - 1],
            "revenue": round(month_rev, 2),
        })

    # === TOP SERVICES (this month, top 5) ===
    top_svc_result = await db.execute(
        select(
            Service.name,
            func.count(Appointment.id).label("count"),
            func.coalesce(func.sum(Appointment.final_price), 0).label("revenue"),
        )
        .join(Service, Appointment.service_id == Service.id)
        .where(
            biz_filter,
            Appointment.start_time >= month_start,
            Appointment.start_time < month_end,
            Appointment.status.notin_(["cancelled"]),
        )
        .group_by(Service.name)
        .order_by(func.count(Appointment.id).desc())
        .limit(5)
    )
    top_services = [
        {"name": row.name, "count": int(row.count), "revenue": round(float(row.revenue), 2)}
        for row in top_svc_result.all()
    ]

    # === CHANNEL BREAKDOWN (this month) ===
    channel_result = await db.execute(
        select(
            NotificationLog.channel,
            func.count(NotificationLog.id).label("count"),
            func.coalesce(func.sum(NotificationLog.cost), 0).label("cost"),
        )
        .where(
            NotificationLog.business_id == business_id,
            NotificationLog.created_at >= month_start,
            NotificationLog.created_at < month_end,
        )
        .group_by(NotificationLog.channel)
        .order_by(func.count(NotificationLog.id).desc())
    )
    channel_breakdown = [
        {"channel": row.channel.capitalize(), "count": int(row.count), "cost": round(float(row.cost), 2)}
        for row in channel_result.all()
    ]

    return {
        "today": {
            "appointments": int(today_row.total),
            "completed": int(today_row.completed),
            "in_progress": int(today_row.in_progress),
            "confirmed": int(today_row.confirmed),
            "pending": int(today_row.pending),
            "revenue_today": round(float(today_row.revenue_today), 2),
            "revenue_expected": round(float(today_row.revenue_expected), 2),
        },
        "week": {
            "appointments": int(week_row.appointments),
            "revenue": round(float(week_row.revenue), 2),
            "new_clients": week_new_clients_count,
            "no_shows": int(week_row.no_shows),
        },
        "month": {
            "appointments": int(month_row.appointments),
            "revenue": round(month_revenue, 2),
            "new_clients": month_new_clients_count,
            "no_shows": int(month_row.no_shows),
            "avg_ticket": avg_ticket,
            "occupancy_rate": occupancy_rate,
        },
        "total": {
            "clients": total_clients.scalar() or 0,
            "revenue": round(float(total_row.revenue), 2),
            "appointments": int(total_row.appointments),
            "no_shows": int(total_row.no_shows),
        },
        "revenue_chart": revenue_chart,
        "top_services": top_services,
        "channel_breakdown": channel_breakdown,
    }
