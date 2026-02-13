"""Relocation comparison service for city cost-of-living analysis."""
import logging

from sqlalchemy.orm import Session

from ..models.regional_data import (
    PrefectureInsuranceRate,
    RegionalCity,
    RegionalCostIndex,
    RegionalRent,
)
from ..schemas.relocation import (
    CityBreakdown,
    CityListItem,
    PostalCodeResponse,
    RelocationCompareRequest,
    RelocationCompareResponse,
)
from ..utils.constants import (
    CHILDCARE_MONTHLY_AVG,
    OSAKA_PREFECTURE_CODE,
    TOKYO_PREFECTURE_CODE,
)
from ..utils.relocation_advice import generate_advice
from ..utils.tax_calculator import (
    calculate_income_tax,
    calculate_resident_tax,
    calculate_social_insurance,
)
from .postal_code_service import resolve_postal_code as _resolve_postal_code

logger = logging.getLogger(__name__)

# National-average monthly baselines (single person, JPY)
_BASE_FOOD = 40_000
_BASE_UTILITIES = 12_000
_BASE_TRANSPORT = 10_000

# Family-size multipliers for living costs
_FAMILY_MULTIPLIER = {
    "single": 1.0,
    "couple": 1.6,
    "couple_1": 2.0,
    "couple_2": 2.3,
    "couple_3": 2.6,
}

# Family-size to number of dependents
_DEPENDENTS = {
    "single": 0,
    "couple": 1,
    "couple_1": 2,
    "couple_2": 3,
    "couple_3": 4,
}


def _calc_childcare(prefecture_code: int, has_young_children: bool) -> int:
    """Calculate monthly childcare cost for children aged 0-2."""
    if not has_young_children:
        return 0
    if prefecture_code in (TOKYO_PREFECTURE_CODE, OSAKA_PREFECTURE_CODE):
        return 0
    return CHILDCARE_MONTHLY_AVG


def _build_breakdown(
    city: RegionalCity,
    rent: int,
    cost_indices: dict[str, float],
    family_size: str,
    nenshu: int,
    insurance_rate: float,
    has_young_children: bool = False,
) -> CityBreakdown:
    """Build a monthly cost breakdown for one city."""
    multiplier = _FAMILY_MULTIPLIER.get(family_size, 1.0)
    dependents = _DEPENDENTS.get(family_size, 0)

    food = int(_BASE_FOOD * cost_indices.get("food", 1.0) * multiplier)
    utilities = int(_BASE_UTILITIES * cost_indices.get("utilities", 1.0) * multiplier)
    transport = int(_BASE_TRANSPORT * cost_indices.get("transport", 1.0) * multiplier)

    annual_si = calculate_social_insurance(nenshu, insurance_rate)
    annual_rt = calculate_resident_tax(nenshu, dependents)
    annual_it = calculate_income_tax(nenshu, dependents)

    monthly_si = annual_si // 12
    monthly_rt = annual_rt // 12
    monthly_it = annual_it // 12

    childcare = _calc_childcare(city.prefecture_code, has_young_children)

    total = rent + food + utilities + transport + monthly_si + monthly_rt + monthly_it + childcare

    return CityBreakdown(
        city_name=city.city_name,
        prefecture_name=city.prefecture_name,
        rent=rent,
        estimated_food=food,
        estimated_utilities=utilities,
        estimated_transport=transport,
        social_insurance=monthly_si,
        resident_tax=monthly_rt,
        income_tax=monthly_it,
        estimated_childcare=childcare,
        total_monthly=total,
    )


class RelocationService:
    """Service for relocation cost comparison."""

    @staticmethod
    def get_cities(db: Session) -> list[CityListItem]:
        """Return all available cities sorted by prefecture then name.

        Args:
            db: Database session.

        Returns:
            List of city items.
        """
        cities = (
            db.query(RegionalCity)
            .order_by(RegionalCity.prefecture_code, RegionalCity.city_name)
            .all()
        )
        return [
            CityListItem(
                id=c.id,
                city_name=c.city_name,
                city_name_en=c.city_name_en,
                prefecture_name=c.prefecture_name,
                prefecture_name_en=c.prefecture_name_en,
            )
            for c in cities
        ]

    @staticmethod
    def compare_cities(
        db: Session, req: RelocationCompareRequest
    ) -> RelocationCompareResponse:
        """Compare monthly costs between two cities.

        Args:
            db: Database session.
            req: Comparison request with nenshu, family size, etc.

        Returns:
            Comparison response with breakdowns and differences.

        Raises:
            ValueError: If city or required data not found.
        """
        current_city = db.get(RegionalCity, req.current_city_id)
        target_city = db.get(RegionalCity, req.target_city_id)
        if not current_city or not target_city:
            raise ValueError("City not found")

        room = req.room_type.value

        def _rent(city: RegionalCity) -> int:
            r = (
                db.query(RegionalRent)
                .filter_by(city_id=city.id, room_type=room)
                .first()
            )
            return r.average_rent if r else 0

        def _costs(city: RegionalCity) -> dict[str, float]:
            rows = db.query(RegionalCostIndex).filter_by(city_id=city.id).all()
            return {r.category: r.index_value for r in rows}

        def _insurance(city: RegionalCity) -> float:
            row = (
                db.query(PrefectureInsuranceRate)
                .filter_by(prefecture_code=city.prefecture_code)
                .first()
            )
            return float(row.rate) if row else 0.10

        cur = _build_breakdown(
            current_city,
            _rent(current_city),
            _costs(current_city),
            req.family_size.value,
            req.nenshu,
            _insurance(current_city),
            req.has_young_children,
        )
        tgt = _build_breakdown(
            target_city,
            _rent(target_city),
            _costs(target_city),
            req.family_size.value,
            req.nenshu,
            _insurance(target_city),
            req.has_young_children,
        )

        diff = tgt.total_monthly - cur.total_monthly
        annual = diff * 12

        advice = generate_advice(
            current=cur,
            target=tgt,
            nenshu=req.nenshu,
            has_young_children=req.has_young_children,
            monthly_diff=diff,
            annual_diff=annual,
        )

        return RelocationCompareResponse(
            current=cur,
            target=tgt,
            monthly_difference=diff,
            annual_difference=annual,
            advice=advice,
        )


    @staticmethod
    def resolve_postal_code(db: Session, postal_code: str) -> PostalCodeResponse:
        """Resolve a 7-digit Japanese postal code to a RegionalCity."""
        return _resolve_postal_code(db, postal_code)


_service: RelocationService | None = None


def get_relocation_service() -> RelocationService:
    """Get singleton RelocationService instance."""
    global _service
    if _service is None:
        _service = RelocationService()
    return _service
