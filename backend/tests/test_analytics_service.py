"""Tests for analytics service."""
from datetime import date

from sqlalchemy.orm import Session

from app.models.transaction import Transaction
from app.services.analytics_service import AnalyticsService
from app.utils.transaction_hasher import generate_tx_hash


class TestAnalyticsService:
    """Tests for AnalyticsService."""

    def setup_test_data(self, db_session: Session):
        """Helper to create test transaction data."""
        transactions = [
            # January 2024
            ("2024-01-15", 300000, "Salary", "Income", True, False),
            ("2024-01-20", -80000, "Rent", "Housing", False, False),
            ("2024-01-22", -30000, "Groceries", "Food", False, False),
            ("2024-01-25", 50000, "Transfer", "Other", False, True),  # Transfer
            # February 2024
            ("2024-02-15", 300000, "Salary", "Income", True, False),
            ("2024-02-20", -80000, "Rent", "Housing", False, False),
            ("2024-02-22", -25000, "Groceries", "Food", False, False),
            ("2024-02-28", -15000, "Transportation", "Transportation", False, False),
        ]

        for date_str, amount, desc, category, is_income, is_transfer in transactions:
            tx_date = date.fromisoformat(date_str)
            tx_hash = generate_tx_hash(date_str, amount, desc, "Test")

            tx = Transaction(
                date=tx_date,
                description=desc,
                amount=amount,
                category=category,
                source="Test",
                is_income=is_income,
                is_transfer=is_transfer,
                month_key=tx_date.strftime("%Y-%m"),
                tx_hash=tx_hash,
            )
            db_session.add(tx)

        db_session.commit()

    def test_get_monthly_cashflow(self, db_session: Session):
        """Test getting monthly cashflow data."""
        self.setup_test_data(db_session)

        monthly_data = AnalyticsService.get_monthly_cashflow(db_session)

        assert len(monthly_data) == 2  # Jan and Feb
        assert monthly_data[0]["month"] == "2024-01"
        assert monthly_data[1]["month"] == "2024-02"

    def test_monthly_cashflow_excludes_transfers(self, db_session: Session):
        """Test that monthly cashflow excludes transfers."""
        self.setup_test_data(db_session)

        monthly_data = AnalyticsService.get_monthly_cashflow(db_session)

        jan_data = next(m for m in monthly_data if m["month"] == "2024-01")

        # January: 300000 income, -110000 expenses (excluding 50000 transfer)
        assert jan_data["income"] == 300000
        assert jan_data["expenses"] == 110000
        assert jan_data["net"] == 190000

    def test_monthly_cashflow_calculations(self, db_session: Session):
        """Test monthly cashflow calculations are correct."""
        self.setup_test_data(db_session)

        monthly_data = AnalyticsService.get_monthly_cashflow(db_session)

        feb_data = next(m for m in monthly_data if m["month"] == "2024-02")

        # February: 300000 income, -120000 expenses
        assert feb_data["income"] == 300000
        assert feb_data["expenses"] == 120000
        assert feb_data["net"] == 180000

    def test_monthly_cashflow_date_filter(self, db_session: Session):
        """Test filtering monthly cashflow by date range."""
        self.setup_test_data(db_session)

        monthly_data = AnalyticsService.get_monthly_cashflow(
            db_session,
            start_date=date(2024, 2, 1),
            end_date=date(2024, 2, 28),
        )

        assert len(monthly_data) == 1
        assert monthly_data[0]["month"] == "2024-02"

    def test_get_category_breakdown(self, db_session: Session):
        """Test getting category breakdown."""
        self.setup_test_data(db_session)

        categories = AnalyticsService.get_category_breakdown(db_session)

        assert len(categories) >= 3
        category_names = [c["category"] for c in categories]
        assert "Housing" in category_names
        assert "Food" in category_names
        assert "Transportation" in category_names

    def test_category_breakdown_excludes_income(self, db_session: Session):
        """Test that category breakdown excludes income."""
        self.setup_test_data(db_session)

        categories = AnalyticsService.get_category_breakdown(db_session)

        category_names = [c["category"] for c in categories]
        assert "Income" not in category_names

    def test_category_breakdown_excludes_transfers(self, db_session: Session):
        """Test that category breakdown excludes transfers."""
        self.setup_test_data(db_session)

        categories = AnalyticsService.get_category_breakdown(db_session)

        # Should not include transfer category
        total_amount = sum(c["amount"] for c in categories)
        assert total_amount == 230000  # Total expenses excluding transfers

    def test_category_breakdown_amounts(self, db_session: Session):
        """Test category breakdown amounts are positive."""
        self.setup_test_data(db_session)

        categories = AnalyticsService.get_category_breakdown(db_session)

        # All amounts should be positive
        assert all(c["amount"] > 0 for c in categories)

        # Check specific category
        housing = next(c for c in categories if c["category"] == "Housing")
        assert housing["amount"] == 160000  # 80000 * 2 months

    def test_category_breakdown_date_filter(self, db_session: Session):
        """Test filtering category breakdown by date range."""
        self.setup_test_data(db_session)

        categories = AnalyticsService.get_category_breakdown(
            db_session,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31),
        )

        # January only
        housing = next(c for c in categories if c["category"] == "Housing")
        assert housing["amount"] == 80000

    def test_get_monthly_trend(self, db_session: Session):
        """Test getting monthly trend data."""
        self.setup_test_data(db_session)

        trend_data = AnalyticsService.get_monthly_trend(db_session, months=12)

        assert len(trend_data) == 2
        # Should be in chronological order
        assert trend_data[0]["month"] == "2024-01"
        assert trend_data[1]["month"] == "2024-02"

    def test_monthly_trend_limit(self, db_session: Session):
        """Test monthly trend respects month limit."""
        self.setup_test_data(db_session)

        trend_data = AnalyticsService.get_monthly_trend(db_session, months=1)

        assert len(trend_data) == 1
        assert trend_data[0]["month"] == "2024-02"  # Most recent

    def test_get_sources_breakdown(self, db_session: Session):
        """Test getting sources breakdown."""
        # Create transactions with different sources
        sources_data = [
            ("2024-01-15", 300000, "Salary", "Bank A", True, False),
            ("2024-01-20", -50000, "Shopping", "Card B", False, False),
            ("2024-01-22", -30000, "Food", "Card B", False, False),
        ]

        for date_str, amount, desc, source, is_income, is_transfer in sources_data:
            tx_date = date.fromisoformat(date_str)
            tx_hash = generate_tx_hash(date_str, amount, desc, source)

            tx = Transaction(
                date=tx_date,
                description=desc,
                amount=amount,
                category="Test",
                source=source,
                is_income=is_income,
                is_transfer=is_transfer,
                month_key=tx_date.strftime("%Y-%m"),
                tx_hash=tx_hash,
            )
            db_session.add(tx)

        db_session.commit()

        sources = AnalyticsService.get_sources_breakdown(db_session)

        assert len(sources) == 2
        source_names = [s["source"] for s in sources]
        assert "Bank A" in source_names
        assert "Card B" in source_names

    def test_sources_breakdown_excludes_transfers(self, db_session: Session):
        """Test that sources breakdown excludes transfers."""
        sources_data = [
            ("2024-01-15", 50000, "Normal", "Bank A", False, False),
            ("2024-01-16", 30000, "Transfer", "Bank A", False, True),
        ]

        for date_str, amount, desc, source, is_income, is_transfer in sources_data:
            tx_date = date.fromisoformat(date_str)
            tx_hash = generate_tx_hash(date_str, amount, desc, source)

            tx = Transaction(
                date=tx_date,
                description=desc,
                amount=amount,
                category="Test",
                source=source,
                is_income=is_income,
                is_transfer=is_transfer,
                month_key=tx_date.strftime("%Y-%m"),
                tx_hash=tx_hash,
            )
            db_session.add(tx)

        db_session.commit()

        sources = AnalyticsService.get_sources_breakdown(db_session)

        # Should only count non-transfer transaction
        bank_a = next(s for s in sources if s["source"] == "Bank A")
        assert bank_a["count"] == 1
