"""Account summary helpers for monthly reports."""
from sqlalchemy.orm import Session

from ..models.account import Account
from ..schemas.report import AccountSummaryItem
from ..services.account_service import AccountService
from ..services.exchange_rate_service import ExchangeRateService
from ..utils.currency_utils import convert_to_jpy


def get_account_summary(
    db: Session, user_id: int
) -> tuple[list[AccountSummaryItem], int]:
    """Get active accounts with balances and total net worth in JPY.

    Args:
        db: Database session.
        user_id: User ID.

    Returns:
        Tuple of (account summary items, total net worth in JPY).
    """
    rates = ExchangeRateService.get_cached_rates(db)
    accounts = (
        db.query(Account)
        .filter(Account.user_id == user_id, Account.is_active == True)
        .order_by(Account.type, Account.name)
        .all()
    )
    items = []
    total_net_worth = 0
    for acct in accounts:
        balance = AccountService.calculate_balance(db, user_id, acct.id)
        items.append(AccountSummaryItem(
            account_id=acct.id, account_name=acct.name,
            account_type=acct.type, balance=balance, currency=acct.currency,
        ))
        total_net_worth += convert_to_jpy(balance, acct.currency, rates)
    return items, total_net_worth
