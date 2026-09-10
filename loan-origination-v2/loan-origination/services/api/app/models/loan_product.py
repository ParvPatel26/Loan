import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import LoanType


class LoanProduct(Base):
    __tablename__ = "loan_products"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bank_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("banks.id"), nullable=False)
    product_type: Mapped[str] = mapped_column(String(30), nullable=False, default=LoanType.PERSONAL.value)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    min_amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    max_amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    interest_rate_min: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    interest_rate_max: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    tenure_min_months: Mapped[int] = mapped_column(Integer, nullable=False)
    tenure_max_months: Mapped[int] = mapped_column(Integer, nullable=False)
    eligibility_criteria: Mapped[dict] = mapped_column(JSONB, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    bank: Mapped["Bank"] = relationship(back_populates="loan_products")
