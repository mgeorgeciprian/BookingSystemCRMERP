"""Notification endpoints -- send messages, view log."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.business import Business
from app.models.client import Client
from app.models.notification import NotificationLog
from app.models.user import User
from app.schemas.notification import NotificationLogResponse, SendNotificationRequest

router = APIRouter()


async def _get_owned_business(business_id: int, user: User, db: AsyncSession) -> Business:
    result = await db.execute(
        select(Business).where(Business.id == business_id, Business.owner_id == user.id)
    )
    biz = result.scalar_one_or_none()
    if not biz:
        raise HTTPException(status_code=404, detail="Afacere negasita")
    return biz


@router.get("/log", response_model=list[NotificationLogResponse])
async def notification_log(
    business_id: int,
    channel: str | None = Query(None),
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_business(business_id, user, db)
    query = select(NotificationLog).where(NotificationLog.business_id == business_id)
    if channel:
        query = query.where(NotificationLog.channel == channel)
    if status:
        query = query.where(NotificationLog.status == status)
    query = query.order_by(NotificationLog.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/send")
async def send_notification(
    business_id: int,
    body: SendNotificationRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a custom notification to a client."""
    biz = await _get_owned_business(business_id, user, db)
    client = await db.get(Client, body.client_id)
    if not client or client.business_id != business_id:
        raise HTTPException(status_code=404, detail="Client negasit")

    if not client.notifications_enabled:
        raise HTTPException(status_code=400, detail="Clientul a dezactivat notificarile")

    from app.services.notification import send_message
    result = await send_message(
        db=db,
        business=biz,
        client=client,
        message_type=body.message_type,
        content=body.content,
        preferred_channel=body.channel,
    )
    return result
