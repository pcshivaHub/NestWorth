from pydantic import BaseModel
from uuid import UUID
from datetime import date
from typing import Optional


# ─────────────────────────────────────────
# ACCOUNT
# ─────────────────────────────────────────

class AccountCreate(BaseModel):
    name: str
    type: str
    opening_balance: float = 0.0


class AccountResponse(BaseModel):
    id: UUID
    name: str
    type: str
    opening_balance: float

    class Config:
        from_attributes = True


# ─────────────────────────────────────────
# CATEGORY
# ─────────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str
    kind: str  # "income" or "expense"


class CategoryResponse(BaseModel):
    id: UUID
    name: str
    kind: str

    class Config:
        from_attributes = True


# ─────────────────────────────────────────
# TRANSACTION
# ─────────────────────────────────────────

class TransactionCreate(BaseModel):
    account_id: UUID
    category_id: UUID
    amount: float
    type: str          # "income" or "expense"
    txn_date: date
    note: Optional[str] = None


class TransactionResponse(BaseModel):
    id: UUID
    account_id: UUID
    category_id: UUID
    # ✅ Joined fields returned by GET /transactions
    account_name: Optional[str] = None
    category_name: Optional[str] = None
    amount: float
    type: str
    txn_date: date
    note: Optional[str] = None

    class Config:
        from_attributes = True


# ─────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────

class SummaryResponse(BaseModel):
    total_income: float
    total_expense: float
    net: float


# ─────────────────────────────────────────
# BALANCE
# ─────────────────────────────────────────

class BalanceResponse(BaseModel):
    account: str
    balance: float