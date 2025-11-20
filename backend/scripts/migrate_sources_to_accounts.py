#!/usr/bin/env python3
"""Data migration script: Auto-create accounts from existing transaction sources.

This script:
1. Finds all distinct source values from transactions table
2. Guesses account type from source name
3. Creates accounts with initial_balance=0 and initial_balance_date=earliest transaction date
4. Updates transactions with the corresponding account_id

Run this script after adding the accounts table to migrate existing data.
"""
import sys
from datetime import date, datetime
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.account import Account
from app.models.transaction import Transaction


# Mapping keywords to account types
SOURCE_TYPE_MAP = {
    "card": "credit_card",
    "rakuten": "credit_card",
    "visa": "credit_card",
    "mastercard": "credit_card",
    "amex": "credit_card",
    "cash": "cash",
    "bank": "bank",
    "checking": "bank",
    "savings": "bank",
    "投資": "investment",  # Investment in Japanese
    "株": "investment",  # Stocks in Japanese
    "stock": "investment",
    "receivable": "receivable",
    "loan": "receivable",
}


def guess_account_type(source_name: str) -> str:
    """Guess account type from source name.

    Args:
        source_name: Transaction source name

    Returns:
        Account type ('bank', 'cash', 'credit_card', 'investment', 'receivable', or 'other')
    """
    source_lower = source_name.lower()

    for keyword, account_type in SOURCE_TYPE_MAP.items():
        if keyword in source_lower:
            return account_type

    return "other"


def migrate_sources_to_accounts(dry_run: bool = True) -> None:
    """Migrate transaction sources to accounts.

    Args:
        dry_run: If True, only print what would be done without making changes
    """
    engine = create_engine(settings.database_url)

    with Session(engine) as db:
        print("🔍 Finding distinct sources in transactions...")

        # Get all distinct sources
        sources = db.execute(
            select(Transaction.source).distinct().where(Transaction.source.isnot(None))
        ).scalars().all()

        print(f"📊 Found {len(sources)} distinct sources")

        if not sources:
            print("✅ No sources found. Nothing to migrate.")
            return

        print("\n" + "=" * 60)

        created_count = 0
        updated_count = 0

        for source in sources:
            # Check if account already exists
            existing_account = db.query(Account).filter(Account.name == source).first()

            if existing_account:
                print(f"⏭️  Skipping '{source}' - account already exists (ID: {existing_account.id})")
                account_id = existing_account.id
            else:
                # Guess account type
                account_type = guess_account_type(source)

                # Get earliest transaction date for this source
                earliest_txn = (
                    db.query(Transaction)
                    .filter(Transaction.source == source)
                    .order_by(Transaction.date.asc())
                    .first()
                )

                initial_date = earliest_txn.date if earliest_txn else date.today()

                if dry_run:
                    print(f"\n🔹 Would create account:")
                    print(f"   Name: {source}")
                    print(f"   Type: {account_type}")
                    print(f"   Initial Date: {initial_date}")
                    print(f"   Initial Balance: 0")
                    account_id = None  # Can't update transactions in dry run
                else:
                    # Create account
                    account = Account(
                        name=source,
                        type=account_type,
                        initial_balance=0,
                        initial_balance_date=initial_date,
                        currency="JPY",
                        notes=f"Auto-created from source: {source}",
                    )
                    db.add(account)
                    db.flush()  # Get the account ID
                    account_id = account.id

                    print(f"\n✅ Created account '{source}' (ID: {account_id}, Type: {account_type})")
                    created_count += 1

            # Update transactions if not dry run
            if not dry_run and account_id:
                txn_count = (
                    db.query(Transaction)
                    .filter(Transaction.source == source, Transaction.account_id.is_(None))
                    .update({"account_id": account_id})
                )

                if txn_count > 0:
                    print(f"   📝 Updated {txn_count} transactions")
                    updated_count += txn_count

        if not dry_run:
            db.commit()
            print("\n" + "=" * 60)
            print(f"\n🎉 Migration complete!")
            print(f"   Accounts created: {created_count}")
            print(f"   Transactions updated: {updated_count}")
        else:
            print("\n" + "=" * 60)
            print(f"\n🔍 DRY RUN complete. Would create {len([s for s in sources])} accounts.")
            print("   Run with --execute to apply changes.")


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Migrate transaction sources to accounts"
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Execute the migration (default is dry run)",
    )

    args = parser.parse_args()

    dry_run = not args.execute

    if dry_run:
        print("🔍 DRY RUN MODE - No changes will be made")
        print("   Use --execute to apply changes\n")
    else:
        print("⚠️  EXECUTING MIGRATION - Database will be modified\n")

    migrate_sources_to_accounts(dry_run=dry_run)


if __name__ == "__main__":
    main()
