"""Client CRM endpoints (nested under business)."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.business import Business
from app.models.client import Client
from app.models.user import User
from app.schemas.client import ClientCreate, ClientListResponse, ClientResponse, ClientUpdate

router = APIRouter()


async def _get_owned_business(business_id: int, user: User, db: AsyncSession) -> Business:
    result = await db.execute(
        select(Business).where(Business.id == business_id, Business.owner_id == user.id)
    )
    biz = result.scalar_one_or_none()
    if not biz:
        raise HTTPException(status_code=404, detail="Afacere negasita")
    return biz


@router.get("/", response_model=list[ClientListResponse])
async def list_clients(
    business_id: int,
    search: str | None = Query(None),
    tag: str | None = Query(None),
    blocked: bool | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_business(business_id, user, db)
    query = select(Client).where(Client.business_id == business_id)

    if search:
        pattern = f"%{search}%"
        query = query.where(
            Client.full_name.ilike(pattern) | Client.phone.ilike(pattern) | Client.email.ilike(pattern)
        )
    if tag:
        query = query.where(Client.tags.contains([tag]))
    if blocked is not None:
        query = query.where(Client.is_blocked == blocked)

    query = query.order_by(Client.last_visit_at.desc().nullslast())
    query = query.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=ClientResponse, status_code=201)
async def create_client(
    business_id: int,
    body: ClientCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_business(business_id, user, db)
    client = Client(
        business_id=business_id,
        gdpr_consent_date=datetime.now(timezone.utc) if body.gdpr_consent else None,
        gdpr_article9_consent_date=datetime.now(timezone.utc) if body.gdpr_article9_consent else None,
        **body.model_dump(),
    )
    db.add(client)
    await db.flush()
    return client


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    business_id: int,
    client_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_business(business_id, user, db)
    result = await db.execute(
        select(Client).where(Client.id == client_id, Client.business_id == business_id)
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client negasit")
    return client


@router.patch("/{client_id}", response_model=ClientResponse)
async def update_client(
    business_id: int,
    client_id: int,
    body: ClientUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_business(business_id, user, db)
    result = await db.execute(
        select(Client).where(Client.id == client_id, Client.business_id == business_id)
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client negasit")

    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(client, key, value)
    await db.flush()
    return client


@router.get("/stats/summary")
async def client_stats(
    business_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_business(business_id, user, db)
    result = await db.execute(
        select(
            func.count(Client.id).label("total_clients"),
            func.sum(Client.total_revenue).label("total_revenue"),
            func.avg(Client.total_appointments).label("avg_appointments"),
            func.sum(Client.no_show_count).label("total_no_shows"),
        ).where(Client.business_id == business_id)
    )
    row = result.one()
    return {
        "total_clients": row.total_clients or 0,
        "total_revenue": float(row.total_revenue or 0),
        "avg_appointments": float(row.avg_appointments or 0),
        "total_no_shows": row.total_no_shows or 0,
    }
