"""Tests for monthly report PDF generation service."""
from datetime import datetime, UTC

import pytest

from app.schemas.report import (
    AccountSummaryItem,
    BudgetAdherence,
    BudgetCategoryStatus,
    GoalProgressItem,
    MonthlyUsageReportData,
    ReportInsight,
    ReportSummary,
)
from app.services.monthly_report_pdf_service import get_monthly_report_pdf_service


def _make_summary(**overrides):
    defaults = dict(
        total_income=300000, total_expense=200000, net_cashflow=100000,
        savings_rate=33.3, income_change=5.0, expense_change=-2.0, net_change=10.0,
    )
    defaults.update(overrides)
    return ReportSummary(**defaults)


def _make_report(**overrides):
    defaults = dict(
        year=2026, month=1, month_label="January 2026",
        generated_at=datetime(2026, 1, 31, 12, 0, tzinfo=UTC),
        summary=_make_summary(),
        budget_adherence=None,
        category_breakdown=[],
        spending_trends=[],
        goal_progress=[],
        account_summary=[],
        insights=[],
        total_net_worth=5000000,
    )
    defaults.update(overrides)
    return MonthlyUsageReportData(**defaults)


class TestMonthlyReportPDFService:
    def test_generates_valid_pdf_bytes(self):
        data = _make_report(
            category_breakdown=[
                {"category": "Food", "amount": 80000},
                {"category": "Transport", "amount": 30000},
            ],
        )
        pdf = get_monthly_report_pdf_service().generate_monthly_usage_pdf(data)
        assert isinstance(pdf, bytes)
        assert pdf[:5] == b"%PDF-"
        assert len(pdf) > 100

    def test_pdf_with_empty_data(self):
        data = _make_report(
            summary=_make_summary(
                total_income=0, total_expense=0, net_cashflow=0,
                savings_rate=0.0, income_change=0.0, expense_change=0.0, net_change=0.0,
            ),
        )
        pdf = get_monthly_report_pdf_service().generate_monthly_usage_pdf(data)
        assert pdf[:5] == b"%PDF-"

    def test_pdf_with_budget_adherence(self):
        data = _make_report(
            budget_adherence=BudgetAdherence(
                total_budget=250000, total_spent=200000,
                percentage_used=80.0, is_over_budget=False,
                category_status=[
                    BudgetCategoryStatus(
                        category="Food", budget_amount=80000,
                        spent=75000, percentage=93.8, status="threshold_80",
                    ),
                    BudgetCategoryStatus(
                        category="Transport", budget_amount=30000,
                        spent=35000, percentage=116.7, status="over_budget",
                    ),
                    BudgetCategoryStatus(
                        category="Entertainment", budget_amount=20000,
                        spent=10000, percentage=50.0, status="normal",
                    ),
                ],
            ),
        )
        pdf = get_monthly_report_pdf_service().generate_monthly_usage_pdf(data)
        assert pdf[:5] == b"%PDF-"

    def test_pdf_with_goals_and_insights(self):
        data = _make_report(
            goal_progress=[
                GoalProgressItem(
                    goal_id=1, years=3, target_amount=1000000,
                    total_saved=400000, progress_percentage=40.0,
                    needed_per_month=25000, status="on_track",
                ),
                GoalProgressItem(
                    goal_id=2, years=5, target_amount=5000000,
                    total_saved=600000, progress_percentage=12.0,
                    needed_per_month=80000, status="behind",
                ),
            ],
            account_summary=[
                AccountSummaryItem(
                    account_id=1, account_name="Main Bank",
                    account_type="bank", balance=3000000, currency="JPY",
                ),
                AccountSummaryItem(
                    account_id=2, account_name="Savings",
                    account_type="savings", balance=2000000, currency="JPY",
                ),
            ],
            insights=[
                ReportInsight(
                    type="spending_trend", severity="warning",
                    title="High Food Spending",
                    message="Food spending increased 20% vs last month",
                    category="Food", amount=80000, percentage_change=20.0,
                ),
                ReportInsight(
                    type="savings_positive", severity="info",
                    title="Great Savings",
                    message="You saved 33% of your income this month",
                ),
            ],
        )
        pdf = get_monthly_report_pdf_service().generate_monthly_usage_pdf(data)
        assert pdf[:5] == b"%PDF-"
        assert len(pdf) > 500
