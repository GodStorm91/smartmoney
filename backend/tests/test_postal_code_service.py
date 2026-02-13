"""Tests for postal code resolution service."""
import os
import tempfile
from unittest.mock import patch, MagicMock

import httpx
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.regional_data import RegionalCity
from app.models.transaction import Base
from app.services import postal_code_service
from app.services.postal_code_service import resolve_postal_code, _postal_cache


@pytest.fixture(autouse=True)
def clear_postal_cache():
    """Clear the postal code cache before each test."""
    _postal_cache.clear()
    yield
    _postal_cache.clear()


@pytest.fixture(scope="module")
def db_session():
    """File-based SQLite session with seeded city data."""
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)
    try:
        engine = create_engine(f"sqlite:///{db_path}")
        Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        Base.metadata.create_all(bind=engine)
        db = Session()
        _seed(db)
        yield db
        db.close()
        Base.metadata.drop_all(bind=engine)
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def _seed(db):
    """Insert minimal city data for postal code matching."""
    db.add_all([
        RegionalCity(
            id=1, prefecture_code=13, city_code=13101,
            prefecture_name="東京都", city_name="千代田区",
            prefecture_name_en="Tokyo", city_name_en="Chiyoda",
        ),
        RegionalCity(
            id=2, prefecture_code=40, city_code=40100,
            prefecture_name="福岡県", city_name="福岡市",
            prefecture_name_en="Fukuoka", city_name_en="Fukuoka",
        ),
    ])
    db.commit()


def _mock_zipcloud_response(address1="東京都", address2="千代田区", address3=""):
    """Build a mock Zipcloud API JSON response."""
    return {
        "status": 200,
        "results": [
            {"address1": address1, "address2": address2, "address3": address3,
             "kana1": "", "kana2": "", "kana3": "", "zipcode": "1000001"}
        ],
    }


class TestPostalCodeResolution:
    """Tests for resolve_postal_code."""

    @patch("app.services.postal_code_service.httpx.get")
    def test_valid_postal_code_matched(self, mock_get, db_session):
        """Valid postal code matching a known city returns matched=True."""
        mock_resp = MagicMock()
        mock_resp.json.return_value = _mock_zipcloud_response("東京都", "千代田区")
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp

        result = resolve_postal_code(db_session, "1000001")
        assert result.matched is True
        assert result.city_id == 1
        assert result.city_name == "千代田区"
        assert result.prefecture_name == "東京都"
        assert result.error is None

    @patch("app.services.postal_code_service.httpx.get")
    def test_valid_postal_code_no_match(self, mock_get, db_session):
        """Valid postal code for a city not in our DB returns matched=False."""
        mock_resp = MagicMock()
        mock_resp.json.return_value = _mock_zipcloud_response("北海道", "札幌市")
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp

        result = resolve_postal_code(db_session, "0600000")
        assert result.matched is False
        assert result.city_id is None
        assert result.error == "not_found"

    @patch("app.services.postal_code_service.httpx.get")
    def test_zipcloud_returns_no_results(self, mock_get, db_session):
        """Zipcloud returns empty results for unknown postal code."""
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"status": 200, "results": None}
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp

        result = resolve_postal_code(db_session, "9999999")
        assert result.matched is False
        assert result.error == "not_found"

    @patch("app.services.postal_code_service.httpx.get")
    def test_zipcloud_api_timeout(self, mock_get, db_session):
        """Zipcloud API timeout returns graceful error."""
        mock_get.side_effect = httpx.TimeoutException("Connection timed out")

        result = resolve_postal_code(db_session, "1000001")
        assert result.matched is False
        assert result.error == "api_error"

    @patch("app.services.postal_code_service.httpx.get")
    def test_zipcloud_api_http_error(self, mock_get, db_session):
        """Zipcloud API HTTP error returns graceful error."""
        mock_get.side_effect = httpx.HTTPStatusError(
            "Server Error", request=MagicMock(), response=MagicMock()
        )

        result = resolve_postal_code(db_session, "1000001")
        assert result.matched is False
        assert result.error == "api_error"

    @patch("app.services.postal_code_service.httpx.get")
    def test_fuzzy_match_ward_in_city(self, mock_get, db_session):
        """Zipcloud ward name contained in our city_name matches."""
        mock_resp = MagicMock()
        # "福岡市" contains "福岡" — the reverse lookup should work
        mock_resp.json.return_value = _mock_zipcloud_response("福岡県", "福岡市中央区")
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp

        result = resolve_postal_code(db_session, "8100001")
        assert result.matched is True
        assert result.city_id == 2

    @patch("app.services.postal_code_service.httpx.get")
    def test_cache_prevents_second_api_call(self, mock_get, db_session):
        """Second call for same postal code uses cache, no API call."""
        mock_resp = MagicMock()
        mock_resp.json.return_value = _mock_zipcloud_response("東京都", "千代田区")
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp

        result1 = resolve_postal_code(db_session, "1000001")
        assert result1.matched is True
        assert mock_get.call_count == 1

        result2 = resolve_postal_code(db_session, "1000001")
        assert result2.matched is True
        assert mock_get.call_count == 1  # no second call
