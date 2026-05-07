from sqlalchemy.orm import Session
from models import Account, Transaction, Category
from schemas import AccountCreate, CategoryCreate, TransactionCreate
from uuid import UUID
from typing import Optional


# ─────────────────────────────────────────
# ACCOUNTS
# ─────────────────────────────────────────

def create_account(db: Session, account: AccountCreate):
    obj = Account(
        name=account.name,
        type=account.type,
        opening_balance=account.opening_balance,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_accounts(db: Session):
    return db.query(Account).all()


def get_account(db: Session, account_id: UUID):
    return db.query(Account).filter(Account.id == account_id).first()


def get_account_balance(db: Session, account_id: UUID):
    account = get_account(db, account_id)
    if not account:
        return None

    txns = db.query(Transaction).filter(Transaction.account_id == account_id).all()
    balance = float(account.opening_balance or 0)

    for t in txns:
        if t.type == "income":
            balance += float(t.amount)
        else:
            balance -= float(t.amount)

    return {"account": account.name, "balance": balance}


def update_account(db: Session, account_id: UUID, data):
    obj = db.query(Account).filter(Account.id == account_id).first()
    if not obj:
        raise ValueError("Account not found")
    obj.name = data.name
    obj.type = data.type
    obj.opening_balance = data.opening_balance
    db.commit()
    db.refresh(obj)
    return obj


def delete_account(db: Session, account_id: UUID):
    obj = db.query(Account).filter(Account.id == account_id).first()
    if obj:
        db.delete(obj)
        db.commit()


# ─────────────────────────────────────────
# CATEGORIES
# ─────────────────────────────────────────

def create_category(db: Session, category: CategoryCreate):
    # ✅ Fixed: was passing object but unpacking fields — now consistent
    obj = Category(
        name=category.name,
        kind=category.kind,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_categories(db: Session):
    return db.query(Category).all()


def update_category(db: Session, category_id: UUID, data):
    obj = db.query(Category).filter(Category.id == category_id).first()
    if not obj:
        raise ValueError("Category not found")
    obj.name = data.name
    obj.kind = data.kind
    db.commit()
    db.refresh(obj)
    return obj


def delete_category(db: Session, category_id: UUID):
    obj = db.query(Category).filter(Category.id == category_id).first()
    if obj:
        db.delete(obj)
        db.commit()


# ─────────────────────────────────────────
# TRANSACTIONS
# ─────────────────────────────────────────

def create_transaction(db: Session, txn: TransactionCreate):
    obj = Transaction(
        account_id=txn.account_id,
        category_id=txn.category_id,
        amount=txn.amount,
        type=txn.type,
        txn_date=txn.txn_date,
        note=txn.note,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_transactions(db: Session, type: Optional[str] = None):
    """
    Returns transactions joined with account + category names.
    Optionally filter by type: 'income' or 'expense'.
    """
    query = db.query(Transaction)

    if type in ("income", "expense"):
        query = query.filter(Transaction.type == type)

    txns = query.order_by(Transaction.txn_date.desc()).all()

    result = []
    for t in txns:
        result.append({
            "id": str(t.id),
            "account_id": str(t.account_id),
            "category_id": str(t.category_id),
            "account_name": t.account.name if t.account else None,
            "category_name": t.category.name if t.category else None,
            "amount": float(t.amount),
            "type": t.type,
            "txn_date": t.txn_date,
            "note": t.note,
        })

    return result


def update_transaction(db: Session, transaction_id: UUID, data):
    obj = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not obj:
        raise ValueError("Transaction not found")
    obj.account_id = data.account_id
    obj.category_id = data.category_id
    obj.amount = data.amount
    obj.type = data.type
    obj.txn_date = data.txn_date
    obj.note = data.note
    db.commit()
    db.refresh(obj)
    return obj


def delete_transaction(db: Session, transaction_id: UUID):
    obj = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if obj:
        db.delete(obj)
        db.commit()


def get_summary(db: Session):
    txns = db.query(Transaction).all()
    income = sum(float(t.amount) for t in txns if t.type == "income")
    expense = sum(float(t.amount) for t in txns if t.type == "expense")
    return {
        "total_income": income,
        "total_expense": expense,
        "net": income - expense,
    }
