"""iCal sync endpoints -- manage external calendar sources (Airbnb, Booking.com, Google)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.business import Business
from app.models.ical_source import ICalSource
from app.models.user import User

router = APIRouter()


async def _get_owned_business(business_id: int, user: User, db: AsyncSession) -> Business:
    result = await db.execute(
        select(Business).where(Business.id == business_id, Business.owner_id == user.id)
    )
    biz = result.scalar_one_or_none()
    if not biz:
        raise HTTPException(status_code=404, detail="Afacere negasita")
    return biz


@router.get("/sources")
async def list_ical_sources(
    business_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_business(business_id, user, db)
    result = await db.execute(
        select(ICalSource).where(ICalSource.business_id == business_id)
    )
    return result.scalars().all()


@router.post("/sources", status_code=201)
async def add_ical_source(
    business_id: int,
    name: str,
    source_type: str,
    ical_url: str,
    employee_id: int | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_business(business_id, user, db)

    source = ICalSource(
        business_id=business_id,
        employee_id=employee_id,
        name=name,
        source_type=source_type,
        ical_url=ical_url,
    )
    db.add(source)
    await db.flush()
    return {"id": source.id, "status": "created"}


@router.delete("/sources/{source_id}", status_code=204)
async def delete_ical_source(
    business_id: int,
    source_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_business(business_id, user, db)
    result = await db.execute(
        select(ICalSource).where(
            ICalSource.id == source_id, ICalSource.business_id == business_id
        )
    )
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Sursa iCal negasita")
    await db.delete(source)


@router.post("/sources/{source_id}/sync")
async def trigger_sync(
    business_id: int,
    source_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Trigger manual iCal sync for a source."""
    await _get_owned_business(business_id, user, db)
    result = await db.execute(
        select(ICalSource).where(
            ICalSource.id == source_id, ICalSource.business_id == business_id
        )
    )
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Sursa iCal negasita")

    # Import here to avoid circular imports
    from app.services.ical_sync import sync_ical_source
    await sync_ical_source(db, source)

    return {"status": "synced", "events_count": source.events_count}
