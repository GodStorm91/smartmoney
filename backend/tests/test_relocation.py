"""Tests for relocation service and API routes."""
import os
import tempfile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import get_db
from app.main import app
from app.models.regional_data import (
    PrefectureInsuranceRate,
    RegionalCity,
    RegionalCostIndex,
    RegionalRent,
)
from app.models.transaction import Base
from app.services.relocation_service import RelocationService
from app.schemas.relocation import RelocationCompareRequest


@pytest.fixture(scope="module")
def db_session():
    """File-based SQLite session with seeded regional data."""
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


@pytest.fixture(scope="module")
def test_client(db_session):
    """FastAPI test client backed by the seeded DB session."""
    engine = db_session.get_bind()
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override():
        s = Session()
        try:
            yield s
        finally:
            s.close()

    app.dependency_overrides[get_db] = override
    yield TestClient(app)
    app.dependency_overrides.clear()


def _seed(db):
    """Insert minimal test data: 2 cities in different prefectures."""
    c1 = RegionalCity(
        id=1, prefecture_code=13, city_code=13101,
        prefecture_name="東京都", city_name="千代田区",
        prefecture_name_en="Tokyo", city_name_en="Chiyoda",
    )
    c2 = RegionalCity(
        id=2, prefecture_code=40, city_code=40100,
        prefecture_name="福岡県", city_name="福岡市",
        prefecture_name_en="Fukuoka", city_name_en="Fukuoka",
    )
    db.add_all([c1, c2])
    db.flush()

    db.add_all([
        RegionalRent(city_id=1, room_type="1K", average_rent=100_000, data_year=2024),
        RegionalRent(city_id=2, room_type="1K", average_rent=45_000, data_year=2024),
    ])
    for cid, food, util, trans in [(1, 1.10, 1.05, 1.08), (2, 0.92, 0.95, 0.90)]:
        db.add_all([
            RegionalCostIndex(city_id=cid, category="food", index_value=food, data_year=2024),
            RegionalCostIndex(city_id=cid, category="utilities", index_value=util, data_year=2024),
            RegionalCostIndex(city_id=cid, category="transport", index_value=trans, data_year=2024),
        ])
    db.add_all([
        PrefectureInsuranceRate(prefecture_code=13, rate=0.0998, data_year=2024),
        PrefectureInsuranceRate(prefecture_code=40, rate=0.1033, data_year=2024),
    ])
    db.commit()


class TestRelocationService:
    """Tests for RelocationService business logic."""

    def test_get_cities(self, db_session):
        cities = RelocationService.get_cities(db_session)
        assert len(cities) == 2
        names = {c.city_name_en for c in cities}
        assert names == {"Chiyoda", "Fukuoka"}

    def test_compare_cities_basic(self, db_session):
        req = RelocationCompareRequest(
            nenshu=5_000_000, family_size="single", room_type="1K",
            current_city_id=1, target_city_id=2,
        )
        result = RelocationService.compare_cities(db_session, req)
        assert result.current.city_name == "千代田区"
        assert result.target.city_name == "福岡市"
        assert result.current.rent == 100_000
        assert result.target.rent == 45_000
        # Tokyo more expensive -> moving to Fukuoka saves money
        assert result.monthly_difference < 0
        assert result.annual_difference == result.monthly_difference * 12

    def test_compare_city_not_found(self, db_session):
        req = RelocationCompareRequest(
            nenshu=5_000_000, family_size="single", room_type="1K",
            current_city_id=1, target_city_id=999,
        )
        with pytest.raises(ValueError, match="City not found"):
            RelocationService.compare_cities(db_session, req)

    def test_couple_higher_food_cost(self, db_session):
        single = RelocationCompareRequest(
            nenshu=5_000_000, family_size="single", room_type="1K",
            current_city_id=1, target_city_id=2,
        )
        couple = RelocationCompareRequest(
            nenshu=5_000_000, family_size="couple", room_type="1K",
            current_city_id=1, target_city_id=2,
        )
        r_single = RelocationService.compare_cities(db_session, single)
        r_couple = RelocationService.compare_cities(db_session, couple)
        assert r_couple.current.estimated_food > r_single.current.estimated_food


class TestRelocationRoutes:
    """Tests for relocation API endpoints."""

    def test_list_cities(self, test_client):
        resp = test_client.get("/api/relocation/cities")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["city_name_en"] in ("Chiyoda", "Fukuoka")

    def test_compare_valid(self, test_client):
        resp = test_client.post("/api/relocation/compare", json={
            "nenshu": 5_000_000,
            "family_size": "single",
            "room_type": "1K",
            "current_city_id": 1,
            "target_city_id": 2,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "current" in data
        assert "target" in data
        assert "monthly_difference" in data
        assert data["current"]["rent"] == 100_000

    def test_compare_invalid_city(self, test_client):
        resp = test_client.post("/api/relocation/compare", json={
            "nenshu": 5_000_000,
            "family_size": "single",
            "room_type": "1K",
            "current_city_id": 1,
            "target_city_id": 999,
        })
        assert resp.status_code == 404

    def test_compare_invalid_family_size(self, test_client):
        resp = test_client.post("/api/relocation/compare", json={
            "nenshu": 5_000_000,
            "family_size": "invalid",
            "room_type": "1K",
            "current_city_id": 1,
            "target_city_id": 2,
        })
        assert resp.status_code == 422

    def test_compare_negative_nenshu(self, test_client):
        resp = test_client.post("/api/relocation/compare", json={
            "nenshu": -1,
            "family_size": "single",
            "room_type": "1K",
            "current_city_id": 1,
            "target_city_id": 2,
        })
        assert resp.status_code == 422
