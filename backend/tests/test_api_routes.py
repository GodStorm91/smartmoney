"""Tests for API routes."""
from datetime import date
from unittest.mock import patch
import tempfile
import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import get_db
from app.main import app
from app.models.transaction import Base


@pytest.fixture(scope="module")
def test_client():
    """Create a test client with file-based database for better concurrency."""
    # Use a temporary database file instead of in-memory
    # to avoid SQLite threading issues with FastAPI TestClient
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)

    try:
        engine = create_engine(f"sqlite:///{db_path}")
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

        # Create tables
        Base.metadata.create_all(bind=engine)

        # Override dependency
        def override_get_db():
            try:
                db = TestingSessionLocal()
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db

        # Patch the database module's engine and SessionLocal
        with patch("app.database.engine", engine):
            with patch("app.database.SessionLocal", TestingSessionLocal):
                client = TestClient(app)
                yield client

        # Cleanup
        Base.metadata.drop_all(bind=engine)
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


class TestHealthEndpoints:
    """Tests for health check endpoints."""

    def test_root_endpoint(self, test_client):
        """Test root endpoint."""
        response = test_client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "SmartMoney" in data["message"]

    def test_health_check_endpoint(self, test_client):
        """Test health check endpoint."""
        response = test_client.get("/api/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


class TestTransactionRoutes:
    """Tests for transaction API routes."""

    def test_create_transaction(self, test_client):
        """Test creating a transaction via API."""
        transaction_data = {
            "date": "2024-01-15",
            "description": "Test transaction",
            "amount": -5000,
            "category": "Food",
            "source": "Test Card",
            "is_income": False,
            "is_transfer": False,
        }

        response = test_client.post("/api/transactions/", json=transaction_data)
        assert response.status_code == 201
        data = response.json()
        assert data["amount"] == -5000
        assert data["category"] == "Food"

    def test_get_transactions(self, test_client):
        """Test getting transactions list."""
        response = test_client.get("/api/transactions/")
        assert response.status_code == 200
        data = response.json()
        assert "transactions" in data
        assert "total" in data

    def test_get_transaction_summary(self, test_client):
        """Test getting transaction summary."""
        response = test_client.get("/api/transactions/summary/total")
        assert response.status_code == 200
        data = response.json()
        assert "income" in data
        assert "expenses" in data
        assert "net" in data


class TestAnalyticsRoutes:
    """Tests for analytics API routes."""

    def test_get_monthly_cashflow(self, test_client):
        """Test getting monthly cashflow."""
        response = test_client.get("/api/analytics/monthly")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_category_breakdown(self, test_client):
        """Test getting category breakdown."""
        response = test_client.get("/api/analytics/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestGoalRoutes:
    """Tests for goal API routes."""

    def test_create_goal(self, test_client):
        """Test creating a goal."""
        goal_data = {
            "years": 5,
            "target_amount": 10000000,
            "start_date": "2024-01-01",
        }

        response = test_client.post("/api/goals/", json=goal_data)
        assert response.status_code == 201
        data = response.json()
        assert data["years"] == 5
        assert data["target_amount"] == 10000000

    def test_get_all_goals(self, test_client):
        """Test getting all goals."""
        response = test_client.get("/api/goals/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
