"""Seed default data so you can log in immediately after the first migration.

Run with:
    docker compose exec api python -m scripts.seed
    (or, running natively:  python -m scripts.seed   from inside services/api)

Safe to re-run — it checks for existing rows before inserting, so it won't
create duplicates.

Default logins created (all passwords follow the same pattern — change them
before this ever goes near production):
    admin@bank.com    / Admin@123      (role: admin)
    staff@bank.com    / Staff@123      (role: staff, scoped to First National Bank)
    customer@bank.com / Customer@123   (role: customer)
"""
import asyncio

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.bank import Bank
from app.models.enums import LoanType, UserRole
from app.models.lending_policy import LendingPolicy
from app.models.loan_product import LoanProduct
from app.models.user import User


async def get_or_create(db, model, defaults: dict, **lookup):
    result = await db.execute(select(model).filter_by(**lookup))
    instance = result.scalar_one_or_none()
    if instance:
        return instance, False
    instance = model(**lookup, **defaults)
    db.add(instance)
    await db.flush()
    return instance, True


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        bank, created = await get_or_create(
            db,
            Bank,
            code="FNB001",
            defaults={"name": "First National Bank", "contact_email": "contact@fnb.example"},
        )
        print(f"Bank: {bank.name} ({'created' if created else 'already existed'})")

        admin_user, created = await get_or_create(
            db,
            User,
            email="admin@bank.com",
            defaults={
                "password_hash": hash_password("Admin@123"),
                "full_name": "Platform Admin",
                "role": UserRole.ADMIN.value,
            },
        )
        print(f"Admin user: admin@bank.com ({'created' if created else 'already existed'})")

        staff_user, created = await get_or_create(
            db,
            User,
            email="staff@bank.com",
            defaults={
                "password_hash": hash_password("Staff@123"),
                "full_name": "Loan Officer",
                "role": UserRole.STAFF.value,
                "bank_id": bank.id,
            },
        )
        print(f"Staff user: staff@bank.com ({'created' if created else 'already existed'})")

        customer_user, created = await get_or_create(
            db,
            User,
            email="customer@bank.com",
            defaults={
                "password_hash": hash_password("Customer@123"),
                "full_name": "Jordan Customer",
                "role": UserRole.CUSTOMER.value,
            },
        )
        print(f"Customer user: customer@bank.com ({'created' if created else 'already existed'})")

        personal, created = await get_or_create(
            db,
            LoanProduct,
            bank_id=bank.id,
            name="Everyday Personal Loan",
            defaults={
                "product_type": LoanType.PERSONAL.value,
                "min_amount": 2000,
                "max_amount": 50000,
                "interest_rate_min": 8.5,
                "interest_rate_max": 15.0,
                "tenure_min_months": 6,
                "tenure_max_months": 60,
                "eligibility_criteria": {"min_credit_score": 600, "min_age": 18},
            },
        )
        print(f"Loan product: {personal.name} ({'created' if created else 'already existed'})")

        business, created = await get_or_create(
            db,
            LoanProduct,
            bank_id=bank.id,
            name="Small Business Growth Loan",
            defaults={
                "product_type": LoanType.BUSINESS.value,
                "min_amount": 10000,
                "max_amount": 500000,
                "interest_rate_min": 10.0,
                "interest_rate_max": 18.0,
                "tenure_min_months": 12,
                "tenure_max_months": 84,
                "eligibility_criteria": {"min_credit_score": 650, "min_years_trading": 1},
            },
        )
        print(f"Loan product: {business.name} ({'created' if created else 'already existed'})")

        home, created = await get_or_create(
            db,
            LoanProduct,
            bank_id=bank.id,
            name="Home Purchase Loan",
            defaults={
                "product_type": LoanType.HOME.value,
                "min_amount": 50000,
                "max_amount": 2000000,
                "interest_rate_min": 6.0,
                "interest_rate_max": 9.0,
                "tenure_min_months": 60,
                "tenure_max_months": 360,
                "eligibility_criteria": {"min_credit_score": 680, "max_dti_ratio": 0.43},
            },
        )
        print(f"Loan product: {home.name} ({'created' if created else 'already existed'})")

        policy, created = await get_or_create(
            db,
            LendingPolicy,
            bank_id=bank.id,
            product_id=personal.id,
            defaults={
                "auto_approval_max_amount": 10000,
                "min_credit_score": 650,
                "max_dti_ratio": 0.40,
                "rules": {"require_all_documents_verified": True},
            },
        )
        print(f"Lending policy for {personal.name} ({'created' if created else 'already existed'})")

        await db.commit()
        print("\nSeed complete. Log in at http://localhost:3000/login with:")
        print("  admin@bank.com    / Admin@123")
        print("  staff@bank.com    / Staff@123")
        print("  customer@bank.com / Customer@123")


if __name__ == "__main__":
    asyncio.run(seed())
