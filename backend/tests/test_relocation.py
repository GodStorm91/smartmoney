"""Tests for RelocationService business logic."""
import os
import tempfile

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.regional_data import (
    PrefectureInsuranceRate,
    RegionalCity,
    RegionalCostIndex,
    RegionalRent,
)
from app.models.transaction import Base
from app.schemas.relocation import RelocationCompareRequest
from app.services.relocation_service import RelocationService


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


class TestRelocationService:
    """Tests for RelocationService business logic."""

    def test_get_cities(self, db_session):
        cities = RelocationService.get_cities(db_session)
        assert len(cities) == 3
        names = {c.city_name_en for c in cities}
        assert names == {"Chiyoda", "Fukuoka", "Osaka"}

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
