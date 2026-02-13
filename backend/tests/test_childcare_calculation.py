"""Tests for childcare cost calculation logic."""
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
from app.services.relocation_service import RelocationService, _calc_childcare
from app.utils.constants import CHILDCARE_MONTHLY_AVG, TOKYO_PREFECTURE_CODE, OSAKA_PREFECTURE_CODE


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
    """Insert cities for Tokyo, Fukuoka, and Osaka."""
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
        RegionalCity(
            id=3, prefecture_code=27, city_code=27100,
            prefecture_name="大阪府", city_name="大阪市",
            prefecture_name_en="Osaka", city_name_en="Osaka",
        ),
    ])
    db.flush()
    db.add_all([
        RegionalRent(city_id=1, room_type="1K", average_rent=100_000, data_year=2024),
        RegionalRent(city_id=2, room_type="1K", average_rent=45_000, data_year=2024),
        RegionalRent(city_id=3, room_type="1K", average_rent=60_000, data_year=2024),
    ])
    for cid, food, util, trans in [
        (1, 1.10, 1.05, 1.08),
        (2, 0.92, 0.95, 0.90),
        (3, 1.00, 1.00, 1.00),
    ]:
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


class TestChildcareCalculation:
    """Tests for _calc_childcare logic."""

    @pytest.mark.parametrize("prefecture_code", [TOKYO_PREFECTURE_CODE, OSAKA_PREFECTURE_CODE])
    def test_free_childcare_tokyo_osaka(self, prefecture_code):
        assert _calc_childcare(prefecture_code, has_young_children=True) == 0

    def test_childcare_other_city(self):
        assert _calc_childcare(40, has_young_children=True) == CHILDCARE_MONTHLY_AVG

    def test_no_young_children_always_zero(self):
        assert _calc_childcare(40, has_young_children=False) == 0
        assert _calc_childcare(TOKYO_PREFECTURE_CODE, has_young_children=False) == 0

    def test_childcare_in_compare_tokyo(self, db_session):
        """Tokyo city (id=1) with young children -> childcare = 0."""
        req = RelocationCompareRequest(
            nenshu=5_000_000, family_size="couple_1", room_type="1K",
            current_city_id=1, target_city_id=2, has_young_children=True,
        )
        result = RelocationService.compare_cities(db_session, req)
        assert result.current.estimated_childcare == 0
        assert result.target.estimated_childcare == CHILDCARE_MONTHLY_AVG

    def test_childcare_in_compare_osaka(self, db_session):
        """Osaka city (id=3) with young children -> childcare = 0."""
        req = RelocationCompareRequest(
            nenshu=5_000_000, family_size="couple_1", room_type="1K",
            current_city_id=3, target_city_id=2, has_young_children=True,
        )
        result = RelocationService.compare_cities(db_session, req)
        assert result.current.estimated_childcare == 0
        assert result.target.estimated_childcare == CHILDCARE_MONTHLY_AVG

    def test_childcare_added_to_total(self, db_session):
        """Childcare cost should increase total_monthly for non-free cities."""
        req_no_kids = RelocationCompareRequest(
            nenshu=5_000_000, family_size="couple_1", room_type="1K",
            current_city_id=2, target_city_id=1, has_young_children=False,
        )
        req_kids = RelocationCompareRequest(
            nenshu=5_000_000, family_size="couple_1", room_type="1K",
            current_city_id=2, target_city_id=1, has_young_children=True,
        )
        no_kids = RelocationService.compare_cities(db_session, req_no_kids)
        with_kids = RelocationService.compare_cities(db_session, req_kids)
        # Fukuoka (id=2) charges childcare; Tokyo (id=1) is free
        assert with_kids.current.total_monthly == no_kids.current.total_monthly + CHILDCARE_MONTHLY_AVG
        assert with_kids.target.total_monthly == no_kids.target.total_monthly  # Tokyo free
