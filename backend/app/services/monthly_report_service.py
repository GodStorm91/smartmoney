"""Monthly usage report service — aggregates data from existing services."""
import calendar
from datetime import UTC, date, datetime
from typing import Optional

from sqlalchemy.orm import Session

from ..models.account import Account
from ..schemas.report import (
    AccountSummaryItem, BudgetAdherence, BudgetCategoryStatus,
    GoalProgressItem, MonthlyUsageReportData, ReportInsight, ReportSummary,
)
from ..services.account_service import AccountService
from ..services.analytics_service import AnalyticsService
from ..services.budget_alert_service import BudgetAlertService
from ..services.dashboard_service import DashboardService
from ..services.exchange_rate_service import ExchangeRateService
from ..services.goal_service import GoalService
from ..utils.currency_utils import convert_to_jpy


class MonthlyReportService:
    """Orchestrates data from multiple services into a monthly report."""

    @staticmethod
    def generate_report(
        db: Session, user_id: int, year: int, month: int
    ) -> MonthlyUsageReportData:
        """Generate comprehensive monthly usage report.

        Args:
            db: Database session
            user_id: User ID
            year: Report year
            month: Report month (1-12)

        Returns:
            MonthlyUsageReportData with all sections populated
        """
        month_key = f"{year}-{month:02d}"
        start_date = date(year, month, 1)
        last_day = calendar.monthrange(year, month)[1]
        end_date = date(year, month, last_day)

        # 1. Summary (income/expense/net + MoM changes)
        summary_data = DashboardService.get_summary(db, user_id, month=month_key)
        savings_rate = MonthlyReportService._calc_savings_rate(
            summary_data["income"], summary_data["expense"]
        )
        summary = ReportSummary(
            total_income=summary_data["income"],
            total_expense=summary_data["expense"],
            net_cashflow=summary_data["net"],
            savings_rate=savings_rate,
            income_change=summary_data["income_change"],
            expense_change=summary_data["expense_change"],
            net_change=summary_data["net_change"],
        )

        # 2. Category breakdown
        categories = AnalyticsService.get_category_breakdown(
            db, user_id, start_date, end_date
        )

        # 3. Spending trends (last 3 months including this one)
        trends = AnalyticsService.get_monthly_trend(db, user_id, months=3)

        # 4. Budget adherence (if budget exists for this month)
        budget_adherence = MonthlyReportService._get_budget_adherence(
            db, user_id, month_key
        )

        # 5. Goal progress
        goals = GoalService.get_all_goals(db, user_id)
        goal_progress = [
            MonthlyReportService._map_goal_progress(
                GoalService.calculate_goal_progress(db, user_id, g)
            )
            for g in goals
        ]

        # 6. Account summary + net worth
        account_summary, total_net_worth = MonthlyReportService._get_account_summary(
            db, user_id
        )

        # 7. Insights (spending insights for the month)
        raw_insights = AnalyticsService.generate_spending_insights(db, user_id)
        insights = [
            ReportInsight(
                type=i.get("type", "info"),
                severity=i.get("severity", "info"),
                title=i.get("title", ""),
                message=i.get("message", ""),
                category=i.get("category"),
                amount=i.get("amount"),
                percentage_change=i.get("percentage_change"),
            )
            for i in raw_insights[:10]
        ]

        # Build month label
        month_name = calendar.month_name[month]
        month_label = f"{month_name} {year}"

        return MonthlyUsageReportData(
            year=year,
            month=month,
            month_label=month_label,
            generated_at=datetime.now(UTC),
            summary=summary,
            budget_adherence=budget_adherence,
            category_breakdown=categories,
            spending_trends=trends,
            goal_progress=goal_progress,
            account_summary=account_summary,
            insights=insights,
            total_net_worth=total_net_worth,
        )

    @staticmethod
    def _calc_savings_rate(income: int, expense: int) -> float:
        """Calculate savings rate as percentage of income."""
        if income <= 0:
            return 0.0
        return round(((income - expense) / income) * 100, 1)

    @staticmethod
    def _get_budget_adherence(
        db: Session, user_id: int, month_key: str
    ) -> Optional[BudgetAdherence]:
        """Get budget adherence data if budget exists for the month."""
        budget = BudgetAlertService.get_budget_with_allocations(
            db, user_id, month_key
        )
        if not budget:
            return None

        status = BudgetAlertService.get_threshold_status(db, user_id, budget.id)
        if not status:
            return None

        category_items = [
            BudgetCategoryStatus(
                category=cs["category"],
                budget_amount=cs["budget_amount"],
                spent=cs["spent"],
                percentage=cs["percentage"],
                status=cs["status"],
            )
            for cs in status.get("category_status", [])
        ]

        return BudgetAdherence(
            total_budget=status["total_budget"],
            total_spent=status["total_spent"],
            percentage_used=status["percentage_used"],
            is_over_budget=status["is_over_budget"],
            category_status=category_items,
        )

    @staticmethod
    def _map_goal_progress(progress: dict) -> GoalProgressItem:
        """Map GoalService progress dict to GoalProgressItem schema."""
        return GoalProgressItem(
            goal_id=progress["goal_id"],
            years=progress["years"],
            target_amount=progress["target_amount"],
            total_saved=progress["total_saved"],
            progress_percentage=progress["progress_percentage"],
            needed_per_month=int(progress["needed_per_month"]),
            status=progress["status"],
        )

    @staticmethod
    def _get_account_summary(
        db: Session, user_id: int
    ) -> tuple[list[AccountSummaryItem], int]:
        """Get active accounts with balances and total net worth in JPY."""
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
            # Convert balance to JPY for net worth (negative = liability)
            total_net_worth += convert_to_jpy(balance, acct.currency, rates)
        return items, total_net_worth
