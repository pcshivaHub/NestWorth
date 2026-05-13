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
    SummaryResponse, BalanceResponse,
    FamilyCreate, JoinFamilyRequest, FamilyResponse, NewInviteCodeResponse,
    TrendResponse, CategoryBreakdownResponse, BudgetVsActualResponse,
    NetWorthTrendResponse, FamilyBreakdownResponse,
    AssetCreate, AssetResponse, AssetPortfolioResponse,
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
