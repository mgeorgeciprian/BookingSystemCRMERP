"""Employee CRUD endpoints (nested under business)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.business import Business
from app.models.employee import Employee, EmployeeService
from app.models.user import User
from app.schemas.employee import (
    EmployeeCreate,
    EmployeeResponse,
    EmployeeServiceAssign,
    EmployeeUpdate,
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


@router.get("/", response_model=list[EmployeeResponse])
async def list_employees(
    business_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_business(business_id, user, db)
    result = await db.execute(
        select(Employee)
        .where(Employee.business_id == business_id)
        .order_by(Employee.sort_order)
    )
    return result.scalars().all()


@router.post("/", response_model=EmployeeResponse, status_code=201)
async def create_employee(
    business_id: int,
    body: EmployeeCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_business(business_id, user, db)
    emp = Employee(business_id=business_id, **body.model_dump(exclude_unset=True))
    db.add(emp)
    await db.flush()
    return emp


@router.patch("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    business_id: int,
    employee_id: int,
    body: EmployeeUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_business(business_id, user, db)
    result = await db.execute(
        select(Employee).where(Employee.id == employee_id, Employee.business_id == business_id)
    )
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Angajat negasit")

    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(emp, key, value)
    await db.flush()
    return emp


@router.delete("/{employee_id}", status_code=204)
async def delete_employee(
    business_id: int,
    employee_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_business(business_id, user, db)
    result = await db.execute(
        select(Employee).where(Employee.id == employee_id, Employee.business_id == business_id)
    )
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Angajat negasit")
    await db.delete(emp)


@router.post("/{employee_id}/services", status_code=201)
async def assign_service(
    business_id: int,
    employee_id: int,
    body: EmployeeServiceAssign,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_business(business_id, user, db)
    assignment = EmployeeService(
        employee_id=employee_id,
        service_id=body.service_id,
        price_override=body.price_override,
        duration_override=body.duration_override,
    )
    db.add(assignment)
    await db.flush()
    return {"status": "ok"}
