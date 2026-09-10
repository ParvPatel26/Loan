from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_role
from app.db.session import get_db
from app.models.audit_log import AuditLog
from app.models.bank import Bank
from app.models.enums import UserRole
from app.models.lending_policy import LendingPolicy
from app.models.loan_application import LoanApplication
from app.models.loan_product import LoanProduct
from app.models.user import User
from app.schemas.admin import (
    AuditLogOut,
    BankOut,
    DashboardStats,
    LendingPolicyOut,
    LoanProductOut,
)
from app.schemas.auth import UserOut

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


@router.get("/banks", response_model=list[BankOut])
async def list_banks(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Bank).order_by(Bank.name))
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
