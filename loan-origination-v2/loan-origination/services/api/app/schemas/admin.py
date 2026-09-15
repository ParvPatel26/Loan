import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr


class BankOut(BaseModel):
    id: uuid.UUID
    name: str
    code: str
    contact_email: str | None
    status: str

    model_config = {"from_attributes": True}


class LoanProductOut(BaseModel):
    id: uuid.UUID
    bank_id: uuid.UUID
    product_code: str | None
    product_type: str
    name: str
    min_amount: float
    max_amount: float
    interest_rate_min: float
    interest_rate_max: float
    tenure_min_months: int
    tenure_max_months: int
    is_active: bool

    model_config = {"from_attributes": True}


class LendingPolicyOut(BaseModel):
    id: uuid.UUID
    bank_id: uuid.UUID
    product_id: uuid.UUID | None
    auto_approval_max_amount: float
    min_credit_score: int
    max_dti_ratio: float
    is_active: bool

    model_config = {"from_attributes": True}


class AuditLogOut(BaseModel):
    id: uuid.UUID
    entity_type: str
    entity_id: str
    action: str
    performed_by: uuid.UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


class DashboardStats(BaseModel):
    total_users: int
    total_banks: int
    total_loan_products: int
    total_applications: int


class CreateStaffRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    bank_id: uuid.UUID
    position_id: uuid.UUID | None = None
