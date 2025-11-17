# SmartMoney Database Schema
**Date:** 2025-11-17

---

## ORM vs Raw SQL Decision

### Chosen: **SQLAlchemy ORM**

**Rationale:**
- Dialect-agnostic (SQLite → PostgreSQL migration)
- Type safety with Pydantic integration
- Easier testing (mock models vs mock SQL strings)
- Alembic migrations track schema history
- Performance overhead negligible at 100k records

**When to Use Raw SQL:**
- Complex analytics (CTEs, window functions)
- Use SQLAlchemy `text()` for hybrid approach

---

## Core Schema (SQLAlchemy Models)

### models.py

```python
from sqlalchemy import (
    Column, Integer, BigInteger, String, Date, Boolean,
    Index, CheckConstraint, ForeignKey
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(Date, nullable=False, index=True)
    amount = Column(BigInteger, nullable=False)  # Store ¥ as integer
    description = Column(String(500), nullable=False)
    category = Column(String(100), nullable=False, index=True)
    subcategory = Column(String(100))
    source = Column(String(100), nullable=False)  # "Rakuten Card", "PayPay"
    payment_method = Column(String(50))
    notes = Column(String(1000))
    is_income = Column(Boolean, default=False, nullable=False)
    is_transfer = Column(Boolean, default=False, nullable=False)
    month_key = Column(String(7), nullable=False, index=True)  # "2025-11"
    tx_hash = Column(String(64), unique=True, nullable=False)  # SHA-256
    created_at = Column(Date, server_default="CURRENT_TIMESTAMP")

    __table_args__ = (
        Index('idx_date_category', 'date', 'category'),
        Index('idx_month_category', 'month_key', 'category'),
        Index('idx_duplicate_check', 'date', 'amount', 'description', 'source'),
        CheckConstraint('amount != 0', name='amount_nonzero'),
    )

    def __repr__(self):
        return f"<Transaction {self.date} {self.description} ¥{self.amount}>"


class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True)
    years = Column(Integer, nullable=False)  # 1, 3, 5, or 10
    target_amount = Column(BigInteger, nullable=False)
    start_date = Column(Date, nullable=False)
    created_at = Column(Date, server_default="CURRENT_TIMESTAMP")

    __table_args__ = (
        CheckConstraint('years IN (1, 3, 5, 10)', name='valid_years'),
        CheckConstraint('target_amount > 0', name='positive_target'),
        Index('idx_years_unique', 'years', unique=True),
    )

    def __repr__(self):
        return f"<Goal {self.years}y ¥{self.target_amount}>"


class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True)
    currency = Column(String(3), default="JPY", nullable=False)
    starting_net_worth = Column(BigInteger, default=0)
    base_date = Column(Date, nullable=False)
    created_at = Column(Date, server_default="CURRENT_TIMESTAMP")
    updated_at = Column(Date, onupdate="CURRENT_TIMESTAMP")

    __table_args__ = (
        CheckConstraint("id = 1", name="singleton"),  # Only 1 row allowed
    )
```

---

## Database Configuration

### database.py

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./smartmoney.db"  # Default to SQLite
)

# SQLite-specific settings
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},  # Allow multi-threading
        echo=False  # Set True for SQL logging
    )
