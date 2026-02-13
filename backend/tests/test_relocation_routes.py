"""Tests for relocation API endpoints."""
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


@pytest.fixture(scope="module")
def test_client():
    """FastAPI test client backed by a seeded DB session."""
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)
    try:
        engine = create_engine(f"sqlite:///{db_path}")
        Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        Base.metadata.create_all(bind=engine)
        db = Session()
        _seed(db)
        db.close()

        def override():
            s = Session()
            try:
                yield s
            finally:
                s.close()

        app.dependency_overrides[get_db] = override
        yield TestClient(app)
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def _seed(db):
    """Insert 3 cities: Tokyo, Fukuoka, Osaka."""
    db.add_all([
        RegionalCity(id=1, prefecture_code=13, city_code=13101,
                     prefecture_name="東京都", city_name="千代田区",
                     prefecture_name_en="Tokyo", city_name_en="Chiyoda"),
        RegionalCity(id=2, prefecture_code=40, city_code=40100,
                     prefecture_name="福岡県", city_name="福岡市",
                     prefecture_name_en="Fukuoka", city_name_en="Fukuoka"),
        RegionalCity(id=3, prefecture_code=27, city_code=27100,
                     prefecture_name="大阪府", city_name="大阪市",
                     prefecture_name_en="Osaka", city_name_en="Osaka"),
    ])
    db.flush()
    db.add_all([
        RegionalRent(city_id=1, room_type="1K", average_rent=100_000, data_year=2024),
        RegionalRent(city_id=2, room_type="1K", average_rent=45_000, data_year=2024),
        RegionalRent(city_id=3, room_type="1K", average_rent=60_000, data_year=2024),
    ])
    for cid, food, util, trans in [(1, 1.10, 1.05, 1.08), (2, 0.92, 0.95, 0.90), (3, 1.0, 1.0, 1.0)]:
        db.add_all([
            RegionalCostIndex(city_id=cid, category="food", index_value=food, data_year=2024),
            RegionalCostIndex(city_id=cid, category="utilities", index_value=util, data_year=2024),
            RegionalCostIndex(city_id=cid, category="transport", index_value=trans, data_year=2024),
        ])
    db.add_all([
        PrefectureInsuranceRate(prefecture_code=13, rate=0.0998, data_year=2024),
        PrefectureInsuranceRate(prefecture_code=40, rate=0.1033, data_year=2024),
        PrefectureInsuranceRate(prefecture_code=27, rate=0.1018, data_year=2024),
    ])
    db.commit()


class TestRelocationRoutes:
    """Tests for relocation API endpoints."""

    def test_list_cities(self, test_client):
        resp = test_client.get("/api/relocation/cities")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 3

    def test_compare_valid(self, test_client):
        resp = test_client.post("/api/relocation/compare", json={
            "nenshu": 5_000_000, "family_size": "single", "room_type": "1K",
            "current_city_id": 1, "target_city_id": 2,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "current" in data and "target" in data
        assert data["current"]["rent"] == 100_000

    def test_compare_invalid_city(self, test_client):
        resp = test_client.post("/api/relocation/compare", json={
            "nenshu": 5_000_000, "family_size": "single", "room_type": "1K",
            "current_city_id": 1, "target_city_id": 999,
        })
        assert resp.status_code == 404

    def test_compare_invalid_family_size(self, test_client):
        resp = test_client.post("/api/relocation/compare", json={
            "nenshu": 5_000_000, "family_size": "invalid", "room_type": "1K",
            "current_city_id": 1, "target_city_id": 2,
        })
        assert resp.status_code == 422

    def test_compare_negative_nenshu(self, test_client):
        resp = test_client.post("/api/relocation/compare", json={
            "nenshu": -1, "family_size": "single", "room_type": "1K",
            "current_city_id": 1, "target_city_id": 2,
        })
        assert resp.status_code == 422

    def test_compare_returns_advice(self, test_client):
        resp = test_client.post("/api/relocation/compare", json={
            "nenshu": 5_000_000, "family_size": "single", "room_type": "1K",
            "current_city_id": 1, "target_city_id": 2,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "advice" in data
        assert isinstance(data["advice"], list)
        assert 3 <= len(data["advice"]) <= 5

    def test_resolve_postal_invalid_format(self, test_client):
        resp = test_client.get("/api/relocation/resolve-postal", params={"code": "123"})
        assert resp.status_code == 400

    def test_resolve_postal_non_digits(self, test_client):
        resp = test_client.get("/api/relocation/resolve-postal", params={"code": "abc1234"})
        assert resp.status_code == 400
