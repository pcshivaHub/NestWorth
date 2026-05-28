from pydantic import BaseModel
from uuid import UUID
from datetime import date, datetime
from typing import Optional, List


# ─────────────────────────────────────────
# ACCOUNT
# ─────────────────────────────────────────

class AccountCreate(BaseModel):
    name: str
    type: str
    opening_balance: float = 0.0
    user_id: Optional[UUID] = None


class AccountResponse(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
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
    budget: Optional[float] = None


class CategoryResponse(BaseModel):
    id: UUID
    name: str
    kind: str
    budget: Optional[float] = None

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

class CategoryBreakdown(BaseModel):
    category_id: Optional[str] = None
    category_name: str
    amount: float
    budget: Optional[float] = None


class SummaryResponse(BaseModel):
    total_income: float
    total_expense: float
    net: float
    income_by_category: Optional[List[CategoryBreakdown]] = []
    expense_by_category: Optional[List[CategoryBreakdown]] = []


# ─────────────────────────────────────────
# BALANCE
# ─────────────────────────────────────────

class BalanceResponse(BaseModel):
    account: str
    balance: float


class BalanceHistoryPoint(BaseModel):
    label: str
    balance: float


class AccountBalanceHistoryResponse(BaseModel):
    history: List[BalanceHistoryPoint]


# ─────────────────────────────────────────
# FAMILY
# ─────────────────────────────────────────

class FamilyCreate(BaseModel):
    name: str


class JoinFamilyRequest(BaseModel):
    invite_code: str


class FamilyMemberResponse(BaseModel):
    user_id: UUID
    role: str
    joined_at: datetime
    display_name: Optional[str] = None

    class Config:
        from_attributes = True


class FamilyResponse(BaseModel):
    id: UUID
    name: str
    invite_code: str
    created_by: UUID
    members: List[FamilyMemberResponse] = []

    class Config:
        from_attributes = True


class NewInviteCodeResponse(BaseModel):
    invite_code: str


# ─────────────────────────────────────────
# REPORTS
# ─────────────────────────────────────────

class MonthDataPoint(BaseModel):
    label: str
    income: float
    expense: float
    net: float


class MonthSummaryPoint(BaseModel):
    label: str
    net: float


class TrendResponse(BaseModel):
    months: List[MonthDataPoint]
    best_month: Optional[MonthSummaryPoint] = None
    worst_month: Optional[MonthSummaryPoint] = None
    avg_net: float


class CategoryBreakdownItem(BaseModel):
    category_id: Optional[str] = None
    category_name: str
    amount: float
    percentage: float


class CategoryBreakdownResponse(BaseModel):
    total_expense: float
    breakdown: List[CategoryBreakdownItem]


class BudgetCategoryItem(BaseModel):
    category_id: Optional[str] = None
    category_name: str
    budget: Optional[float] = None
    actual: float
    variance: Optional[float] = None
    percentage: Optional[float] = None


class BudgetVsActualResponse(BaseModel):
    categories: List[BudgetCategoryItem]
    over_budget_count: int
    total_budget: float
    total_actual: float
    total_variance: float


class NetWorthDataPoint(BaseModel):
    label: str
    net_worth: float


class NetWorthTrendResponse(BaseModel):
    months: List[NetWorthDataPoint]
    current_net_worth: float
    previous_net_worth: float
    change: float


class FamilyMemberBreakdownItem(BaseModel):
    user_id: str
    is_self: bool
    income: float
    expense: float
    net: float


class FamilyBreakdownResponse(BaseModel):
    members: List[FamilyMemberBreakdownItem]


# ─────────────────────────────────────────
# ASSETS
# ─────────────────────────────────────────

class AssetCreate(BaseModel):
    name: str
    asset_type: str
    purchase_price: Optional[float] = None
    current_value: float
    purchase_date: Optional[date] = None
    notes: Optional[str] = None


class AssetValueHistoryItem(BaseModel):
    value: float
    recorded_at: datetime

    class Config:
        from_attributes = True


class AssetResponse(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    name: str
    asset_type: str
    purchase_price: Optional[float] = None
    current_value: float
    purchase_date: Optional[date] = None
    notes: Optional[str] = None
    created_at: datetime
    value_history: List[AssetValueHistoryItem] = []

    class Config:
        from_attributes = True


class AssetTypeBreakdown(BaseModel):
    asset_type: str
    total_value: float
    count: int


class AssetPortfolioItem(BaseModel):
    id: str
    name: str
    asset_type: str
    purchase_price: Optional[float] = None
    current_value: float
    gain_loss: Optional[float] = None
    gain_loss_pct: Optional[float] = None


class AssetPortfolioResponse(BaseModel):
    total_value: float
    total_cost: float
    total_gain_loss: float
    by_type: List[AssetTypeBreakdown]
    assets: List[AssetPortfolioItem]


# ─────────────────────────────────────────
# DEPOSITS
# ─────────────────────────────────────────

class DepositDetailCreate(BaseModel):
    principal_amount: float
    monthly_installment: Optional[float] = None
    interest_rate: float
    tenure_months: int
    maturity_amount: Optional[float] = None
    start_date: Optional[date] = None
    maturity_date: Optional[date] = None


class DepositDetailResponse(BaseModel):
    id: UUID
    account_id: UUID
    principal_amount: float
    monthly_installment: Optional[float] = None
    interest_rate: float
    tenure_months: int
    maturity_amount: Optional[float] = None
    maturity_date: Optional[date] = None
    start_date: Optional[date] = None
    is_closed: bool
    closing_amount: Optional[float] = None
    closed_date: Optional[date] = None
    transferred_to_account_id: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CloseDepositRequest(BaseModel):
    closing_amount: float
    transferred_to_account_id: UUID
    closed_date: Optional[date] = None


# ─────────────────────────────────────────
# OUTSTANDINGS
# ─────────────────────────────────────────

class OutstandingCreate(BaseModel):
    person_name: str
    amount: float
    description: Optional[str] = None
    direction: str = "lent"          # "lent" | "borrowed"
    due_date: Optional[date] = None


class OutstandingResponse(BaseModel):
    id: UUID
    user_id: UUID
    person_name: str
    amount: float
    description: Optional[str] = None
    direction: str
    due_date: Optional[date] = None
    is_settled: bool
    created_at: datetime

    class Config:
        from_attributes = True


class OutstandingsSummary(BaseModel):
    total_lent: float
    total_borrowed: float
    net_outstanding: float
    items: List[OutstandingResponse]


# ─────────────────────────────────────────
# NET WORTH SNAPSHOT
# ─────────────────────────────────────────

class AccountTypeBreakdown(BaseModel):
    account_type: str
    balance: float
    count: int


class NetWorthSnapshotResponse(BaseModel):
    # Tier 1 — bank accounts only (savings, checking, cash, credit, fd, rd)
    actual_in_hand: float
    bank_breakdown: List[AccountTypeBreakdown] = []
    # Tier 2 — + net outstandings
    grand1_with_outstandings: float
    total_lent: float
    total_borrowed: float
    outstanding_net: float
    # Tier 3 — + investments + physical assets
    grand2_with_investments: float
    investment_value: float
    investment_breakdown: List[AccountTypeBreakdown] = []
    asset_value: float
    # Legacy aliases kept for backward compatibility
    net_worth: float
    account_balance: float
    account_breakdown: List[AccountTypeBreakdown] = []


# ─────────────────────────────────────────
# TRANSFERS
# ─────────────────────────────────────────

class TransferCreate(BaseModel):
    from_account_id: UUID
    to_account_id: UUID
    amount: float
    txn_date: date
    note: Optional[str] = None


class TransferResponse(BaseModel):
    id: UUID
    user_id: UUID
    from_account_id: UUID
    to_account_id: UUID
    from_account_name: Optional[str] = None
    to_account_name: Optional[str] = None
    amount: float
    txn_date: date
    note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────
# EXPENSE CATEGORY TRENDS
# ─────────────────────────────────────────

class CategoryTrendItem(BaseModel):
    category_id: Optional[str] = None
    category_name: str
    monthly_amounts: List[float]
    total: float


class ExpenseCategoryTrendsResponse(BaseModel):
    month_labels: List[str]
    categories: List[CategoryTrendItem]


# ─────────────────────────────────────────
# MONTHLY BALANCE RECONCILIATION
# ─────────────────────────────────────────

class MonthlyBalanceUpsert(BaseModel):
    year: int
    month: int
    opening_balance: Optional[float] = None
    manual_adj: float = 0.0
    note: Optional[str] = None


class MonthlyBalanceRow(BaseModel):
    year: int
    month: int
    label: str
    opening_balance: Optional[float] = None
    income: float
    expenses: float
    computed_closing: Optional[float] = None
    manual_adj: float
    actual_closing: Optional[float] = None
    note: Optional[str] = None
    is_draft: bool


class MonthlyBalanceListResponse(BaseModel):
    account_id: str
    account_name: str
    rows: List[MonthlyBalanceRow]


class ReconciliationAccountEntry(BaseModel):
    account_id: str
    account_name: str
    owner_name: Optional[str] = None
    is_mine: bool
    rows: List[MonthlyBalanceRow]


class ReconciliationReportResponse(BaseModel):
    mine: List[ReconciliationAccountEntry]
    family: List[ReconciliationAccountEntry]