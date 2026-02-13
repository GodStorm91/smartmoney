"""Postal code resolution service using Zipcloud API."""
import logging
import time

import httpx
from sqlalchemy.orm import Session

from ..models.regional_data import RegionalCity
from ..schemas.relocation import PostalCodeResponse

logger = logging.getLogger(__name__)

ZIPCLOUD_API_URL = "https://zipcloud.ibsnet.co.jp/api/search"
ZIPCLOUD_TIMEOUT = 5.0

# Simple TTL cache: {postal_code: (result_dict, timestamp)}
_postal_cache: dict[str, tuple[dict, float]] = {}
_POSTAL_CACHE_TTL = 3600  # 1 hour


def _match_city(db: Session, prefecture: str, city_ward: str) -> RegionalCity | None:
    """Match Zipcloud address to a RegionalCity using exact then fuzzy match."""
    # Exact match on prefecture_name + city_name
    city = (
        db.query(RegionalCity)
        .filter(
            RegionalCity.prefecture_name == prefecture,
            RegionalCity.city_name == city_ward,
        )
        .first()
    )
    if city:
        return city

    # Fallback: our city_name contains the Zipcloud ward name
    if city_ward:
        city = (
            db.query(RegionalCity)
            .filter(
                RegionalCity.prefecture_name == prefecture,
                RegionalCity.city_name.contains(city_ward),
            )
            .first()
        )
        if city:
            return city

    # Fallback: Zipcloud ward name contains our city_name
    if city_ward:
        candidates = (
            db.query(RegionalCity)
            .filter(RegionalCity.prefecture_name == prefecture)
            .all()
        )
        for c in candidates:
            if c.city_name in city_ward:
                return c

    return None


def resolve_postal_code(db: Session, postal_code: str) -> PostalCodeResponse:
    """Resolve a 7-digit Japanese postal code to a RegionalCity.

    Calls the Zipcloud API and matches the result against our
    RegionalCity table using prefecture_name + city_name.
    """
    now = time.time()
    cached = _postal_cache.get(postal_code)
    if cached and (now - cached[1]) < _POSTAL_CACHE_TTL:
        return PostalCodeResponse(**cached[0])

    try:
        resp = httpx.get(
            ZIPCLOUD_API_URL,
            params={"zipcode": postal_code},
            timeout=ZIPCLOUD_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
    except (httpx.HTTPError, ValueError) as e:
        logger.error("Zipcloud API error for %s: %s", postal_code, e)
        return PostalCodeResponse(error="api_error")

    results = data.get("results")
    if not results:
        result = {"error": "not_found", "matched": False}
        _postal_cache[postal_code] = (result, now)
        return PostalCodeResponse(**result)

    entry = results[0]
    prefecture = entry.get("address1", "")
    city_ward = entry.get("address2", "")

    city = _match_city(db, prefecture, city_ward)

    if city:
        result = {
            "city_id": city.id,
            "prefecture_name": city.prefecture_name,
            "city_name": city.city_name,
            "matched": True,
        }
    else:
        result = {
            "prefecture_name": prefecture,
            "city_name": city_ward,
            "matched": False,
            "error": "not_found",
        }

    _postal_cache[postal_code] = (result, now)
    return PostalCodeResponse(**result)
