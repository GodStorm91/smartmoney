"""Tests for theme settings routes."""
import tempfile
import os
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import get_db
from app.main import app
from app.models.transaction import Base
from app.auth.utils import create_access_token


@pytest.fixture(scope="module")
def test_client():
    """Create a test client with file-based database."""
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)

    try:
        engine = create_engine(f"sqlite:///{db_path}")
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

        # Create tables
        Base.metadata.create_all(bind=engine)

        def override_get_db():
            try:
                db = TestingSessionLocal()
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db

        with patch("app.database.engine", engine):
            with patch("app.database.SessionLocal", TestingSessionLocal):
                client = TestClient(app)
                yield client

        Base.metadata.drop_all(bind=engine)
    finally:
        os.unlink(db_path)


@pytest.fixture(scope="function")
def auth_headers(test_client):
    """Create a test user and return authentication headers."""
    import random
    # Register user with unique email
    unique_email = f"theme_test_{random.randint(1000, 9999)}@example.com"
    response = test_client.post(
        "/api/auth/register",
        json={"email": unique_email, "password": "testpass123"}
    )
    assert response.status_code == 201
    user_data = response.json()

    # Create access token
    token = create_access_token(data={"sub": user_data["id"]})
    return {"Authorization": f"Bearer {token}"}


def test_get_default_theme_settings(test_client, auth_headers):
    """Test getting default theme settings for a new user."""
    response = test_client.get("/api/user/theme-settings", headers=auth_headers)
    assert response.status_code == 200

    data = response.json()
    assert data["theme_name"] == "catppuccin-mocha"
    assert data["accent_color"] == "#89b4fa"
    assert data["font_size"] == "medium"
    assert data["other_preferences"] == {}


def test_update_theme_settings(test_client, auth_headers):
    """Test updating theme settings."""
    new_settings = {
        "theme_name": "catppuccin-latte",
        "accent_color": "#ff5555",
        "font_size": "large",
        "other_preferences": {"compact_mode": True}
    }

    response = test_client.put(
        "/api/user/theme-settings",
        json=new_settings,
        headers=auth_headers
    )
    assert response.status_code == 200

    data = response.json()
    assert data["theme_name"] == "catppuccin-latte"
    assert data["accent_color"] == "#ff5555"
    assert data["font_size"] == "large"
    assert data["other_preferences"]["compact_mode"] is True


def test_partial_update_theme_settings(test_client, auth_headers):
    """Test partial update of theme settings."""
    # First, set some initial settings
    initial_settings = {
        "theme_name": "dark-mode",
        "accent_color": "#00ff00",
        "font_size": "small"
    }
    test_client.put("/api/user/theme-settings", json=initial_settings, headers=auth_headers)

    # Then update only accent_color
    partial_update = {"accent_color": "#ff00ff"}
    response = test_client.put(
        "/api/user/theme-settings",
        json=partial_update,
        headers=auth_headers
    )
    assert response.status_code == 200

    data = response.json()
    # Verify accent_color changed
    assert data["accent_color"] == "#ff00ff"
    # Verify other fields remained the same
    assert data["theme_name"] == "dark-mode"
    assert data["font_size"] == "small"


def test_get_theme_settings_after_update(test_client, auth_headers):
    """Test getting theme settings after update persists correctly."""
    # Update settings
    settings = {
        "theme_name": "custom-theme",
        "accent_color": "#123456",
        "font_size": "medium",
        "other_preferences": {"sidebar_collapsed": False}
    }
    test_client.put("/api/user/theme-settings", json=settings, headers=auth_headers)

    # Get settings
    response = test_client.get("/api/user/theme-settings", headers=auth_headers)
    assert response.status_code == 200

    data = response.json()
    assert data["theme_name"] == "custom-theme"
    assert data["accent_color"] == "#123456"
    assert data["font_size"] == "medium"
    assert data["other_preferences"]["sidebar_collapsed"] is False


def test_unauthorized_access_theme_settings(test_client):
    """Test accessing theme settings without authentication."""
    response = test_client.get("/api/user/theme-settings")
    assert response.status_code == 401


def test_update_other_preferences_complex(test_client, auth_headers):
    """Test updating complex nested other_preferences."""
    complex_prefs = {
        "other_preferences": {
            "compact_mode": True,
            "animation_speed": "fast",
            "custom_colors": {
                "primary": "#ff0000",
                "secondary": "#00ff00"
            },
            "feature_flags": ["dark_mode", "beta_features"]
        }
    }

    response = test_client.put(
        "/api/user/theme-settings",
        json=complex_prefs,
        headers=auth_headers
    )
    assert response.status_code == 200

    data = response.json()
    assert data["other_preferences"]["compact_mode"] is True
    assert data["other_preferences"]["animation_speed"] == "fast"
    assert data["other_preferences"]["custom_colors"]["primary"] == "#ff0000"
    assert "dark_mode" in data["other_preferences"]["feature_flags"]


def test_multiple_users_theme_isolation(test_client):
    """Test that theme settings are isolated per user."""
    # Create first user
    test_client.post(
        "/api/auth/register",
        json={"email": "user1@example.com", "password": "pass123"}
    )
    user1_response = test_client.post(
        "/api/auth/login",
        data={"username": "user1@example.com", "password": "pass123"}
    )
    user1_token = user1_response.json()["access_token"]
    user1_headers = {"Authorization": f"Bearer {user1_token}"}

    # Create second user
    test_client.post(
        "/api/auth/register",
        json={"email": "user2@example.com", "password": "pass123"}
    )
    user2_response = test_client.post(
        "/api/auth/login",
        data={"username": "user2@example.com", "password": "pass123"}
    )
    user2_token = user2_response.json()["access_token"]
    user2_headers = {"Authorization": f"Bearer {user2_token}"}

    # Set different themes
    test_client.put(
        "/api/user/theme-settings",
        json={"theme_name": "user1-theme", "accent_color": "#111111"},
        headers=user1_headers
    )
    test_client.put(
        "/api/user/theme-settings",
        json={"theme_name": "user2-theme", "accent_color": "#222222"},
        headers=user2_headers
    )

    # Verify isolation
    user1_theme = test_client.get("/api/user/theme-settings", headers=user1_headers).json()
    user2_theme = test_client.get("/api/user/theme-settings", headers=user2_headers).json()

    assert user1_theme["theme_name"] == "user1-theme"
    assert user1_theme["accent_color"] == "#111111"
    assert user2_theme["theme_name"] == "user2-theme"
    assert user2_theme["accent_color"] == "#222222"
