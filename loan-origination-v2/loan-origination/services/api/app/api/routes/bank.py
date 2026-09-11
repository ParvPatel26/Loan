import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_staff, get_current_user, require_bank_permission
from app.core.security import hash_password
from app.db.session import get_db
from app.models.audit_log import AuditLog
from app.models.bank_position import BankPosition
from app.models.enums import UserRole
from app.models.escalation import Escalation
from app.models.lending_policy import LendingPolicy
from app.models.loan_application import LoanApplication
from app.models.loan_product import LoanProduct, generate_product_code
from app.models.notification import Notification
from app.models.user import User
from app.schemas.admin import LendingPolicyOut, LoanProductOut
from app.schemas.auth import UserOut
from app.schemas.bank import (
    BankPositionOut,
    CreateBankStaffRequest,
    CreateLendingPolicyRequest,
    CreateLoanProductRequest,
    LoanApplicationOut,
    NotificationOut,
)

router = APIRouter()


@router.get("/positions", response_model=list[BankPositionOut])
async def list_positions(staff: User = Depends(get_current_staff), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BankPosition).where(BankPosition.bank_id == staff.bank_id).order_by(BankPosition.rank.asc()))
    return result.scalars().all()


@router.get("/staff", response_model=list[UserOut])
async def list_bank_staff(staff: User = Depends(get_current_staff), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(User.bank_id == staff.bank_id, User.role == UserRole.STAFF.value).order_by(User.created_at)
    )
    return result.scalars().all()


@router.post("/staff", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_bank_staff(
    payload: CreateBankStaffRequest,
    actor: User = Depends(require_bank_permission("can_manage_staff")),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    position = await db.get(BankPosition, payload.position_id)
    if position is None or position.bank_id != actor.bank_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Position not found for your bank")

    staff = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=UserRole.STAFF.value,
        bank_id=actor.bank_id,
        position_id=payload.position_id,
    )
    db.add(staff)
    await db.flush()

    db.add(
        AuditLog(
            entity_type="user",
            entity_id=str(staff.id),
            action="staff_created",
            performed_by=actor.id,
            after_state={"email": staff.email, "full_name": staff.full_name, "position": position.title},
        )
    )
    await db.commit()
    await db.refresh(staff)
    return staff


@router.post("/staff/{staff_id}/deactivate", response_model=UserOut)
async def deactivate_bank_staff(
    staff_id: uuid.UUID,
    actor: User = Depends(require_bank_permission("can_manage_staff")),
    db: AsyncSession = Depends(get_db),
):
    if staff_id == actor.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot deactivate your own account")

    target = await db.get(User, staff_id)
    if target is None or target.role != UserRole.STAFF.value or target.bank_id != actor.bank_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found")

    if target.is_active:
        target.is_active = False
        db.add(
            AuditLog(
                entity_type="user",
                entity_id=str(target.id),
                action="staff_deactivated",
                performed_by=actor.id,
                after_state={"email": target.email, "is_active": False},
            )
        )
        await db.commit()
        await db.refresh(target)
    return target


@router.post("/staff/{staff_id}/reactivate", response_model=UserOut)
async def reactivate_bank_staff(
    staff_id: uuid.UUID,
    actor: User = Depends(require_bank_permission("can_manage_staff")),
    db: AsyncSession = Depends(get_db),
):
    target = await db.get(User, staff_id)
    if target is None or target.role != UserRole.STAFF.value or target.bank_id != actor.bank_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found")

    if not target.is_active:
        target.is_active = True
        db.add(
            AuditLog(
                entity_type="user",
                entity_id=str(target.id),
                action="staff_reactivated",
                performed_by=actor.id,
                after_state={"email": target.email, "is_active": True},
            )
        )
        await db.commit()
        await db.refresh(target)
    return target


@router.get("/loan-products", response_model=list[LoanProductOut])
async def list_bank_products(staff: User = Depends(get_current_staff), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LoanProduct).where(LoanProduct.bank_id == staff.bank_id).order_by(LoanProduct.name))
    return result.scalars().all()


@router.post("/loan-products", response_model=LoanProductOut, status_code=status.HTTP_201_CREATED)
async def create_bank_product(
    payload: CreateLoanProductRequest,
    actor: User = Depends(require_bank_permission("can_manage_products")),
    db: AsyncSession = Depends(get_db),
):
    product = LoanProduct(bank_id=actor.bank_id, **payload.model_dump())
    db.add(product)
    await db.flush()
    product.product_code = generate_product_code(product.product_type, product.id)
    db.add(
        AuditLog(
            entity_type="loan_product",
            entity_id=str(product.id),
            action="product_created",
            performed_by=actor.id,
            after_state={"name": product.name, "product_type": product.product_type},
        )
    )
    await db.commit()
    await db.refresh(product)
    return product


@router.get("/lending-policies", response_model=list[LendingPolicyOut])
async def list_bank_policies(staff: User = Depends(get_current_staff), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LendingPolicy).where(LendingPolicy.bank_id == staff.bank_id))
    return result.scalars().all()


@router.post("/lending-policies", response_model=LendingPolicyOut, status_code=status.HTTP_201_CREATED)
async def create_bank_policy(
    payload: CreateLendingPolicyRequest,
    actor: User = Depends(require_bank_permission("can_manage_products")),
    db: AsyncSession = Depends(get_db),
):
    if payload.product_id is not None:
        product = await db.get(LoanProduct, payload.product_id)
        if product is None or product.bank_id != actor.bank_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Product not found for your bank")

    policy = LendingPolicy(bank_id=actor.bank_id, updated_by=actor.id, **payload.model_dump())
    db.add(policy)
    await db.flush()
    db.add(
        AuditLog(
            entity_type="lending_policy",
            entity_id=str(policy.id),
            action="policy_created",
            performed_by=actor.id,
            after_state={"auto_approval_max_amount": payload.auto_approval_max_amount},
        )
    )
    await db.commit()
    await db.refresh(policy)
    return policy


@router.get("/loan-applications", response_model=list[LoanApplicationOut])
async def list_bank_applications(staff: User = Depends(get_current_staff), db: AsyncSession = Depends(get_db)):
    apps_result = await db.execute(
        select(LoanApplication).where(LoanApplication.bank_id == staff.bank_id).order_by(LoanApplication.created_at.desc())
    )
    applications = apps_result.scalars().all()
    if not applications:
        return []

    esc_result = await db.execute(
        select(Escalation, BankPosition)
        .join(BankPosition, Escalation.escalated_to_position_id == BankPosition.id, isouter=True)
        .where(Escalation.application_id.in_([a.id for a in applications]), Escalation.status == "pending")
    )
    position_by_app = {esc.application_id: (pos.title if pos else None) for esc, pos in esc_result.all()}

    out = []
    for app in applications:
        item = LoanApplicationOut.model_validate(app)
        item.pending_position_title = position_by_app.get(app.id)
        out.append(item)
    return out


@router.get("/notifications", response_model=list[NotificationOut])
async def list_notifications(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc()).limit(50)
    )
    return result.scalars().all()


@router.post("/notifications/{notification_id}/read", response_model=NotificationOut)
async def mark_notification_read(
    notification_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    notification = await db.get(Notification, notification_id)
    if notification is None or notification.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    notification.is_read = True
    await db.commit()
    await db.refresh(notification)
    return notification
