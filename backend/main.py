from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional, Tuple
from uuid import UUID

from db import engine, SessionLocal
from models import Base
from schemas import (
    AccountCreate, AccountResponse,
    CategoryCreate, CategoryResponse,
    TransactionCreate,
    SummaryResponse, BalanceResponse, AccountBalanceHistoryResponse,
    DepositDetailCreate, DepositDetailResponse, CloseDepositRequest,
    FamilyCreate, JoinFamilyRequest, FamilyResponse, NewInviteCodeResponse,
    TrendResponse, CategoryBreakdownResponse, BudgetVsActualResponse,
    NetWorthTrendResponse, FamilyBreakdownResponse,
    AssetCreate, AssetResponse, AssetPortfolioResponse,
    OutstandingCreate, OutstandingResponse, OutstandingsSummary,
    NetWorthSnapshotResponse, ExpenseCategoryTrendsResponse,
    TransferCreate, TransferResponse,
)
from auth import get_current_user
import crud

app = FastAPI(title="NestWorth API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


# ─────────────────────────────────────────
# DEPENDENCIES
# ─────────────────────────────────────────

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_ctx(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
) -> Tuple[Session, str]:
    return db, current_user


# ─────────────────────────────────────────
# ROOT
# ─────────────────────────────────────────

@app.get("/")
def read_root():
    return {"message": "NestWorth API is running ✅"}


# ─────────────────────────────────────────
# FAMILY
# ─────────────────────────────────────────

@app.post("/family", response_model=FamilyResponse, status_code=201)
def create_family(
    body: FamilyCreate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    try:
        family = crud.create_family(db, current_user, body.name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return _family_response(family)


@app.post("/family/join", response_model=FamilyResponse)
def join_family(
    body: JoinFamilyRequest,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    try:
        family = crud.join_family(db, current_user, body.invite_code)
    except ValueError as e:
        status = 404 if "Invalid invite code" in str(e) else 400
        raise HTTPException(status_code=status, detail=str(e))
    return _family_response(family)


@app.get("/family", response_model=FamilyResponse)
def get_family(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    family = crud.get_family_with_members(db, current_user)
    if not family:
        raise HTTPException(status_code=404, detail="User is not in a family.")
    return _family_response(family)


@app.delete("/family/leave")
def leave_family(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    try:
        crud.leave_family(db, current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"message": "Left the family successfully."}


@app.post("/family/regenerate-code", response_model=NewInviteCodeResponse)
def regenerate_code(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    try:
        new_code = crud.regenerate_invite_code(db, current_user)
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    return {"invite_code": new_code}


def _family_response(family) -> dict:
    return {
        "id": family.id,
        "name": family.name,
        "invite_code": family.invite_code,
        "created_by": family.created_by,
        "members": [
            {
                "user_id": m.user_id,
                "role": m.role,
                "joined_at": m.joined_at,
                "display_name": None,
            }
            for m in family.members
        ],
    }


# ─────────────────────────────────────────
# ACCOUNTS
# ─────────────────────────────────────────

@app.post("/accounts", response_model=AccountResponse, status_code=201)
def create_account(
    account: AccountCreate,
    ctx: Tuple[Session, str] = Depends(get_ctx),
):
    db, user_id = ctx
    return crud.create_account(db, account, user_id=user_id)


@app.get("/accounts", response_model=List[AccountResponse])
def get_accounts(ctx: Tuple[Session, str] = Depends(get_ctx)):
    db, user_id = ctx
    return crud.get_accounts(db, user_id)


@app.get("/accounts/{account_id}/balance", response_model=BalanceResponse)
def get_account_balance(
    account_id: UUID,
    ctx: Tuple[Session, str] = Depends(get_ctx),
):
    db, user_id = ctx
    result = crud.get_account_balance(db, account_id, user_id)
    if not result:
        raise HTTPException(status_code=404, detail="Account not found")
    return result


@app.get("/accounts/{account_id}/balance-history", response_model=AccountBalanceHistoryResponse)
def get_account_balance_history(
    account_id: UUID,
    months: int = 6,
    ctx: Tuple[Session, str] = Depends(get_ctx),
):
    db, user_id = ctx
    history = crud.get_account_balance_history(db, account_id, user_id, months)
    if history is None:
        raise HTTPException(status_code=404, detail="Account not found")
    return {"history": history}


@app.post("/accounts/{account_id}/deposit", response_model=DepositDetailResponse, status_code=201)
def create_deposit_detail(
    account_id: UUID,
    data: DepositDetailCreate,
    ctx: Tuple[Session, str] = Depends(get_ctx),
):
    db, user_id = ctx
    account = crud.get_account(db, account_id, user_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return crud.create_deposit_detail(db, account_id, data, account.type)


@app.get("/accounts/{account_id}/deposit", response_model=DepositDetailResponse)
def get_deposit_detail(
    account_id: UUID,
    ctx: Tuple[Session, str] = Depends(get_ctx),
):
    db, user_id = ctx
    if not crud.get_account(db, account_id, user_id):
        raise HTTPException(status_code=404, detail="Account not found")
    detail = crud.get_deposit_detail(db, account_id)
    if not detail:
        raise HTTPException(status_code=404, detail="No deposit record found")
    return detail


@app.post("/accounts/{account_id}/deposit/close", response_model=DepositDetailResponse)
def close_deposit(
    account_id: UUID,
    data: CloseDepositRequest,
    ctx: Tuple[Session, str] = Depends(get_ctx),
):
    db, user_id = ctx
    try:
        return crud.close_deposit(db, account_id, data, user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.put("/accounts/{account_id}", response_model=AccountResponse)
def update_account(
    account_id: UUID,
    account: AccountCreate,
    ctx: Tuple[Session, str] = Depends(get_ctx),
):
    db, user_id = ctx
    try:
        return crud.update_account(db, account_id, account, user_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.delete("/accounts/{account_id}")
def delete_account(
    account_id: UUID,
    ctx: Tuple[Session, str] = Depends(get_ctx),
):
    db, user_id = ctx
    crud.delete_account(db, account_id, user_id)
    return {"message": "Account deleted"}


# ─────────────────────────────────────────
# CATEGORIES
# ─────────────────────────────────────────

@app.post("/categories", response_model=CategoryResponse, status_code=201)
def create_category(
    category: CategoryCreate,
    ctx: Tuple[Session, str] = Depends(get_ctx),
):
    db, user_id = ctx
    return crud.create_category(db, category, user_id)


@app.get("/categories", response_model=List[CategoryResponse])
def get_categories(ctx: Tuple[Session, str] = Depends(get_ctx)):
    db, user_id = ctx
    return crud.get_categories(db, user_id)


@app.put("/categories/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: UUID,
    category: CategoryCreate,
    ctx: Tuple[Session, str] = Depends(get_ctx),
):
    db, user_id = ctx
    try:
        return crud.update_category(db, category_id, category, user_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.delete("/categories/{category_id}")
def delete_category(
    category_id: UUID,
    ctx: Tuple[Session, str] = Depends(get_ctx),
):
    db, user_id = ctx
    crud.delete_category(db, category_id, user_id)
    return {"message": "Category deleted"}


# ─────────────────────────────────────────
# TRANSACTIONS
# ─────────────────────────────────────────

@app.post("/transactions", status_code=201)
def create_transaction(
    txn: TransactionCreate,
    ctx: Tuple[Session, str] = Depends(get_ctx),
):
    db, user_id = ctx
    return crud.create_transaction(db, txn, user_id=user_id)


@app.get("/transactions")
def get_transactions(
    type: Optional[str] = None,
    ctx: Tuple[Session, str] = Depends(get_ctx),
):
    db, user_id = ctx
    if type and type not in ("income", "expense"):
        raise HTTPException(status_code=400, detail="type must be 'income' or 'expense'")
    return crud.get_transactions(db, user_id, type=type)


@app.put("/transactions/{transaction_id}")
def update_transaction(
    transaction_id: UUID,
    txn: TransactionCreate,
    ctx: Tuple[Session, str] = Depends(get_ctx),
):
    db, _ = ctx
    try:
        return crud.update_transaction(db, transaction_id, txn)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.delete("/transactions/{transaction_id}")
def delete_transaction(
    transaction_id: UUID,
    ctx: Tuple[Session, str] = Depends(get_ctx),
):
    db, _ = ctx
    crud.delete_transaction(db, transaction_id)
    return {"message": "Transaction deleted"}


# ─────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────

@app.get("/summary", response_model=SummaryResponse)
def summary(
    period: str = "month",
    ctx: Tuple[Session, str] = Depends(get_ctx),
):
    db, user_id = ctx
    if period not in ("week", "month", "year"):
        raise HTTPException(status_code=400, detail="period must be 'week', 'month', or 'year'")
    return crud.get_summary(db, user_id, period=period)


# ─────────────────────────────────────────
# REPORTS
# ─────────────────────────────────────────

@app.get("/reports/trend", response_model=TrendResponse)
def report_trend(months: int = 6, ctx: Tuple[Session, str] = Depends(get_ctx)):
    db, uid = ctx
    if months not in (6, 12):
        raise HTTPException(status_code=400, detail="months must be 6 or 12")
    return crud.get_income_expense_trend(db, uid, months=months)


@app.get("/reports/category-breakdown", response_model=CategoryBreakdownResponse)
def report_category_breakdown(period: str = "month", ctx: Tuple[Session, str] = Depends(get_ctx)):
    db, uid = ctx
    if period not in ("week", "month", "year"):
        raise HTTPException(status_code=400, detail="invalid period")
    return crud.get_category_breakdown(db, uid, period=period)


@app.get("/reports/budget-vs-actual", response_model=BudgetVsActualResponse)
def report_budget_vs_actual(period: str = "month", ctx: Tuple[Session, str] = Depends(get_ctx)):
    db, uid = ctx
    if period not in ("week", "month", "year"):
        raise HTTPException(status_code=400, detail="invalid period")
    return crud.get_budget_vs_actual(db, uid, period=period)


@app.get("/reports/net-worth-trend", response_model=NetWorthTrendResponse)
def report_net_worth_trend(months: int = 6, ctx: Tuple[Session, str] = Depends(get_ctx)):
    db, uid = ctx
    if months not in (6, 12):
        raise HTTPException(status_code=400, detail="months must be 6 or 12")
    return crud.get_net_worth_trend(db, uid, months=months)


@app.get("/reports/family-breakdown", response_model=FamilyBreakdownResponse)
def report_family_breakdown(period: str = "month", ctx: Tuple[Session, str] = Depends(get_ctx)):
    db, uid = ctx
    if period not in ("week", "month", "year"):
        raise HTTPException(status_code=400, detail="invalid period")
    return crud.get_family_breakdown(db, uid, period=period)


@app.get("/reports/asset-portfolio", response_model=AssetPortfolioResponse)
def report_asset_portfolio(ctx: Tuple[Session, str] = Depends(get_ctx)):
    db, uid = ctx
    return crud.get_asset_portfolio(db, uid)


@app.get("/reports/net-worth-snapshot", response_model=NetWorthSnapshotResponse)
def report_net_worth_snapshot(ctx: Tuple[Session, str] = Depends(get_ctx)):
    db, uid = ctx
    return crud.get_net_worth_snapshot(db, uid)


@app.get("/reports/expense-category-trends", response_model=ExpenseCategoryTrendsResponse)
def report_expense_category_trends(months: int = 6, ctx: Tuple[Session, str] = Depends(get_ctx)):
    db, uid = ctx
    if months not in (6, 12):
        raise HTTPException(status_code=400, detail="months must be 6 or 12")
    return crud.get_expense_category_trends(db, uid, months=months)


# ─────────────────────────────────────────
# OUTSTANDINGS
# ─────────────────────────────────────────

@app.get("/outstandings", response_model=OutstandingsSummary)
def get_outstandings(settled: bool = False, ctx: Tuple[Session, str] = Depends(get_ctx)):
    db, uid = ctx
    items = crud.get_outstandings(db, uid, settled=settled)
    total_lent     = sum(float(o.amount) for o in items if o.direction == "lent")
    total_borrowed = sum(float(o.amount) for o in items if o.direction == "borrowed")
    return {
        "total_lent": round(total_lent, 2),
        "total_borrowed": round(total_borrowed, 2),
        "net_outstanding": round(total_lent - total_borrowed, 2),
        "items": items,
    }


@app.post("/outstandings", response_model=OutstandingResponse, status_code=201)
def create_outstanding(data: OutstandingCreate, ctx: Tuple[Session, str] = Depends(get_ctx)):
    db, uid = ctx
    if data.direction not in ("lent", "borrowed"):
        raise HTTPException(status_code=400, detail="direction must be 'lent' or 'borrowed'")
    return crud.create_outstanding(db, data, uid)


@app.post("/outstandings/{outstanding_id}/settle", response_model=OutstandingResponse)
def settle_outstanding(outstanding_id: UUID, ctx: Tuple[Session, str] = Depends(get_ctx)):
    db, uid = ctx
    try:
        return crud.settle_outstanding(db, outstanding_id, uid)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.delete("/outstandings/{outstanding_id}")
def delete_outstanding(outstanding_id: UUID, ctx: Tuple[Session, str] = Depends(get_ctx)):
    db, uid = ctx
    crud.delete_outstanding(db, outstanding_id, uid)
    return {"message": "Deleted"}


# ─────────────────────────────────────────
# TRANSFERS
# ─────────────────────────────────────────

@app.post("/transfers", response_model=TransferResponse, status_code=201)
def create_transfer(
    data: TransferCreate,
    ctx: Tuple[Session, str] = Depends(get_ctx),
):
    db, user_id = ctx
    if data.from_account_id == data.to_account_id:
        raise HTTPException(status_code=400, detail="Cannot transfer to the same account")
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    return crud.create_transfer(db, data, user_id)


@app.get("/accounts/{account_id}/transfers", response_model=List[TransferResponse])
def get_account_transfers(
    account_id: UUID,
    ctx: Tuple[Session, str] = Depends(get_ctx),
):
    db, user_id = ctx
    if not crud.get_account(db, account_id, user_id):
        raise HTTPException(status_code=404, detail="Account not found")
    return crud.get_transfers_for_account(db, account_id, user_id)


@app.delete("/transfers/{transfer_id}")
def delete_transfer(
    transfer_id: UUID,
    ctx: Tuple[Session, str] = Depends(get_ctx),
):
    db, user_id = ctx
    crud.delete_transfer(db, transfer_id, user_id)
    return {"message": "Transfer deleted"}


# ─────────────────────────────────────────
# ASSETS
# ─────────────────────────────────────────

@app.post("/assets", response_model=AssetResponse, status_code=201)
def create_asset_route(data: AssetCreate, ctx: Tuple[Session, str] = Depends(get_ctx)):
    db, uid = ctx
    return crud.create_asset(db, data, uid)


@app.get("/assets", response_model=List[AssetResponse])
def get_assets_route(ctx: Tuple[Session, str] = Depends(get_ctx)):
    db, uid = ctx
    return crud.get_assets(db, uid)


@app.put("/assets/{asset_id}", response_model=AssetResponse)
def update_asset_route(asset_id: UUID, data: AssetCreate, ctx: Tuple[Session, str] = Depends(get_ctx)):
    db, uid = ctx
    try:
        return crud.update_asset(db, asset_id, data, uid)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.delete("/assets/{asset_id}")
def delete_asset_route(asset_id: UUID, ctx: Tuple[Session, str] = Depends(get_ctx)):
    db, uid = ctx
    crud.delete_asset(db, asset_id, uid)
    return {"message": "Asset deleted"}
