"""Reports & Analytics API -- detailed business intelligence for dashboard owners."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, case, func, select, extract, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.appointment import Appointment
from app.models.business import Business
from app.models.client import Client
from app.models.employee import Employee
from app.models.invoice import Invoice
from app.models.notification import NotificationLog
from app.models.service import Service
from app.models.user import User

router = APIRouter()

RO_MONTHS = [
    "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
    "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie",
]
RO_MONTHS_SHORT = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Nov", "Dec"]
RO_DAYS = ["Luni", "Marti", "Miercuri", "Joi", "Vineri", "Sambata", "Duminica"]


async def _get_owned_business(business_id: int, user: User, db: AsyncSession) -> Business:
    result = await db.execute(
        select(Business).where(Business.id == business_id, Business.owner_id == user.id)
    )
    biz = result.scalar_one_or_none()
    if not biz:
        raise HTTPException(status_code=404, detail="Afacere negasita")
    return biz


def _month_boundaries(year: int, month: int):
    """Return (start, end) datetime for a given month."""
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end = datetime(year, month + 1, 1, tzinfo=timezone.utc)
    return start, end


@router.get("/overview")
async def get_reports_overview(
    business_id: int,
    months: int = Query(default=6, ge=1, le=24, description="Number of months to include"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Comprehensive reports overview with multi-month analytics."""
    await _get_owned_business(business_id, user, db)

    now = datetime.now(timezone.utc)
    biz_filter = Appointment.business_id == business_id

    # --- Revenue & Appointments by month (last N months) ---
    monthly_data = []
    for i in range(months - 1, -1, -1):
        target_date = now - timedelta(days=30 * i)
        month_start, month_end = _month_boundaries(target_date.year, target_date.month)

        result = await db.execute(
            select(
                func.count(Appointment.id).label("total_appointments"),
                func.count(Appointment.id).filter(Appointment.status == "completed").label("completed"),
                func.count(Appointment.id).filter(Appointment.status == "cancelled").label("cancelled"),
                func.count(Appointment.id).filter(Appointment.status == "no_show").label("no_shows"),
                func.coalesce(
                    func.sum(Appointment.final_price).filter(Appointment.status == "completed"), 0
                ).label("revenue"),
            ).where(
                biz_filter,
                Appointment.start_time >= month_start,
                Appointment.start_time < month_end,
            )
        )
        row = result.one()
        monthly_data.append({
            "month": RO_MONTHS_SHORT[month_start.month - 1],
            "month_full": RO_MONTHS[month_start.month - 1],
            "year": month_start.year,
            "total_appointments": int(row.total_appointments),
            "completed": int(row.completed),
            "cancelled": int(row.cancelled),
            "no_shows": int(row.no_shows),
            "revenue": round(float(row.revenue), 2),
        })

    # --- Client growth by month ---
    client_growth = []
    for i in range(months - 1, -1, -1):
        target_date = now - timedelta(days=30 * i)
        month_start, month_end = _month_boundaries(target_date.year, target_date.month)

        new_clients_result = await db.execute(
            select(func.count(Client.id)).where(
                Client.business_id == business_id,
                Client.created_at >= month_start,
                Client.created_at < month_end,
            )
        )
        total_by_end = await db.execute(
            select(func.count(Client.id)).where(
                Client.business_id == business_id,
                Client.created_at < month_end,
            )
        )
        client_growth.append({
            "month": RO_MONTHS_SHORT[month_start.month - 1],
            "year": month_start.year,
            "new_clients": new_clients_result.scalar() or 0,
            "total_clients": total_by_end.scalar() or 0,
        })

    # --- Employee performance (current month) ---
    current_month_start, current_month_end = _month_boundaries(now.year, now.month)

    employee_perf_result = await db.execute(
        select(
            Employee.id,
            Employee.full_name,
            Employee.display_name,
            Employee.color,
            func.count(Appointment.id).label("total_appointments"),
            func.count(Appointment.id).filter(Appointment.status == "completed").label("completed"),
            func.count(Appointment.id).filter(Appointment.status == "no_show").label("no_shows"),
            func.count(Appointment.id).filter(Appointment.status == "cancelled").label("cancelled"),
            func.coalesce(
                func.sum(Appointment.final_price).filter(Appointment.status == "completed"), 0
            ).label("revenue"),
        )
        .join(Employee, Appointment.employee_id == Employee.id)
        .where(
            biz_filter,
            Appointment.start_time >= current_month_start,
            Appointment.start_time < current_month_end,
            Employee.is_active == True,
        )
        .group_by(Employee.id, Employee.full_name, Employee.display_name, Employee.color)
        .order_by(func.coalesce(func.sum(Appointment.final_price).filter(Appointment.status == "completed"), 0).desc())
    )
    employee_performance = []
    for row in employee_perf_result.all():
        total_appts = int(row.total_appointments)
        completed = int(row.completed)
        no_shows = int(row.no_shows)
        completion_rate = round((completed / total_appts) * 100) if total_appts > 0 else 0
        no_show_rate = round((no_shows / total_appts) * 100) if total_appts > 0 else 0
        employee_performance.append({
            "id": row.id,
            "name": row.display_name or row.full_name,
            "color": row.color,
            "total_appointments": total_appts,
            "completed": completed,
            "cancelled": int(row.cancelled),
            "no_shows": no_shows,
            "revenue": round(float(row.revenue), 2),
            "completion_rate": completion_rate,
            "no_show_rate": no_show_rate,
        })

    # --- Top services (current month) ---
    top_services_result = await db.execute(
        select(
            Service.id,
            Service.name,
            Service.color,
            func.count(Appointment.id).label("appointment_count"),
            func.coalesce(
                func.sum(Appointment.final_price).filter(Appointment.status == "completed"), 0
            ).label("revenue"),
            func.avg(Appointment.final_price).filter(Appointment.status == "completed").label("avg_price"),
        )
        .join(Service, Appointment.service_id == Service.id)
        .where(
            biz_filter,
            Appointment.start_time >= current_month_start,
            Appointment.start_time < current_month_end,
            Appointment.status.notin_(["cancelled"]),
        )
        .group_by(Service.id, Service.name, Service.color)
        .order_by(func.count(Appointment.id).desc())
        .limit(10)
    )
    top_services = [
        {
            "id": row.id,
            "name": row.name,
            "color": row.color,
            "appointment_count": int(row.appointment_count),
            "revenue": round(float(row.revenue), 2),
            "avg_price": round(float(row.avg_price), 2) if row.avg_price else 0,
        }
        for row in top_services_result.all()
    ]

    # --- Peak hours heatmap (current month, hour x day-of-week) ---
    peak_hours_result = await db.execute(
        select(
            extract("dow", Appointment.start_time).label("day_of_week"),
            extract("hour", Appointment.start_time).label("hour"),
            func.count(Appointment.id).label("count"),
        )
        .where(
            biz_filter,
            Appointment.start_time >= current_month_start,
            Appointment.start_time < current_month_end,
            Appointment.status.notin_(["cancelled"]),
        )
        .group_by("day_of_week", "hour")
        .order_by("day_of_week", "hour")
    )

    # Build a 7x24 grid (day x hour)
    peak_hours_grid = {}
    for row in peak_hours_result.all():
        # PostgreSQL DOW: 0=Sunday, 1=Monday, ... 6=Saturday
        # We want Monday=0, Sunday=6
        dow_pg = int(row.day_of_week)
        dow_mapped = (dow_pg - 1) % 7  # Mon=0, Tue=1, ..., Sun=6
        hour = int(row.hour)
        peak_hours_grid[(dow_mapped, hour)] = int(row.count)

    peak_hours = []
    for day_idx in range(7):
        for hour in range(7, 22):  # Business hours 07:00-21:00
            count = peak_hours_grid.get((day_idx, hour), 0)
            peak_hours.append({
                "day": RO_DAYS[day_idx],
                "day_index": day_idx,
                "hour": hour,
                "hour_label": f"{hour:02d}:00",
                "count": count,
            })

    # --- Daily breakdown (last 30 days) ---
    thirty_days_ago = now - timedelta(days=30)
    daily_result = await db.execute(
        select(
            func.date_trunc("day", Appointment.start_time).label("day"),
            func.count(Appointment.id).label("total"),
            func.count(Appointment.id).filter(Appointment.status == "completed").label("completed"),
            func.count(Appointment.id).filter(Appointment.status == "no_show").label("no_shows"),
            func.coalesce(
                func.sum(Appointment.final_price).filter(Appointment.status == "completed"), 0
            ).label("revenue"),
        )
        .where(
            biz_filter,
            Appointment.start_time >= thirty_days_ago,
            Appointment.start_time < now,
        )
        .group_by("day")
        .order_by("day")
    )
    daily_breakdown = [
        {
            "date": row.day.strftime("%Y-%m-%d") if row.day else "",
            "total": int(row.total),
            "completed": int(row.completed),
            "no_shows": int(row.no_shows),
            "revenue": round(float(row.revenue), 2),
        }
        for row in daily_result.all()
    ]

    # --- No-show analysis ---
    total_scheduled = await db.execute(
        select(func.count(Appointment.id)).where(
            biz_filter,
            Appointment.start_time >= current_month_start,
            Appointment.start_time < current_month_end,
        )
    )
    total_no_shows = await db.execute(
        select(func.count(Appointment.id)).where(
            biz_filter,
            Appointment.start_time >= current_month_start,
            Appointment.start_time < current_month_end,
            Appointment.status == "no_show",
        )
    )
    total_sched_count = total_scheduled.scalar() or 0
    total_noshow_count = total_no_shows.scalar() or 0
    overall_no_show_rate = round((total_noshow_count / total_sched_count) * 100, 1) if total_sched_count > 0 else 0

    # No-shows by source
    noshow_by_source_result = await db.execute(
        select(
            Appointment.source,
            func.count(Appointment.id).label("total"),
            func.count(Appointment.id).filter(Appointment.status == "no_show").label("no_shows"),
        )
        .where(
            biz_filter,
            Appointment.start_time >= current_month_start,
            Appointment.start_time < current_month_end,
        )
        .group_by(Appointment.source)
    )
    noshow_by_source = [
        {
            "source": row.source,
            "total": int(row.total),
            "no_shows": int(row.no_shows),
            "rate": round((int(row.no_shows) / int(row.total)) * 100, 1) if int(row.total) > 0 else 0,
        }
        for row in noshow_by_source_result.all()
    ]

    # --- Booking sources breakdown ---
    source_result = await db.execute(
        select(
            Appointment.source,
            func.count(Appointment.id).label("count"),
        )
        .where(
            biz_filter,
            Appointment.start_time >= current_month_start,
            Appointment.start_time < current_month_end,
        )
        .group_by(Appointment.source)
        .order_by(func.count(Appointment.id).desc())
    )
    booking_sources = [
        {"source": row.source, "count": int(row.count)}
        for row in source_result.all()
    ]

    # --- Payment method breakdown ---
    payment_result = await db.execute(
        select(
            Appointment.payment_method,
            func.count(Appointment.id).label("count"),
            func.coalesce(func.sum(Appointment.final_price), 0).label("total"),
        )
        .where(
            biz_filter,
            Appointment.start_time >= current_month_start,
            Appointment.start_time < current_month_end,
            Appointment.status == "completed",
            Appointment.payment_status == "paid",
        )
        .group_by(Appointment.payment_method)
        .order_by(func.sum(Appointment.final_price).desc())
    )
    payment_breakdown = [
        {
            "method": row.payment_method or "nespecificat",
            "count": int(row.count),
            "total": round(float(row.total), 2),
        }
        for row in payment_result.all()
    ]

    # --- Invoicing stats (current month) ---
    invoice_result = await db.execute(
        select(
            func.count(Invoice.id).label("total"),
            func.count(Invoice.id).filter(Invoice.status == "paid").label("paid"),
            func.count(Invoice.id).filter(Invoice.status == "draft").label("draft"),
            func.count(Invoice.id).filter(Invoice.status == "sent").label("sent"),
            func.count(Invoice.id).filter(Invoice.status == "overdue").label("overdue"),
            func.coalesce(func.sum(Invoice.total_amount), 0).label("total_amount"),
            func.coalesce(
                func.sum(Invoice.total_amount).filter(Invoice.status == "paid"), 0
            ).label("paid_amount"),
        )
        .where(
            Invoice.business_id == business_id,
            Invoice.issue_date >= current_month_start.date(),
            Invoice.issue_date < current_month_end.date(),
        )
    )
    invoice_row = invoice_result.one()
    invoicing_stats = {
        "total": int(invoice_row.total),
        "paid": int(invoice_row.paid),
        "draft": int(invoice_row.draft),
        "sent": int(invoice_row.sent),
        "overdue": int(invoice_row.overdue),
        "total_amount": round(float(invoice_row.total_amount), 2),
        "paid_amount": round(float(invoice_row.paid_amount), 2),
        "collection_rate": round(
            (float(invoice_row.paid_amount) / float(invoice_row.total_amount)) * 100, 1
        ) if float(invoice_row.total_amount) > 0 else 0,
    }

    # --- Notification stats (current month) ---
    notif_result = await db.execute(
        select(
            NotificationLog.channel,
            NotificationLog.status,
            func.count(NotificationLog.id).label("count"),
            func.coalesce(func.sum(NotificationLog.cost), 0).label("cost"),
        )
        .where(
            NotificationLog.business_id == business_id,
            NotificationLog.created_at >= current_month_start,
            NotificationLog.created_at < current_month_end,
        )
        .group_by(NotificationLog.channel, NotificationLog.status)
    )
    notification_stats = {}
    for row in notif_result.all():
        channel = row.channel
        if channel not in notification_stats:
            notification_stats[channel] = {"sent": 0, "delivered": 0, "failed": 0, "cost": 0.0}
        if row.status in ("sent", "delivered"):
            notification_stats[channel]["delivered"] += int(row.count)
        elif row.status == "failed":
            notification_stats[channel]["failed"] += int(row.count)
        notification_stats[channel]["sent"] += int(row.count)
        notification_stats[channel]["cost"] += round(float(row.cost), 2)

    return {
        "period": {
            "months": months,
            "current_month": RO_MONTHS[now.month - 1],
            "current_year": now.year,
        },
        "monthly_data": monthly_data,
        "client_growth": client_growth,
        "employee_performance": employee_performance,
        "top_services": top_services,
        "peak_hours": peak_hours,
        "daily_breakdown": daily_breakdown,
        "no_show_analysis": {
            "total_scheduled": total_sched_count,
            "total_no_shows": total_noshow_count,
            "overall_rate": overall_no_show_rate,
            "by_source": noshow_by_source,
        },
        "booking_sources": booking_sources,
        "payment_breakdown": payment_breakdown,
        "invoicing": invoicing_stats,
        "notifications": notification_stats,
    }
