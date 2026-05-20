from sqlalchemy import Column, String, Date, Numeric, ForeignKey, Text, DateTime, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime, timezone
import uuid

Base = declarative_base()


class Family(Base):
    __tablename__ = "families"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    invite_code = Column(String(20), nullable=False, unique=True)
    created_by = Column(UUID(as_uuid=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    members = relationship("FamilyMember", back_populates="family", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="family")


class FamilyMember(Base):
    __tablename__ = "family_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id = Column(UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False, unique=True)
    role = Column(String(20), nullable=False, default="member")
    joined_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    display_name = Column(String, nullable=True)

    family = relationship("Family", back_populates="members")


class Account(Base):
    __tablename__ = "accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=True)
    name = Column(String, nullable=False)
    type = Column(String)
    opening_balance = Column(Numeric, default=0)

    transactions = relationship("Transaction", back_populates="account")


class Category(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id = Column(UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"), nullable=True)
    name = Column(String, nullable=False)
    kind = Column(String)  # "income" or "expense"
    budget = Column(Numeric, nullable=True)

    family = relationship("Family", back_populates="categories")
    transactions = relationship("Transaction", back_populates="category")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=True)
    account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False)
    amount = Column(Numeric, nullable=False)
    type = Column(String, nullable=False)  # "income" or "expense"
    note = Column(Text, nullable=True)
    txn_date = Column(Date, nullable=False)

    account = relationship("Account", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")


class Asset(Base):
    __tablename__ = "assets"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id      = Column(UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"), nullable=True)
    user_id        = Column(UUID(as_uuid=True), nullable=True)
    name           = Column(String(200), nullable=False)
    asset_type     = Column(String(50),  nullable=False)
    purchase_price = Column(Numeric, nullable=True)
    current_value  = Column(Numeric, nullable=False, default=0)
    purchase_date  = Column(Date, nullable=True)
    notes          = Column(Text, nullable=True)
    created_at     = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    value_history = relationship(
        "AssetValueHistory", back_populates="asset",
        order_by="AssetValueHistory.recorded_at", cascade="all, delete-orphan",
    )


class AssetValueHistory(Base):
    __tablename__ = "asset_value_history"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id    = Column(UUID(as_uuid=True), ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)
    value       = Column(Numeric, nullable=False)
    recorded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    asset = relationship("Asset", back_populates="value_history")


class Outstanding(Base):
    __tablename__ = "outstandings"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id   = Column(UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"), nullable=True)
    user_id     = Column(UUID(as_uuid=True), nullable=False)
    person_name = Column(String(200), nullable=False)
    amount      = Column(Numeric, nullable=False)
    description = Column(Text, nullable=True)
    direction   = Column(String(10), nullable=False, default="lent")  # "lent" | "borrowed"
    due_date    = Column(Date, nullable=True)
    is_settled  = Column(Boolean, nullable=False, default=False)
    created_at  = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Transfer(Base):
    __tablename__ = "transfers"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id         = Column(UUID(as_uuid=True), nullable=False)
    from_account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    to_account_id   = Column(UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    amount          = Column(Numeric, nullable=False)
    txn_date        = Column(Date, nullable=False)
    note            = Column(Text, nullable=True)
    created_at      = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class DepositDetail(Base):
    __tablename__ = "deposit_details"

    id                        = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id                = Column(UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="CASCADE"), unique=True, nullable=False)
    principal_amount          = Column(Numeric, nullable=False)
    monthly_installment       = Column(Numeric, nullable=True)   # RD only
    interest_rate             = Column(Numeric, nullable=False)  # annual %
    tenure_months             = Column(Integer, nullable=False)
    maturity_amount           = Column(Numeric, nullable=True)
    maturity_date             = Column(Date, nullable=True)
    start_date                = Column(Date, nullable=True)
    is_closed                 = Column(Boolean, nullable=False, default=False)
    closing_amount            = Column(Numeric, nullable=True)
    closed_date               = Column(Date, nullable=True)
    transferred_to_account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True)
    created_at                = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
