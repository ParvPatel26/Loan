from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_role
from app.core.security import hash_password
from app.db.session import get_db
from app.models.audit_log import AuditLog
from app.models.bank import Bank
from app.models.bank_position import BankPosition
from app.models.enums import UserRole
from app.models.lending_policy import LendingPolicy
from app.models.loan_application import LoanApplication
from app.models.loan_product import LoanProduct
from app.models.user import User
from app.schemas.admin import (
    AuditLogOut,
    BankOut,
    CreateStaffRequest,
    DashboardStats,
    LendingPolicyOut,
    LoanProductOut,
)
from app.schemas.auth import UserOut
from app.schemas.bank import BankPositionOut

router = APIRouter(dependencies=[Depends(require_role(UserRole.ADMIN.value))])


@router.get("/dashboard", response_model=DashboardStats)
async def dashboard(db: AsyncSession = Depends(get_db)):
    users = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    banks = (await db.execute(select(func.count()).select_from(Bank))).scalar_one()
    products = (await db.execute(select(func.count()).select_from(LoanProduct))).scalar_one()
    applications = (await db.execute(select(func.count()).select_from(LoanApplication))).scalar_one()
    return DashboardStats(
        total_users=users,
        total_banks=banks,
        total_loan_products=products,
        total_applications=applications,
    )


@router.get("/users", response_model=list[UserOut])
async def list_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(User.created_at))
    return result.scalars().all()


@router.post("/staff", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_staff(
    payload: CreateStaffRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN.value)),
):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    bank = await db.get(Bank, payload.bank_id)
    if bank is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bank not found")

    if payload.position_id is not None:
        position = await db.get(BankPosition, payload.position_id)
        if position is None or position.bank_id != payload.bank_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Position not found for this bank")

    staff = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=UserRole.STAFF.value,
        bank_id=payload.bank_id,
        position_id=payload.position_id,
    )
    db.add(staff)
    await db.flush()

    db.add(
        AuditLog(
            entity_type="user",
            entity_id=str(staff.id),
            action="staff_created",
            performed_by=admin.id,
            after_state={"email": staff.email, "full_name": staff.full_name, "bank_id": str(payload.bank_id)},
        )
    )
    await db.commit()
    await db.refresh(staff)
    return staff


@router.get("/banks", response_model=list[BankOut])
async def list_banks(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Bank).order_by(Bank.name))
    return result.scalars().all()


@router.get("/banks/{bank_id}/positions", response_model=list[BankPositionOut])
async def list_bank_positions_for_admin(bank_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(BankPosition).where(BankPosition.bank_id == bank_id).order_by(BankPosition.rank.asc())
    )
    return result.scalars().all()


@router.get("/loan-products", response_model=list[LoanProductOut])
async def list_loan_products(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LoanProduct).order_by(LoanProduct.name))
    return result.scalars().all()


@router.get("/lending-policies", response_model=list[LendingPolicyOut])
async def list_lending_policies(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LendingPolicy))
    return result.scalars().all()


@router.get("/audit-logs", response_model=list[AuditLogOut])
async def list_audit_logs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(100))
    return result.scalars().all()
