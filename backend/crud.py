import secrets
import string
from calendar import monthrange
from collections import defaultdict
from sqlalchemy.orm import Session
from models import Account, Transaction, Category, Family, FamilyMember, Asset, AssetValueHistory, Outstanding, DepositDetail, Transfer
from schemas import AccountCreate, CategoryCreate, TransactionCreate
from uuid import UUID
from datetime import date, timedelta
from typing import Optional, List


# ─────────────────────────────────────────
# FAMILY HELPERS
# ─────────────────────────────────────────

_CODE_CHARS = string.ascii_uppercase + string.digits


def _generate_code() -> str:
    return "NESTW-" + "".join(secrets.choice(_CODE_CHARS) for _ in range(4))


def generate_invite_code(db: Session) -> str:
    for _ in range(10):
        code = _generate_code()
        if not db.query(Family).filter(Family.invite_code == code).first():
            return code
    raise RuntimeError("Could not generate a unique invite code. Please try again.")


def get_family_for_user(db: Session, user_id: str) -> Optional[Family]:
    member = db.query(FamilyMember).filter(
        FamilyMember.user_id == UUID(user_id)
    ).first()
    if not member:
        return None
    return db.query(Family).filter(Family.id == member.family_id).first()


def get_family_member_ids(db: Session, user_id: str) -> List[str]:
    family = get_family_for_user(db, user_id)
    if not family:
        return [user_id]
    return [str(m.user_id) for m in family.members]


def ensure_user_has_family(db: Session, user_id: str) -> Family:
    family = get_family_for_user(db, user_id)
    if family:
        return family
    return create_family(db, user_id, "My Family")


# ─────────────────────────────────────────
# FAMILY CRUD
# ─────────────────────────────────────────

def create_family(db: Session, user_id: str, name: str) -> Family:
    if get_family_for_user(db, user_id):
        raise ValueError("User is already a member of a family.")

    code = generate_invite_code(db)
    family = Family(name=name, invite_code=code, created_by=UUID(user_id))
    db.add(family)
    db.flush()

    member = FamilyMember(family_id=family.id, user_id=UUID(user_id), role="admin")
    db.add(member)

    # Backfill: assign any existing unscoped categories referenced by this user's transactions
    user_uuid = UUID(user_id)
    used_category_ids = (
        db.query(Transaction.category_id)
        .filter(Transaction.user_id == user_uuid)
        .distinct()
        .all()
    )
    cat_ids = [row[0] for row in used_category_ids]
    if cat_ids:
        db.query(Category).filter(
            Category.id.in_(cat_ids),
            Category.family_id.is_(None),
        ).update({"family_id": family.id}, synchronize_session=False)

    db.commit()
    db.refresh(family)
    return family


def join_family(db: Session, user_id: str, invite_code: str) -> Family:
    if get_family_for_user(db, user_id):
        raise ValueError("User is already a member of a family.")

    family = db.query(Family).filter(
        Family.invite_code == invite_code.upper().strip()
    ).first()
    if not family:
        raise ValueError("Invalid invite code.")

    member = FamilyMember(family_id=family.id, user_id=UUID(user_id), role="member")
    db.add(member)
    db.commit()
    db.refresh(family)
    return family


def get_family(db: Session, family_id: UUID) -> Optional[Family]:
    return db.query(Family).filter(Family.id == family_id).first()


def get_family_with_members(db: Session, user_id: str) -> Optional[Family]:
    family = get_family_for_user(db, user_id)
    if not family:
        return None
    db.refresh(family)
    return family


def leave_family(db: Session, user_id: str) -> None:
    family = get_family_for_user(db, user_id)
    if not family:
        raise ValueError("User is not in a family.")

    member = db.query(FamilyMember).filter(
        FamilyMember.family_id == family.id,
        FamilyMember.user_id == UUID(user_id),
    ).first()

    other_members = [m for m in family.members if str(m.user_id) != user_id]

    if member.role == "admin" and other_members:
        raise ValueError("Transfer admin role to another member before leaving.")

    if not other_members:
        # Last member — delete the whole family (cascade handles members + categories)
        db.delete(family)
    else:
        db.delete(member)

    db.commit()


def regenerate_invite_code(db: Session, user_id: str) -> str:
    family = get_family_for_user(db, user_id)
    if not family:
        raise ValueError("User is not in a family.")

    member = db.query(FamilyMember).filter(
        FamilyMember.family_id == family.id,
        FamilyMember.user_id == UUID(user_id),
    ).first()
    if not member or member.role != "admin":
        raise ValueError("Only the family admin can regenerate the invite code.")

    new_code = generate_invite_code(db)
    family.invite_code = new_code
    db.commit()
    return new_code


# ─────────────────────────────────────────
# ACCOUNTS
# ─────────────────────────────────────────

