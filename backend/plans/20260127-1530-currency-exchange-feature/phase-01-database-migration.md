# Phase 1: Database Migration

**Status:** PENDING
**Est. Effort:** 1 hour

---

## Context Links

- [Main Plan](./plan.md)
- [Research: Linked Transactions](./research/researcher-01-linked-transactions.md)
- [Research: Existing Codebase](./research/researcher-02-existing-codebase.md)

## Overview

Add two new columns to the `transactions` table:
1. `linked_transaction_id` - Self-referential FK for linking exchange pairs and income->exchange chains
2. `exchange_rate` - Decimal field storing the rate used at transaction time

## Key Insights

- Existing `transfer_id` (UUID) links transactions loosely; new FK provides direct record link
- Self-referential FK allows bidirectional linking after both records exist
- Exchange rate stored per transaction (not separate table) per YAGNI - low volume use case
- Decimal(18,8) handles extreme rate precision (e.g., VND/JPY rates)

## Requirements

1. Add nullable `linked_transaction_id` column (FK to transactions.id)
2. Add nullable `exchange_rate` column (Decimal 18,8)
3. Create index on `linked_transaction_id` for efficient lookups
4. Migration must be reversible
5. No data migration needed (new feature)

## Architecture

```
transactions
├── id (PK)
├── ... existing fields ...
├── transfer_id (UUID) -- existing: groups related transfers
├── transfer_type (str) -- existing: outgoing/incoming/fee
├── linked_transaction_id (FK) -- NEW: direct link to related tx
└── exchange_rate (Decimal) -- NEW: rate at transaction time
```

**Linking Pattern:**
```
Income TX (VND)
  └── linked_transaction_id: NULL (or points to outgoing)

Outgoing TX (VND exchange out)
  └── linked_transaction_id: -> incoming.id
  └── exchange_rate: 0.00625 (VND to JPY)

Incoming TX (JPY exchange in)
  └── linked_transaction_id: -> outgoing.id
  └── exchange_rate: 0.00625 (VND to JPY)
```

## Related Code Files

| File | Purpose |
|------|---------|
| `backend/app/models/transaction.py` | Transaction model - add new columns |
| `backend/alembic/versions/` | Migration files |
| `backend/alembic/env.py` | Alembic environment |

## Implementation Steps

### Step 1: Create Alembic Migration

**File:** `backend/alembic/versions/20260127_XXXX_add_exchange_fields.py`

```python
"""Add linked_transaction_id and exchange_rate to transactions

Revision ID: add_exchange_fields
Revises: <previous_revision>
Create Date: 2026-01-27 XX:XX:XX

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'add_exchange_fields'
down_revision: Union[str, None] = '<previous_revision>'  # Get from latest migration
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add linked_transaction_id (self-referential FK)
    op.add_column(
        'transactions',
        sa.Column('linked_transaction_id', sa.Integer(), nullable=True)
    )
    op.create_foreign_key(
        'fk_transactions_linked_transaction',
        'transactions',
        'transactions',
        ['linked_transaction_id'],
        ['id'],
        ondelete='SET NULL'
    )
    op.create_index(
        'ix_transactions_linked_transaction_id',
        'transactions',
        ['linked_transaction_id']
    )

    # Add exchange_rate (Decimal for precision)
    op.add_column(
        'transactions',
        sa.Column('exchange_rate', sa.Numeric(18, 8), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('transactions', 'exchange_rate')
    op.drop_index('ix_transactions_linked_transaction_id', table_name='transactions')
    op.drop_constraint('fk_transactions_linked_transaction', 'transactions', type_='foreignkey')
    op.drop_column('transactions', 'linked_transaction_id')
```

### Step 2: Update Transaction Model

**File:** `backend/app/models/transaction.py`

Add after existing `transfer_type` field:

```python
from decimal import Decimal
from sqlalchemy import Numeric

# ... existing imports and code ...

class Transaction(Base):
    # ... existing fields ...

    transfer_type: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # NEW: Direct link to related transaction (exchange pair, income source)
    linked_transaction_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("transactions.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # NEW: Exchange rate used at transaction time (to_amount / from_amount)
    exchange_rate: Mapped[Decimal | None] = mapped_column(
        Numeric(18, 8),
        nullable=True
    )

    # Self-referential relationship
    linked_transaction: Mapped["Transaction | None"] = relationship(
        "Transaction",
        remote_side=[id],
        foreign_keys=[linked_transaction_id],
        lazy="select"
    )
```

**Note on imports:** Add `from decimal import Decimal` and `Numeric` to sqlalchemy imports.

### Step 3: Run Migration

```bash
cd backend
alembic upgrade head
```

### Step 4: Verify Migration

```bash
# Check table structure
sqlite3 app.db ".schema transactions" | grep -E "(linked_transaction|exchange_rate)"
```

Expected output:
```
linked_transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
exchange_rate NUMERIC(18, 8),
```

## Todo List

- [ ] Identify latest migration revision ID
- [ ] Create migration file with correct revision chain
- [ ] Add columns to Transaction model
- [ ] Add self-referential relationship
- [ ] Run migration on dev database
- [ ] Verify schema changes
- [ ] Test existing transfer functionality (regression)

## Success Criteria

- [ ] Migration applies without errors
- [ ] Migration rollback works cleanly
- [ ] New columns visible in database schema
- [ ] Existing transactions unaffected (NULL values for new columns)
- [ ] No breaking changes to existing API endpoints
- [ ] Transaction model loads without import errors

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Self-referential FK causes ORM issues | Low | Medium | Test relationship loading explicitly |
| Decimal precision insufficient | Very Low | Low | 18,8 handles all realistic FX rates |
| Migration conflicts with pending changes | Medium | Low | Check git status before creating migration |

## Testing Checklist

```bash
# After migration
cd backend
pytest tests/ -v  # All existing tests should pass
```

Manual verification:
1. Start backend, check logs for model load errors
2. Create a regular transfer (non-exchange)
3. Verify transfer works, new columns are NULL
