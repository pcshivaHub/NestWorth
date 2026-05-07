from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from db import engine, SessionLocal
from models import Base
from schemas import (
    AccountCreate, AccountResponse,
    CategoryCreate, CategoryResponse,
    TransactionCreate,
    SummaryResponse, BalanceResponse,
)
import crud

app = FastAPI(title="Home Finance API", version="1.0.0")

# ─────────────────────────────────────────
# ✅ CORS — Required for React Native / web clients
# ─────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auto-create tables on startup
Base.metadata.create_all(bind=engine)


# ─────────────────────────────────────────
# DB Dependency
# ─────────────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─────────────────────────────────────────
# ROOT
# ─────────────────────────────────────────
@app.get("/")
def read_root():
    return {"message": "Home Finance API is running ✅"}


# ─────────────────────────────────────────
# ACCOUNTS
# ─────────────────────────────────────────
@app.post("/accounts", response_model=AccountResponse, status_code=201)
def create_account(account: AccountCreate, db: Session = Depends(get_db)):
    return crud.create_account(db, account)


@app.get("/accounts", response_model=List[AccountResponse])
def get_accounts(db: Session = Depends(get_db)):
    return crud.get_accounts(db)


@app.get("/accounts/{account_id}/balance", response_model=BalanceResponse)
def get_account_balance(account_id: UUID, db: Session = Depends(get_db)):
    result = crud.get_account_balance(db, account_id)
    if not result:
        raise HTTPException(status_code=404, detail="Account not found")
    return result


@app.put("/accounts/{account_id}", response_model=AccountResponse)
def update_account(account_id: UUID, account: AccountCreate, db: Session = Depends(get_db)):
    return crud.update_account(db, account_id, account)


@app.delete("/accounts/{account_id}")
def delete_account(account_id: UUID, db: Session = Depends(get_db)):
    crud.delete_account(db, account_id)
    return {"message": "Account deleted"}


# ─────────────────────────────────────────
# CATEGORIES
# ─────────────────────────────────────────
@app.post("/categories", response_model=CategoryResponse, status_code=201)
def create_category(category: CategoryCreate, db: Session = Depends(get_db)):
    return crud.create_category(db, category)


@app.get("/categories", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    return crud.get_categories(db)


@app.put("/categories/{category_id}", response_model=CategoryResponse)
def update_category(category_id: UUID, category: CategoryCreate, db: Session = Depends(get_db)):
    return crud.update_category(db, category_id, category)


@app.delete("/categories/{category_id}")
def delete_category(category_id: UUID, db: Session = Depends(get_db)):
    crud.delete_category(db, category_id)
    return {"message": "Category deleted"}


# ─────────────────────────────────────────
# TRANSACTIONS
# ─────────────────────────────────────────
@app.post("/transactions", status_code=201)
def create_transaction(txn: TransactionCreate, db: Session = Depends(get_db)):
    return crud.create_transaction(db, txn)


@app.get("/transactions")
def get_transactions(
    type: Optional[str] = None,   # ?type=income or ?type=expense
    db: Session = Depends(get_db)
):
    # ✅ Validates filter value
    if type and type not in ("income", "expense"):
        raise HTTPException(status_code=400, detail="type must be 'income' or 'expense'")
    return crud.get_transactions(db, type=type)


@app.put("/transactions/{transaction_id}")
def update_transaction(transaction_id: UUID, txn: TransactionCreate, db: Session = Depends(get_db)):
    return crud.update_transaction(db, transaction_id, txn)


@app.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: UUID, db: Session = Depends(get_db)):
    crud.delete_transaction(db, transaction_id)
    return {"message": "Transaction deleted"}


# ─────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────
@app.get("/summary", response_model=SummaryResponse)
def summary(db: Session = Depends(get_db)):
    return crud.get_summary(db)