def create_account(db: Session, account: AccountCreate, user_id=None):
    obj = Account(
        user_id=user_id,
        name=account.name,
        type=account.type,
        opening_balance=account.opening_balance,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_accounts(db: Session, user_id: str):
    member_ids = [UUID(uid) for uid in get_family_member_ids(db, user_id)]
    return db.query(Account).filter(Account.user_id.in_(member_ids)).all()


def get_account(db: Session, account_id: UUID, user_id: str):
    member_ids = [UUID(uid) for uid in get_family_member_ids(db, user_id)]
    return (
        db.query(Account)
        .filter(Account.id == account_id, Account.user_id.in_(member_ids))
        .first()
    )


def _transfer_delta(db: Session, account_id: UUID) -> float:
    """Net effect of transfers on an account balance (+in, -out)."""
    from sqlalchemy import func
    transferred_in  = db.query(func.sum(Transfer.amount)).filter(Transfer.to_account_id   == account_id).scalar() or 0
    transferred_out = db.query(func.sum(Transfer.amount)).filter(Transfer.from_account_id == account_id).scalar() or 0
    return float(transferred_in) - float(transferred_out)


def get_account_balance(db: Session, account_id: UUID, user_id: str):
    account = get_account(db, account_id, user_id)
    if not account:
        return None

    txns = db.query(Transaction).filter(Transaction.account_id == account_id).all()
    balance = float(account.opening_balance or 0)
    for t in txns:
        balance += float(t.amount) if t.type == "income" else -float(t.amount)
    balance += _transfer_delta(db, account_id)

    return {"account": account.name, "balance": balance}


def get_account_balance_history(db: Session, account_id: UUID, user_id: str, months: int = 6):
    account = get_account(db, account_id, user_id)
    if not account:
        return None

    today = date.today()
    # Start from the first day of (months) months ago
    start = date(today.year, today.month, 1)
    for _ in range(months - 1):
        start = (start.replace(day=1) - timedelta(days=1)).replace(day=1)

    # Balance at start of period: opening + prior transactions + prior transfers
    prior_txns = (
        db.query(Transaction)
        .filter(Transaction.account_id == account_id, Transaction.txn_date < start)
        .all()
    )
    running = float(account.opening_balance or 0)
    for t in prior_txns:
        running += float(t.amount) if t.type == "income" else -float(t.amount)

    prior_in  = db.query(Transfer).filter(Transfer.to_account_id   == account_id, Transfer.txn_date < start).all()
    prior_out = db.query(Transfer).filter(Transfer.from_account_id == account_id, Transfer.txn_date < start).all()
    for tr in prior_in:
        running += float(tr.amount)
    for tr in prior_out:
        running -= float(tr.amount)

    # Transactions + transfers within the period, grouped by month
    period_txns = (
        db.query(Transaction)
        .filter(Transaction.account_id == account_id, Transaction.txn_date >= start)
        .all()
    )
    monthly_net = defaultdict(float)
    for t in period_txns:
        key = (t.txn_date.year, t.txn_date.month)
        monthly_net[key] += float(t.amount) if t.type == "income" else -float(t.amount)

    period_in  = db.query(Transfer).filter(Transfer.to_account_id   == account_id, Transfer.txn_date >= start).all()
    period_out = db.query(Transfer).filter(Transfer.from_account_id == account_id, Transfer.txn_date >= start).all()
    for tr in period_in:
        monthly_net[(tr.txn_date.year, tr.txn_date.month)] += float(tr.amount)
    for tr in period_out:
        monthly_net[(tr.txn_date.year, tr.txn_date.month)] -= float(tr.amount)

    result = []
    cur = start
    for _ in range(months):
        running += monthly_net.get((cur.year, cur.month), 0)
        result.append({"label": cur.strftime("%b '%y"), "balance": round(running, 2)})
        if cur.month == 12:
            cur = cur.replace(year=cur.year + 1, month=1)
        else:
            cur = cur.replace(month=cur.month + 1)

    return result


def update_account(db: Session, account_id: UUID, data, user_id: str):
    obj = get_account(db, account_id, user_id)
    if not obj:
        raise ValueError("Account not found")
    obj.name = data.name
    obj.type = data.type
    obj.opening_balance = data.opening_balance
    if data.user_id is not None:
        obj.user_id = data.user_id
    db.commit()
    db.refresh(obj)
    return obj


def delete_account(db: Session, account_id: UUID, user_id: str):
    obj = get_account(db, account_id, user_id)
    if obj:
        db.delete(obj)
        db.commit()


# ─────────────────────────────────────────
# DEPOSITS (FD / RD)
# ─────────────────────────────────────────

def _fd_maturity(principal: float, rate: float, months: int) -> float:
    """Annual compound interest: A = P(1 + r/100)^(months/12)"""
    return round(principal * ((1 + rate / 100) ** (months / 12)), 0)


def _rd_maturity(monthly: float, rate: float, months: int) -> float:
    """Quarterly compounding: sum each installment compounded for remaining quarters."""
    r = rate / 400  # quarterly rate
    total = sum(monthly * ((1 + r) ** ((months - i) / 3)) for i in range(months))
    return round(total, 0)


def _add_months(d: date, months: int) -> date:
    month = d.month - 1 + months
    year = d.year + month // 12
    month = month % 12 + 1
    day = min(d.day, [31, 29 if year % 4 == 0 else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
    return date(year, month, day)


def create_deposit_detail(db: Session, account_id: UUID, data, deposit_type: str):
    start = data.start_date or date.today()
    maturity_date = data.maturity_date or _add_months(start, data.tenure_months)

    if data.maturity_amount is not None:
        maturity_amount = data.maturity_amount
    elif deposit_type == "fd":
        maturity_amount = _fd_maturity(data.principal_amount, data.interest_rate, data.tenure_months)
    else:
        maturity_amount = _rd_maturity(data.monthly_installment or 0, data.interest_rate, data.tenure_months)

    obj = DepositDetail(
        account_id=account_id,
        principal_amount=data.principal_amount,
        monthly_installment=data.monthly_installment,
        interest_rate=data.interest_rate,
        tenure_months=data.tenure_months,
        maturity_amount=maturity_amount,
        maturity_date=maturity_date,
        start_date=start,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_deposit_detail(db: Session, account_id: UUID):
    return db.query(DepositDetail).filter(DepositDetail.account_id == account_id).first()


def close_deposit(db: Session, account_id: UUID, data, user_id: str):
    deposit = db.query(DepositDetail).filter(DepositDetail.account_id == account_id).first()
    if not deposit:
        raise ValueError("Deposit not found")
    if deposit.is_closed:
        raise ValueError("Deposit already closed")

    # Find or create a "Deposit Closure" income category scoped to the user's family
    family = get_family_for_user(db, user_id)
    category = db.query(Category).filter(
        Category.name == "Deposit Closure",
        Category.kind == "income",
        Category.family_id == (family.id if family else None),
    ).first()
    if not category:
        category = Category(
            family_id=family.id if family else None,
            name="Deposit Closure",
            kind="income",
        )
        db.add(category)
        db.flush()

    closed_date = data.closed_date or date.today()
    txn = Transaction(
        user_id=UUID(user_id),
        account_id=data.transferred_to_account_id,
        category_id=category.id,
        amount=data.closing_amount,
        type="income",
        txn_date=closed_date,
        note="Deposit closure / maturity transfer",
    )
    db.add(txn)

    deposit.is_closed = True
    deposit.closing_amount = data.closing_amount
    deposit.closed_date = closed_date
    deposit.transferred_to_account_id = data.transferred_to_account_id
    db.commit()
    db.refresh(deposit)
    return deposit


# ─────────────────────────────────────────
# CATEGORIES
# ─────────────────────────────────────────

def _get_user_family_id(db: Session, user_id: str) -> Optional[UUID]:
    family = get_family_for_user(db, user_id)
    return family.id if family else None


def create_category(db: Session, category: CategoryCreate, user_id: str):
    family_id = _get_user_family_id(db, user_id)
    obj = Category(
        family_id=family_id,
        name=category.name,
        kind=category.kind,
        budget=category.budget,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_categories(db: Session, user_id: str):
    family_id = _get_user_family_id(db, user_id)
    if family_id is None:
        return []
    return db.query(Category).filter(Category.family_id == family_id).all()


def update_category(db: Session, category_id: UUID, data, user_id: str):
    family_id = _get_user_family_id(db, user_id)
    obj = db.query(Category).filter(
        Category.id == category_id,
        Category.family_id == family_id,
    ).first()
    if not obj:
        raise ValueError("Category not found")
    obj.name = data.name
    obj.kind = data.kind
    obj.budget = data.budget
    db.commit()
    db.refresh(obj)
    return obj


def delete_category(db: Session, category_id: UUID, user_id: str):
    family_id = _get_user_family_id(db, user_id)
    obj = db.query(Category).filter(
        Category.id == category_id,
        Category.family_id == family_id,
    ).first()
    if obj:
        fallback = db.query(Category).filter(
            Category.kind == obj.kind,
            Category.name == "Uncategorized",
            Category.family_id == family_id,
            Category.id != obj.id,
        ).first()
        if not fallback:
            fallback = Category(
                name="Uncategorized",
                kind=obj.kind,
                family_id=family_id,
            )
            db.add(fallback)
            db.flush()

        db.query(Transaction).filter(Transaction.category_id == category_id).update(
            {"category_id": fallback.id},
            synchronize_session=False,
        )
        db.delete(obj)
        db.commit()


# ─────────────────────────────────────────
# TRANSACTIONS
# ─────────────────────────────────────────

def create_transaction(db: Session, txn: TransactionCreate, user_id=None):
    obj = Transaction(
        user_id=user_id,
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


def get_transactions(db: Session, user_id: str, type: Optional[str] = None):
    member_ids = [UUID(uid) for uid in get_family_member_ids(db, user_id)]
    query = db.query(Transaction).filter(Transaction.user_id.in_(member_ids))

    if type in ("income", "expense"):
        query = query.filter(Transaction.type == type)

    txns = query.order_by(Transaction.txn_date.desc()).all()

    result = []
    for t in txns:
        result.append({
            "id": str(t.id),
            "user_id": str(t.user_id) if t.user_id else None,
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


def get_summary(db: Session, user_id: str, period: str = "month"):
    member_ids = [UUID(uid) for uid in get_family_member_ids(db, user_id)]
    family_id = _get_user_family_id(db, user_id)

    txns = db.query(Transaction).filter(Transaction.user_id.in_(member_ids)).all()
    categories = (
        db.query(Category).filter(Category.family_id == family_id).all()
        if family_id else []
    )
    today = date.today()

    def is_in_period(txn_date):
        if period == "week":
            start = today.toordinal() - ((today.weekday() + 1) % 7)
            return txn_date.toordinal() >= start and txn_date <= today
        if period == "year":
            return txn_date.year == today.year
        return txn_date.year == today.year and txn_date.month == today.month

    period_txns = [t for t in txns if is_in_period(t.txn_date)]
    income = sum(float(t.amount) for t in period_txns if t.type == "income")
    expense = sum(float(t.amount) for t in period_txns if t.type == "expense")

    def build_category_breakup(txn_type):
        by_category = {
            str(c.id): {
                "category_id": str(c.id),
                "category_name": c.name,
                "amount": 0.0,
                "budget": float(c.budget) if c.budget is not None else None,
            }
            for c in categories
            if (c.kind or "").lower() == txn_type
        }

        for t in txns:
            if t.type != txn_type or not is_in_period(t.txn_date):
                continue
            category_id = str(t.category_id) if t.category_id else None
            key = category_id or "uncategorized"
            if key not in by_category:
                by_category[key] = {
                    "category_id": category_id,
                    "category_name": t.category.name if t.category else "Uncategorized",
                    "amount": 0.0,
                    "budget": None,
                }
            by_category[key]["amount"] += float(t.amount)

        return sorted(
            by_category.values(),
            key=lambda item: (-item["amount"], item["category_name"].lower()),
        )

    return {
        "total_income": income,
        "total_expense": expense,
        "net": income - expense,
        "income_by_category": build_category_breakup("income"),
        "expense_by_category": build_category_breakup("expense"),
    }


# ─────────────────────────────────────────
# REPORTS
# ─────────────────────────────────────────

def _month_slots(months: int) -> list:
    """Return list of (year, month) tuples for last N calendar months, oldest first."""
    today = date.today()
    slots = []
    for i in range(months - 1, -1, -1):
        m = (today.month - 1 - i) % 12 + 1
        y = today.year - ((i - (today.month - 1)) // 12 + (1 if (today.month - 1 - i) < 0 else 0))
        slots.append((y, m))
    return slots


def _period_filter(txn_date: date, period: str) -> bool:
    today = date.today()
    if period == "week":
        start_ord = today.toordinal() - ((today.weekday() + 1) % 7)
        return txn_date.toordinal() >= start_ord and txn_date <= today
    if period == "year":
        return txn_date.year == today.year
    return txn_date.year == today.year and txn_date.month == today.month


def get_income_expense_trend(db: Session, user_id: str, months: int = 6) -> dict:
    member_ids = [UUID(uid) for uid in get_family_member_ids(db, user_id)]
    slots = _month_slots(months)

    earliest = date(slots[0][0], slots[0][1], 1)
    txns = (
        db.query(Transaction)
        .filter(Transaction.user_id.in_(member_ids), Transaction.txn_date >= earliest)
        .all()
    )

    month_points = []
    for (y, m) in slots:
        label = date(y, m, 1).strftime("%b %y")
        slot_txns = [t for t in txns if t.txn_date.year == y and t.txn_date.month == m]
        income = sum(float(t.amount) for t in slot_txns if t.type == "income")
        expense = sum(float(t.amount) for t in slot_txns if t.type == "expense")
        month_points.append({"label": label, "income": income, "expense": expense, "net": income - expense})

    nets = [p["net"] for p in month_points]
    avg_net = sum(nets) / len(nets) if nets else 0.0

    best = max(month_points, key=lambda p: p["net"]) if month_points else None
    worst = min(month_points, key=lambda p: p["net"]) if month_points else None

    return {
        "months": month_points,
        "best_month": {"label": best["label"], "net": best["net"]} if best else None,
        "worst_month": {"label": worst["label"], "net": worst["net"]} if worst else None,
        "avg_net": round(avg_net, 2),
    }


def get_category_breakdown(db: Session, user_id: str, period: str = "month") -> dict:
    member_ids = [UUID(uid) for uid in get_family_member_ids(db, user_id)]
    txns = (
        db.query(Transaction)
        .filter(Transaction.user_id.in_(member_ids), Transaction.type == "expense")
        .all()
    )
    period_txns = [t for t in txns if _period_filter(t.txn_date, period)]

    by_cat: dict = {}
    for t in period_txns:
        key = str(t.category_id) if t.category_id else "uncategorized"
        if key not in by_cat:
            by_cat[key] = {
                "category_id": str(t.category_id) if t.category_id else None,
                "category_name": t.category.name if t.category else "Uncategorized",
                "amount": 0.0,
            }
        by_cat[key]["amount"] += float(t.amount)

    total = sum(v["amount"] for v in by_cat.values())
    breakdown = sorted(by_cat.values(), key=lambda x: -x["amount"])
    for item in breakdown:
        item["percentage"] = round(item["amount"] / total * 100, 1) if total else 0.0

    return {"total_expense": total, "breakdown": breakdown}


def get_cc_report(db: Session, user_id: str, period: str = "month") -> dict:
    member_ids = [UUID(uid) for uid in get_family_member_ids(db, user_id)]

    cc_accounts = (
        db.query(Account)
        .filter(Account.user_id.in_(member_ids), Account.type == "credit")
        .all()
    )
    if not cc_accounts:
        return {"total_spend": 0.0, "total_refund": 0.0, "net_spend": 0.0, "cards": [], "by_category": [], "transactions": []}

    cc_ids = [a.id for a in cc_accounts]
    txns = (
        db.query(Transaction)
        .filter(Transaction.account_id.in_(cc_ids))
        .order_by(Transaction.txn_date.desc())
        .all()
    )
    period_txns = [t for t in txns if _period_filter(t.txn_date, period)]

    card_map = {a.id: {"account_id": str(a.id), "account_name": a.name, "spend": 0.0, "refund": 0.0} for a in cc_accounts}
    by_cat: dict = {}

    for t in period_txns:
        if t.type == "expense":
            card_map[t.account_id]["spend"] += float(t.amount)
            key = str(t.category_id) if t.category_id else "uncategorized"
            if key not in by_cat:
                by_cat[key] = {
                    "category_id": str(t.category_id) if t.category_id else None,
                    "category_name": t.category.name if t.category else "Uncategorized",
                    "amount": 0.0,
                }
            by_cat[key]["amount"] += float(t.amount)
        else:
            card_map[t.account_id]["refund"] += float(t.amount)

    total_spend = sum(c["spend"] for c in card_map.values())
    total_refund = sum(c["refund"] for c in card_map.values())

    breakdown = sorted(by_cat.values(), key=lambda x: -x["amount"])
    for item in breakdown:
        item["percentage"] = round(item["amount"] / total_spend * 100, 1) if total_spend else 0.0

    tx_list = [
        {
            "id": str(t.id),
            "account_id": str(t.account_id),
            "account_name": t.account.name if t.account else None,
            "category_name": t.category.name if t.category else None,
            "amount": float(t.amount),
            "type": t.type,
            "txn_date": str(t.txn_date),
            "note": t.note,
        }
        for t in period_txns[:50]
    ]

    return {
        "total_spend": round(total_spend, 2),
        "total_refund": round(total_refund, 2),
        "net_spend": round(total_spend - total_refund, 2),
        "cards": sorted(card_map.values(), key=lambda x: -x["spend"]),
        "by_category": breakdown,
        "transactions": tx_list,
    }


def get_budget_vs_actual(db: Session, user_id: str, period: str = "month") -> dict:
    family_id = _get_user_family_id(db, user_id)
    member_ids = [UUID(uid) for uid in get_family_member_ids(db, user_id)]

    categories = (
        db.query(Category)
        .filter(Category.family_id == family_id, Category.kind == "expense")
        .all()
        if family_id else []
    )

    txns = (
        db.query(Transaction)
        .filter(Transaction.user_id.in_(member_ids), Transaction.type == "expense")
        .all()
    )
    period_txns = [t for t in txns if _period_filter(t.txn_date, period)]

    actual_by_cat: dict = {}
    for t in period_txns:
        key = str(t.category_id) if t.category_id else None
        if key:
            actual_by_cat[key] = actual_by_cat.get(key, 0.0) + float(t.amount)

    result = []
    for c in categories:
        cat_id = str(c.id)
        actual = actual_by_cat.get(cat_id, 0.0)
        budget = float(c.budget) if c.budget is not None else None
        variance = round(actual - budget, 2) if budget is not None else None
        percentage = round(actual / budget * 100, 1) if budget else None
        result.append({
            "category_id": cat_id,
            "category_name": c.name,
            "budget": budget,
            "actual": actual,
            "variance": variance,
            "percentage": percentage,
        })

    # Also include uncategorized actuals not tied to any category row
    known_ids = {str(c.id) for c in categories}
    for cat_id, actual in actual_by_cat.items():
        if cat_id not in known_ids:
            result.append({
                "category_id": cat_id,
                "category_name": "Uncategorized",
                "budget": None,
                "actual": actual,
                "variance": None,
                "percentage": None,
            })

    # Sort: over-budget first by variance desc, then rest by actual desc
    result.sort(key=lambda x: (
        -(x["variance"] or 0) if (x["variance"] or 0) > 0 else 999999,
        -x["actual"],
    ))

    over_budget_count = sum(1 for r in result if r["variance"] is not None and r["variance"] > 0)
    total_budget = sum(r["budget"] for r in result if r["budget"] is not None)
    total_actual = sum(r["actual"] for r in result)
    total_variance = round(total_actual - total_budget, 2)

    return {
        "categories": result,
        "over_budget_count": over_budget_count,
        "total_budget": total_budget,
        "total_actual": total_actual,
        "total_variance": total_variance,
    }


def get_net_worth_trend(db: Session, user_id: str, months: int = 6) -> dict:
    member_ids = [UUID(uid) for uid in get_family_member_ids(db, user_id)]
    slots = _month_slots(months)

    accounts = db.query(Account).filter(Account.user_id.in_(member_ids)).all()
    account_ids = [a.id for a in accounts]
    all_txns = db.query(Transaction).filter(Transaction.account_id.in_(account_ids)).all() if account_ids else []
    assets = _get_family_assets(db, user_id)

    outstandings = db.query(Outstanding).filter(
        Outstanding.user_id.in_(member_ids),
        Outstanding.is_settled == False,  # noqa: E712
    ).all()
    outstanding_net = sum(
        float(o.amount) if o.direction == "lent" else -float(o.amount)
        for o in outstandings
    )

    net_worth_points = []
    for (y, m) in slots:
        last_day = date(y, m, monthrange(y, m)[1])
        nw = 0.0
        for acc in accounts:
            bal = float(acc.opening_balance or 0)
            for t in all_txns:
                if t.account_id == acc.id and t.txn_date <= last_day:
                    bal += float(t.amount) if t.type == "income" else -float(t.amount)
            nw += bal
        for asset in assets:
            if asset.purchase_date and asset.purchase_date > last_day:
                continue
            relevant = [h for h in asset.value_history if h.recorded_at.date() <= last_day]
            if relevant:
                nw += float(max(relevant, key=lambda h: h.recorded_at).value)
            elif asset.purchase_price:
                nw += float(asset.purchase_price)
        nw += outstanding_net
        net_worth_points.append({"label": date(y, m, 1).strftime("%b %y"), "net_worth": round(nw, 2)})

    current = net_worth_points[-1]["net_worth"] if net_worth_points else 0.0
    previous = net_worth_points[-2]["net_worth"] if len(net_worth_points) >= 2 else 0.0

    return {
        "months": net_worth_points,
        "current_net_worth": current,
        "previous_net_worth": previous,
        "change": round(current - previous, 2),
    }


def get_family_breakdown(db: Session, user_id: str, period: str = "month") -> dict:
    family = get_family_for_user(db, user_id)
    if family:
        members = family.members
    else:
        # Solo user — wrap as a single pseudo-member
        class _PseudoMember:
            user_id = UUID(user_id)
        members = [_PseudoMember()]

    all_member_ids = [m.user_id for m in members]
    txns = (
        db.query(Transaction)
        .filter(Transaction.user_id.in_(all_member_ids))
        .all()
    )
    period_txns = [t for t in txns if _period_filter(t.txn_date, period)]

    result = []
    for m in members:
        member_txns = [t for t in period_txns if t.user_id == m.user_id]
        income = sum(float(t.amount) for t in member_txns if t.type == "income")
        expense = sum(float(t.amount) for t in member_txns if t.type == "expense")
        result.append({
            "user_id": str(m.user_id),
            "is_self": str(m.user_id) == user_id,
            "income": income,
            "expense": expense,
            "net": round(income - expense, 2),
        })

    return {"members": result}


# ─────────────────────────────────────────
# ASSETS
# ─────────────────────────────────────────

def _get_family_assets(db: Session, user_id: str) -> list:
    family_id = _get_user_family_id(db, user_id)
    if family_id:
        return db.query(Asset).filter(Asset.family_id == family_id).all()
    member_ids = [UUID(uid) for uid in get_family_member_ids(db, user_id)]
    return db.query(Asset).filter(Asset.user_id.in_(member_ids)).all()


def get_assets(db: Session, user_id: str) -> list:
    return _get_family_assets(db, user_id)


def create_asset(db: Session, data, user_id: str):
    family_id = _get_user_family_id(db, user_id)
    asset = Asset(
        family_id=family_id,
        user_id=UUID(user_id),
        name=data.name,
        asset_type=data.asset_type,
        purchase_price=data.purchase_price,
        current_value=data.current_value,
        purchase_date=data.purchase_date,
        notes=data.notes,
    )
    db.add(asset)
    db.flush()
    db.add(AssetValueHistory(asset_id=asset.id, value=data.current_value))
    db.commit()
    db.refresh(asset)
    return asset


def update_asset(db: Session, asset_id: UUID, data, user_id: str):
    assets = _get_family_assets(db, user_id)
    asset = next((a for a in assets if str(a.id) == str(asset_id)), None)
    if not asset:
        raise ValueError("Asset not found")
    if float(data.current_value) != float(asset.current_value):
        db.add(AssetValueHistory(asset_id=asset.id, value=data.current_value))
    asset.name = data.name
    asset.asset_type = data.asset_type
    asset.purchase_price = data.purchase_price
    asset.current_value = data.current_value
    asset.purchase_date = data.purchase_date
    asset.notes = data.notes
    db.commit()
    db.refresh(asset)
    return asset


def delete_asset(db: Session, asset_id: UUID, user_id: str):
    assets = _get_family_assets(db, user_id)
    asset = next((a for a in assets if str(a.id) == str(asset_id)), None)
    if asset:
        db.delete(asset)
        db.commit()


# ─────────────────────────────────────────
# OUTSTANDINGS
# ─────────────────────────────────────────

def get_outstandings(db: Session, user_id: str, settled: Optional[bool] = False) -> list:
    member_ids = [UUID(uid) for uid in get_family_member_ids(db, user_id)]
    query = db.query(Outstanding).filter(Outstanding.user_id.in_(member_ids))
    if settled is not None:
        query = query.filter(Outstanding.is_settled == settled)
    return query.order_by(Outstanding.created_at.desc()).all()


def create_outstanding(db: Session, data, user_id: str):
    family_id = _get_user_family_id(db, user_id)
    obj = Outstanding(
        family_id=family_id,
        user_id=UUID(user_id),
        person_name=data.person_name,
        amount=data.amount,
        description=data.description,
        direction=data.direction,
        due_date=data.due_date,
        is_settled=False,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def settle_outstanding(db: Session, outstanding_id: UUID, user_id: str):
    member_ids = [UUID(uid) for uid in get_family_member_ids(db, user_id)]
    obj = db.query(Outstanding).filter(
        Outstanding.id == outstanding_id,
        Outstanding.user_id.in_(member_ids),
    ).first()
    if not obj:
        raise ValueError("Outstanding not found")
    obj.is_settled = True
    db.commit()
    db.refresh(obj)
    return obj


def delete_outstanding(db: Session, outstanding_id: UUID, user_id: str):
    member_ids = [UUID(uid) for uid in get_family_member_ids(db, user_id)]
    obj = db.query(Outstanding).filter(
        Outstanding.id == outstanding_id,
        Outstanding.user_id.in_(member_ids),
    ).first()
    if obj:
        db.delete(obj)
        db.commit()


BANK_TYPES       = {"savings", "checking", "cash", "credit", "fd", "rd"}
INVESTMENT_TYPES = {"mutual_fund", "equity", "lic", "ppf", "nps", "investment"}
BANK_ORDER       = ["savings", "checking", "cash", "credit", "fd", "rd"]
INVEST_ORDER     = ["mutual_fund", "equity", "lic", "ppf", "nps", "investment"]


def get_net_worth_snapshot(db: Session, user_id: str) -> dict:
    member_ids_str = get_family_member_ids(db, user_id)
    member_ids = [UUID(uid) for uid in member_ids_str]

    accounts = db.query(Account).filter(Account.user_id.in_(member_ids)).all()
    account_ids = [a.id for a in accounts]
    all_txns = (
        db.query(Transaction).filter(Transaction.account_id.in_(account_ids)).all()
        if account_ids else []
    )
    all_transfers_in  = (
        db.query(Transfer).filter(Transfer.to_account_id.in_(account_ids)).all()
        if account_ids else []
    )
    all_transfers_out = (
        db.query(Transfer).filter(Transfer.from_account_id.in_(account_ids)).all()
        if account_ids else []
    )

    bank_balances:   dict = defaultdict(float)
    bank_counts:     dict = defaultdict(int)
    invest_balances: dict = defaultdict(float)
    invest_counts:   dict = defaultdict(int)

    for acc in accounts:
        bal = float(acc.opening_balance or 0)
        for t in all_txns:
            if t.account_id == acc.id:
                bal += float(t.amount) if t.type == "income" else -float(t.amount)
        for tr in all_transfers_in:
            if tr.to_account_id == acc.id:
                bal += float(tr.amount)
        for tr in all_transfers_out:
            if tr.from_account_id == acc.id:
                bal -= float(tr.amount)

        acc_type = acc.type or "other"
        if acc_type in INVESTMENT_TYPES:
            invest_balances[acc_type] += bal
            invest_counts[acc_type] += 1
        else:
            bank_balances[acc_type] += bal
            bank_counts[acc_type] += 1

    def _sort_breakdown(balances, counts, order):
        keys = sorted(balances.keys(), key=lambda k: (order.index(k) if k in order else len(order), k))
        return [{"account_type": k, "balance": round(balances[k], 2), "count": counts[k]} for k in keys]

    bank_breakdown   = _sort_breakdown(bank_balances,   bank_counts,   BANK_ORDER)
    invest_breakdown = _sort_breakdown(invest_balances, invest_counts, INVEST_ORDER)

    actual_in_hand   = round(sum(bank_balances.values()), 2)
    investment_value = round(sum(invest_balances.values()), 2)

    assets = _get_family_assets(db, user_id)
    asset_total = round(sum(float(a.current_value) for a in assets), 2)

    outstandings = db.query(Outstanding).filter(
        Outstanding.user_id.in_(member_ids),
        Outstanding.is_settled == False,  # noqa: E712
    ).all()
    total_lent     = round(sum(float(o.amount) for o in outstandings if o.direction == "lent"), 2)
    total_borrowed = round(sum(float(o.amount) for o in outstandings if o.direction == "borrowed"), 2)
    outstanding_net = round(total_lent - total_borrowed, 2)

    grand1 = round(actual_in_hand + outstanding_net, 2)
    grand2 = round(grand1 + investment_value + asset_total, 2)

    return {
        "actual_in_hand":           actual_in_hand,
        "bank_breakdown":           bank_breakdown,
        "grand1_with_outstandings": grand1,
        "total_lent":               total_lent,
        "total_borrowed":           total_borrowed,
        "outstanding_net":          outstanding_net,
        "grand2_with_investments":  grand2,
        "investment_value":         investment_value,
        "investment_breakdown":     invest_breakdown,
        "asset_value":              asset_total,
        # legacy aliases
        "net_worth":        grand2,
        "account_balance":  actual_in_hand,
        "account_breakdown": bank_breakdown,
    }


# ─────────────────────────────────────────
# TRANSFERS
# ─────────────────────────────────────────

def create_transfer(db: Session, data, user_id: str):
    tr = Transfer(
        user_id         = UUID(user_id),
        from_account_id = data.from_account_id,
        to_account_id   = data.to_account_id,
        amount          = data.amount,
        txn_date        = data.txn_date,
        note            = data.note,
    )
    db.add(tr)
    db.commit()
    db.refresh(tr)
    return _enrich_transfer(db, tr)


def get_transfers_for_account(db: Session, account_id: UUID, user_id: str):
    transfers = db.query(Transfer).filter(
        (Transfer.from_account_id == account_id) | (Transfer.to_account_id == account_id)
    ).order_by(Transfer.txn_date.desc()).all()
    return [_enrich_transfer(db, tr) for tr in transfers]


def delete_transfer(db: Session, transfer_id: UUID, user_id: str):
    family_ids = [UUID(uid) for uid in get_family_member_ids(db, user_id)]
    tr = db.query(Transfer).filter(
        Transfer.id == transfer_id,
        Transfer.user_id.in_(family_ids),
    ).first()
    if tr:
        db.delete(tr)
        db.commit()


def _enrich_transfer(db: Session, tr) -> dict:
    from_acc = db.query(Account).filter(Account.id == tr.from_account_id).first()
    to_acc   = db.query(Account).filter(Account.id == tr.to_account_id).first()
    return {
        "id":                tr.id,
        "user_id":           tr.user_id,
        "from_account_id":   tr.from_account_id,
        "to_account_id":     tr.to_account_id,
        "from_account_name": from_acc.name if from_acc else None,
        "to_account_name":   to_acc.name   if to_acc   else None,
        "amount":            float(tr.amount),
        "txn_date":          tr.txn_date,
        "note":              tr.note,
        "created_at":        tr.created_at,
    }


def get_all_transfers(db: Session, user_id: str):
    account_ids = [a.id for a in db.query(Account).filter(Account.user_id == UUID(user_id)).all()]
    member = db.query(FamilyMember).filter(FamilyMember.user_id == UUID(user_id)).first()
    if member:
        family_ids = [
            a.id for a in db.query(Account).join(FamilyMember, Account.user_id == FamilyMember.user_id)
            .filter(FamilyMember.family_id == member.family_id).all()
        ]
        account_ids = list(set(account_ids + family_ids))
    transfers = db.query(Transfer).filter(
        (Transfer.from_account_id.in_(account_ids)) | (Transfer.to_account_id.in_(account_ids))
    ).order_by(Transfer.txn_date.desc()).all()
    return [_enrich_transfer(db, tr) for tr in transfers]


def update_transfer(db: Session, transfer_id: UUID, data, user_id: str):
    family_ids = [UUID(uid) for uid in get_family_member_ids(db, user_id)]
    tr = db.query(Transfer).filter(
        Transfer.id == transfer_id,
        Transfer.user_id.in_(family_ids),
    ).first()
    if not tr:
        raise ValueError("Transfer not found")
    tr.from_account_id = data.from_account_id
    tr.to_account_id   = data.to_account_id
    tr.amount          = data.amount
    tr.txn_date        = data.txn_date
    tr.note            = data.note
    db.commit()
    db.refresh(tr)
    return _enrich_transfer(db, tr)


def get_expense_category_trends(db: Session, user_id: str, months: int = 6) -> dict:
    member_ids = [UUID(uid) for uid in get_family_member_ids(db, user_id)]
    family_id = _get_user_family_id(db, user_id)
    slots = _month_slots(months)

    earliest = date(slots[0][0], slots[0][1], 1)
    txns = (
        db.query(Transaction)
        .filter(
            Transaction.user_id.in_(member_ids),
            Transaction.type == "expense",
            Transaction.txn_date >= earliest,
        )
        .all()
    )

    categories = (
        db.query(Category).filter(Category.family_id == family_id, Category.kind == "expense").all()
        if family_id else []
    )
    cat_names = {str(c.id): c.name for c in categories}
    month_labels = [date(y, m, 1).strftime("%b %y") for (y, m) in slots]

    # Accumulate amounts per (category_id, month_label)
    data: dict = {}
    for t in txns:
        cat_id = str(t.category_id) if t.category_id else "uncategorized"
        if cat_id not in data:
            cat_name = cat_names.get(cat_id) or (t.category.name if t.category else "Uncategorized")
            data[cat_id] = {"category_id": cat_id, "category_name": cat_name, "monthly": {}}
        label = date(t.txn_date.year, t.txn_date.month, 1).strftime("%b %y")
        data[cat_id]["monthly"][label] = data[cat_id]["monthly"].get(label, 0.0) + float(t.amount)

    result = []
    for cat_id, item in data.items():
        monthly_amounts = [round(item["monthly"].get(lbl, 0.0), 2) for lbl in month_labels]
        result.append({
            "category_id": cat_id,
            "category_name": item["category_name"],
            "monthly_amounts": monthly_amounts,
            "total": round(sum(monthly_amounts), 2),
        })

    result.sort(key=lambda x: -x["total"])
    return {"month_labels": month_labels, "categories": result}


def get_asset_portfolio(db: Session, user_id: str) -> dict:
    assets = _get_family_assets(db, user_id)
    by_type: dict = {}
    items = []
    total_value = 0.0
    total_cost = 0.0
    for a in assets:
        cv = float(a.current_value)
        pp = float(a.purchase_price) if a.purchase_price else None
        gain = round(cv - pp, 2) if pp is not None else None
        pct = round(gain / pp * 100, 1) if (pp and pp != 0) else None
        total_value += cv
        total_cost += pp or 0
        t = a.asset_type
        if t not in by_type:
            by_type[t] = {"asset_type": t, "total_value": 0.0, "count": 0}
        by_type[t]["total_value"] = round(by_type[t]["total_value"] + cv, 2)
        by_type[t]["count"] += 1
        items.append({
            "id": str(a.id),
            "name": a.name,
            "asset_type": t,
            "purchase_price": pp,
            "current_value": cv,
            "gain_loss": gain,
            "gain_loss_pct": pct,
        })
    items.sort(key=lambda x: -x["current_value"])
    return {
        "total_value": round(total_value, 2),
        "total_cost": round(total_cost, 2),
        "total_gain_loss": round(total_value - total_cost, 2),
        "by_type": sorted(by_type.values(), key=lambda x: -x["total_value"]),
        "assets": items,
    }
