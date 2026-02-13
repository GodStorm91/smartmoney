"""Build financial context for AI chat assistant."""
from datetime import date, timedelta
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models.budget import Budget
from ..models.goal import Goal
from ..models.transaction import Transaction


def build_financial_context(db: Session, user_id: int, days: int = 30) -> str:
    """Build financial context summary for Claude AI.

    Args:
        db: Database session
        user_id: User ID
        days: Number of days to look back (default 30)

    Returns:
        Formatted context string
    """
    # Calculate date range
    end_date = date.today()
    start_date = end_date - timedelta(days=days)

    # Fetch transactions
    transactions = db.query(Transaction).filter(
        Transaction.user_id == user_id,
        Transaction.date >= start_date,
        Transaction.date <= end_date
    ).order_by(Transaction.date.desc()).all()

    # Calculate summary
    total_income = sum(t.amount for t in transactions if t.is_income)
    total_expenses = sum(abs(t.amount) for t in transactions if not t.is_income and not t.is_transfer)
    net_cashflow = total_income - total_expenses

    # Get top spending categories
    category_spending = db.query(
        Transaction.category,
        func.sum(func.abs(Transaction.amount)).label("total"),
        func.count(Transaction.id).label("count")
    ).filter(
        Transaction.user_id == user_id,
        Transaction.date >= start_date,
        Transaction.date <= end_date,
        Transaction.is_income == False,
        Transaction.is_transfer == False
    ).group_by(
        Transaction.category
    ).order_by(
        func.sum(func.abs(Transaction.amount)).desc()
    ).limit(5).all()

    # Get current budget
    current_month = date.today().strftime("%Y-%m")
    budget = db.query(Budget).filter(
        Budget.user_id == user_id,
        Budget.month == current_month,
        Budget.is_active == True
    ).first()

    # Get goals
    goals = db.query(Goal).filter(
        Goal.user_id == user_id
    ).order_by(Goal.years).all()

    # Build context string
    context_parts = [
        f"FINANCIAL CONTEXT (Last {days} days):",
        "",
        "SUMMARY:",
        f"- Total Income: ¥{total_income:,}",
        f"- Total Expenses: ¥{total_expenses:,}",
        f"- Net Cashflow: ¥{net_cashflow:,}",
        f"- Transaction Count: {len(transactions)}",
        ""
    ]

    # Add top spending categories
    if category_spending:
        context_parts.append("TOP SPENDING CATEGORIES:")
        for cat, total, count in category_spending:
            context_parts.append(f"- {cat}: ¥{int(total):,} ({count} transactions)")
        context_parts.append("")

    # Add budget status
    if budget:
        context_parts.append("BUDGET STATUS (Current Month):")
        context_parts.append(f"- Monthly Income: ¥{budget.monthly_income:,}")
        if budget.savings_target:
            context_parts.append(f"- Savings Target: ¥{budget.savings_target:,}")

        # Get spending per allocation
        allocation_spending = {}
        for t in transactions:
            if not t.is_income and not t.is_transfer and t.date.strftime("%Y-%m") == current_month:
                category = t.category
                allocation_spending[category] = allocation_spending.get(category, 0) + abs(t.amount)

        for alloc in budget.allocations:
            spent = allocation_spending.get(alloc.category, 0)
            remaining = alloc.amount - spent
            percentage = (spent / alloc.amount * 100) if alloc.amount > 0 else 0
            status = "⚠️ OVER" if spent > alloc.amount else "✓"
            context_parts.append(
                f"  {status} {alloc.category}: ¥{spent:,} / ¥{alloc.amount:,} ({percentage:.0f}%)"
            )
        context_parts.append("")

    # Add goals
    if goals:
        context_parts.append("FINANCIAL GOALS:")
        for goal in goals:
            context_parts.append(
                f"- {goal.years}-Year Goal: Target ¥{goal.target_amount:,}"
            )
        context_parts.append("")

    # Add recent transactions sample
    if transactions:
        context_parts.append("RECENT TRANSACTIONS (Last 10):")
        for t in transactions[:10]:
            amount_str = f"+¥{t.amount:,}" if t.is_income else f"-¥{abs(t.amount):,}"
            context_parts.append(
                f"- {t.date.isoformat()} | {amount_str} | {t.category} | {t.description}"
            )

    return "\n".join(context_parts)


def get_available_categories(db: Session, user_id: int) -> list[str]:
    """Get list of available categories for the user.

    Args:
        db: Database session
        user_id: User ID

    Returns:
        List of category names
    """
    categories = db.query(Transaction.category).filter(
        Transaction.user_id == user_id
    ).distinct().all()

    return [cat[0] for cat in categories if cat[0]]