else:
    # PostgreSQL settings
    engine = create_engine(
        DATABASE_URL,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,  # Verify connections before use
        echo=False
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency injection for FastAPI routes"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

## Indexes Strategy

### Performance-Critical Indexes

```sql
-- Auto-created by SQLAlchemy, but documented here for reference

-- Single-column indexes (created by index=True)
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_category ON transactions(category);
CREATE INDEX idx_transactions_month_key ON transactions(month_key);

-- Composite indexes (for complex queries)
CREATE INDEX idx_date_category ON transactions(date, category);
CREATE INDEX idx_month_category ON transactions(month_key, category);

-- Duplicate detection (must be fast)
CREATE INDEX idx_duplicate_check ON transactions(date, amount, description, source);

-- Unique constraint for hash-based duplicates
CREATE UNIQUE INDEX idx_tx_hash ON transactions(tx_hash);
```

### When to Add More Indexes

**Trigger:** Query >500ms in production

**Candidates:**
```sql
-- If filtering by source frequently
CREATE INDEX idx_source ON transactions(source);

-- If sorting by amount
CREATE INDEX idx_amount_desc ON transactions(amount DESC);

-- If full-text search on descriptions (PostgreSQL only)
CREATE INDEX idx_description_fulltext ON transactions USING gin(to_tsvector('english', description));
```

**Trade-offs:**
- Indexes speed up reads but slow down writes
- Each index adds storage overhead (~10-20% of table size)
- Max 5-7 indexes per table before diminishing returns

---

## Sample Queries

### Monthly Cashflow

```python
from sqlalchemy import func, extract

def get_monthly_cashflow(db, year: int, month: int):
    month_key = f"{year}-{month:02d}"

    result = db.query(
        func.sum(Transaction.amount).filter(
            Transaction.is_income == True,
            Transaction.is_transfer == False
        ).label('income'),
        func.sum(Transaction.amount).filter(
            Transaction.is_income == False,
            Transaction.is_transfer == False,
            Transaction.amount < 0
        ).label('expenses')
    ).filter(
        Transaction.month_key == month_key
    ).first()

    income = result.income or 0
    expenses = abs(result.expenses or 0)
    return {
        'income': income,
        'expenses': expenses,
        'net': income - expenses
    }
```

### Category Breakdown

```python
def get_category_breakdown(db, start_date, end_date):
    return db.query(
        Transaction.category,
        func.sum(Transaction.amount).label('total')
    ).filter(
        Transaction.date >= start_date,
        Transaction.date <= end_date,
        Transaction.is_transfer == False
    ).group_by(
        Transaction.category
    ).order_by(
        func.sum(Transaction.amount).desc()
    ).all()
```

### Goal Progress (Raw SQL for Complexity)

```python
from sqlalchemy import text

def get_goal_progress(db, goal_years: int):
    query = text("""
        WITH monthly_net AS (
            SELECT
                month_key,
                SUM(CASE WHEN is_income THEN amount ELSE 0 END) -
                ABS(SUM(CASE WHEN NOT is_income THEN amount ELSE 0 END)) AS net
            FROM transactions
            WHERE NOT is_transfer
            GROUP BY month_key
        )
        SELECT
            SUM(net) AS total_saved,
            AVG(net) AS avg_monthly_net,
            COUNT(*) AS months_elapsed
        FROM monthly_net
    """)

    result = db.execute(query).first()
    goal = db.query(Goal).filter(Goal.years == goal_years).first()

    if not goal:
        return None

    months_total = goal_years * 12
    months_remaining = max(months_total - result.months_elapsed, 1)
    needed_remaining = max(goal.target_amount - result.total_saved, 0)

    return {
        'total_saved': result.total_saved,
        'target': goal.target_amount,
        'progress_pct': (result.total_saved / goal.target_amount * 100),
        'needed_per_month': needed_remaining / months_remaining,
        'avg_monthly_net': result.avg_monthly_net,
        'status': 'ahead' if result.total_saved > goal.target_amount * 0.8 else 'on_track'
    }
```

---

## Migrations (Alembic)

### Initial Setup

```bash
alembic init migrations

# Edit alembic.ini
# sqlalchemy.url = driver://user:pass@localhost/dbname
# Use env var instead (see env.py)

# Edit migrations/env.py
from app.models import Base
target_metadata = Base.metadata

# Create initial migration
alembic revision --autogenerate -m "Initial schema"

# Apply migration
alembic upgrade head
```

### Migration Workflow

```bash
# After modifying models.py
alembic revision --autogenerate -m "Add payment_method column"

# Review auto-generated migration in migrations/versions/
# Edit if needed (e.g., add data transformations)

# Apply
alembic upgrade head

# Rollback if needed
alembic downgrade -1
```

### Example Migration (Add Column)

```python
# migrations/versions/abc123_add_payment_method.py
def upgrade():
    op.add_column('transactions',
        sa.Column('payment_method', sa.String(50), nullable=True)
    )

def downgrade():
    op.drop_column('transactions', 'payment_method')
```

---

## Data Seeding (Testing)

### fixtures.py

```python
from faker import Faker
import random

fake = Faker('ja_JP')  # Japanese locale

def seed_transactions(db, count=1000):
    categories = ['Food', 'Housing', 'Transportation', 'Baby/Education', 'Shopping']
    sources = ['Rakuten Card', 'PayPay', 'SMBC', 'MoneyForward']

    transactions = []
    for _ in range(count):
        tx = Transaction(
            date=fake.date_between(start_date='-1y', end_date='today'),
            amount=random.randint(-50000, -100),  # Expenses
            description=fake.company(),
            category=random.choice(categories),
            source=random.choice(sources),
            is_income=False,
            is_transfer=False,
            month_key=fake.date_this_year().strftime('%Y-%m'),
            tx_hash=fake.sha256()
        )
        transactions.append(tx)

    db.bulk_save_objects(transactions)
    db.commit()
```

---

## SQLite → PostgreSQL Migration

### Migration Script

```python
# scripts/migrate_db.py
import os
from sqlalchemy import create_engine
from app.models import Transaction, Goal, Settings

# Source: SQLite
sqlite_engine = create_engine("sqlite:///./smartmoney.db")

# Target: PostgreSQL
pg_url = os.getenv("DATABASE_URL")
pg_engine = create_engine(pg_url)

# Copy tables
from sqlalchemy.orm import sessionmaker

SQLiteSession = sessionmaker(bind=sqlite_engine)
PGSession = sessionmaker(bind=pg_engine)

sqlite_db = SQLiteSession()
pg_db = PGSession()

# Migrate transactions in batches
BATCH_SIZE = 10000
offset = 0

while True:
    transactions = sqlite_db.query(Transaction).limit(BATCH_SIZE).offset(offset).all()
    if not transactions:
        break

    pg_db.bulk_save_objects(transactions)
    pg_db.commit()

    offset += BATCH_SIZE
    print(f"Migrated {offset} transactions...")

# Migrate goals and settings
for goal in sqlite_db.query(Goal).all():
    pg_db.merge(goal)

for setting in sqlite_db.query(Settings).all():
    pg_db.merge(setting)

pg_db.commit()
print("Migration complete!")
```

**Downtime:** ~5 minutes for 100k records

---

## Backup & Restore

### SQLite Backup

```bash
# Simple file copy
cp smartmoney.db smartmoney.db.backup

# With timestamp
cp smartmoney.db "smartmoney_$(date +%Y%m%d).db"
```

### PostgreSQL Backup

```bash
# Daily automated backup (cron)
pg_dump -U smartmoney -d smartmoney | gzip > backup_$(date +%Y%m%d).sql.gz

# Encrypted backup
pg_dump -U smartmoney -d smartmoney | gpg -e -r user@email.com > backup.sql.gpg

# Restore
gunzip < backup.sql.gz | psql -U smartmoney -d smartmoney
```

---

**Related Docs:**
- [Overview](./tech-stack-overview.md)
- [Dependencies](./tech-stack-dependencies.md)
- [Deployment Guide](./tech-stack-deployment.md)

---

**END OF DATABASE SCHEMA**
