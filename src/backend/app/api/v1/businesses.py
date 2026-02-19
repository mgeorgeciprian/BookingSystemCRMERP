"""Business CRUD endpoints."""

import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.business import Business
from app.models.user import User
from app.schemas.business import BusinessCreate, BusinessResponse, BusinessUpdate

router = APIRouter()


def _slugify(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    return re.sub(r"-+", "-", slug).strip("-")


@router.get("/", response_model=list[BusinessResponse])
async def list_businesses(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Business).where(Business.owner_id == user.id).order_by(Business.created_at.desc())
    )
    return result.scalars().all()


@router.post("/", response_model=BusinessResponse, status_code=201)
async def create_business(
    body: BusinessCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    slug = _slugify(body.name)
    # Ensure unique slug
    existing = await db.execute(select(Business).where(Business.slug == slug))
    if existing.scalar_one_or_none():
        slug = f"{slug}-{user.id}"

    biz = Business(
        owner_id=user.id,
        slug=slug,
        **body.model_dump(),
    )
    db.add(biz)
    await db.flush()
    return biz


@router.get("/{business_id}", response_model=BusinessResponse)
async def get_business(
    business_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Business).where(Business.id == business_id, Business.owner_id == user.id)
    )
    biz = result.scalar_one_or_none()
    if not biz:
        raise HTTPException(status_code=404, detail="Afacere negasita")
    return biz


@router.patch("/{business_id}", response_model=BusinessResponse)
async def update_business(
    business_id: int,
    body: BusinessUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Business).where(Business.id == business_id, Business.owner_id == user.id)
    )
    biz = result.scalar_one_or_none()
    if not biz:
        raise HTTPException(status_code=404, detail="Afacere negasita")

    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(biz, key, value)

    await db.flush()
    return biz


@router.delete("/{business_id}", status_code=204)
async def delete_business(
    business_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Business).where(Business.id == business_id, Business.owner_id == user.id)
    )
    biz = result.scalar_one_or_none()
    if not biz:
        raise HTTPException(status_code=404, detail="Afacere negasita")
    await db.delete(biz)
