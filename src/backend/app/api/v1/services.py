"""Service CRUD endpoints (nested under business)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.business import Business
from app.models.service import Service, ServiceCategory
from app.models.user import User
from app.schemas.service import (
    ServiceCategoryCreate,
    ServiceCategoryResponse,
    ServiceCreate,
    ServiceResponse,
    ServiceUpdate,
)

router = APIRouter()


async def _get_owned_business(business_id: int, user: User, db: AsyncSession) -> Business:
    result = await db.execute(
        select(Business).where(Business.id == business_id, Business.owner_id == user.id)
    )
    biz = result.scalar_one_or_none()
    if not biz:
        raise HTTPException(status_code=404, detail="Afacere negasita")
    return biz


# --- Categories ---

@router.get("/categories", response_model=list[ServiceCategoryResponse])
async def list_categories(
    business_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_business(business_id, user, db)
    result = await db.execute(
        select(ServiceCategory)
        .where(ServiceCategory.business_id == business_id)
        .order_by(ServiceCategory.sort_order)
    )
    return result.scalars().all()


@router.post("/categories", response_model=ServiceCategoryResponse, status_code=201)
async def create_category(
    business_id: int,
    body: ServiceCategoryCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_business(business_id, user, db)
    cat = ServiceCategory(business_id=business_id, **body.model_dump())
    db.add(cat)
    await db.flush()
    return cat


# --- Services ---

@router.get("/", response_model=list[ServiceResponse])
async def list_services(
    business_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_business(business_id, user, db)
    result = await db.execute(
        select(Service)
        .where(Service.business_id == business_id)
        .order_by(Service.sort_order)
    )
    return result.scalars().all()


@router.post("/", response_model=ServiceResponse, status_code=201)
async def create_service(
    business_id: int,
    body: ServiceCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_business(business_id, user, db)
    svc = Service(business_id=business_id, **body.model_dump())
    db.add(svc)
    await db.flush()
    return svc


@router.patch("/{service_id}", response_model=ServiceResponse)
async def update_service(
    business_id: int,
    service_id: int,
    body: ServiceUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_business(business_id, user, db)
    result = await db.execute(
        select(Service).where(Service.id == service_id, Service.business_id == business_id)
    )
    svc = result.scalar_one_or_none()
    if not svc:
        raise HTTPException(status_code=404, detail="Serviciu negasit")

    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(svc, key, value)
    await db.flush()
    return svc


@router.delete("/{service_id}", status_code=204)
async def delete_service(
    business_id: int,
    service_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_business(business_id, user, db)
    result = await db.execute(
        select(Service).where(Service.id == service_id, Service.business_id == business_id)
    )
    svc = result.scalar_one_or_none()
    if not svc:
        raise HTTPException(status_code=404, detail="Serviciu negasit")
    await db.delete(svc)
