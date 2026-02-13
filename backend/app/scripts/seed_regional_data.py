"""Seed regional data from curated JSON files into the database.

Usage:
    uv run python -m app.scripts.seed_regional_data
"""

import json
import logging
from pathlib import Path

from sqlalchemy.orm import Session

from app.database import SessionLocal, init_db
from app.models.regional_data import (
    PrefectureInsuranceRate,
    RegionalCity,
    RegionalCostIndex,
    RegionalRent,
)

logger = logging.getLogger(__name__)
DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def _load_json(filename: str) -> dict | list:
    with open(DATA_DIR / filename) as f:
        return json.load(f)


def seed_cities(db: Session) -> dict[int, RegionalCity]:
    """Upsert city records. Returns mapping of id -> ORM object."""
    cities_data = _load_json("cities.json")
    city_map: dict[int, RegionalCity] = {}

    for row in cities_data:
        existing = db.query(RegionalCity).filter_by(city_code=row["city_code"]).first()
        if existing:
            for k in ("prefecture_code", "prefecture_name", "city_name",
                       "prefecture_name_en", "city_name_en"):
                setattr(existing, k, row[k])
            existing.id = row["id"]
            city_map[row["id"]] = existing
        else:
            city = RegionalCity(
                id=row["id"],
                prefecture_code=row["prefecture_code"],
                city_code=row["city_code"],
                prefecture_name=row["prefecture_name"],
                city_name=row["city_name"],
                prefecture_name_en=row["prefecture_name_en"],
                city_name_en=row["city_name_en"],
            )
            db.add(city)
            city_map[row["id"]] = city

    db.flush()
    logger.info("Seeded %d cities", len(city_map))
    return city_map


def seed_rents(db: Session) -> None:
    """Upsert rent records from regional_rent.json."""
    data = _load_json("regional_rent.json")
    data_year = data["data_year"]
    count = 0

    for entry in data["rents"]:
        city_id = entry["city_id"]
        for room_type, amount in entry["room_types"].items():
            existing = (
                db.query(RegionalRent)
                .filter_by(city_id=city_id, room_type=room_type)
                .first()
            )
            if existing:
                existing.average_rent = amount
                existing.data_year = data_year
            else:
                db.add(RegionalRent(
                    city_id=city_id,
                    room_type=room_type,
                    average_rent=amount,
                    data_year=data_year,
                ))
            count += 1

    db.flush()
    logger.info("Seeded %d rent records", count)


def seed_cost_indices(db: Session) -> None:
    """Upsert cost-of-living indices from cost_indices.json."""
    data = _load_json("cost_indices.json")
    data_year = data["data_year"]
    count = 0

    for entry in data["indices"]:
        city_id = entry["city_id"]
        for category in ("food", "utilities", "transport"):
            value = entry[category]
            existing = (
                db.query(RegionalCostIndex)
                .filter_by(city_id=city_id, category=category)
                .first()
            )
            if existing:
                existing.index_value = value
                existing.data_year = data_year
            else:
                db.add(RegionalCostIndex(
                    city_id=city_id,
                    category=category,
                    index_value=value,
                    data_year=data_year,
                ))
            count += 1

    db.flush()
    logger.info("Seeded %d cost index records", count)


def seed_insurance_rates(db: Session) -> None:
    """Upsert prefecture insurance rates from insurance_rates.json."""
    data = _load_json("insurance_rates.json")
    data_year = data["data_year"]
    count = 0

    for entry in data["rates"]:
        code = entry["prefecture_code"]
        existing = (
            db.query(PrefectureInsuranceRate)
            .filter_by(prefecture_code=code)
            .first()
        )
        if existing:
            existing.rate = entry["rate"]
            existing.data_year = data_year
        else:
            db.add(PrefectureInsuranceRate(
                prefecture_code=code,
                rate=entry["rate"],
                data_year=data_year,
            ))
        count += 1

    db.flush()
    logger.info("Seeded %d insurance rate records", count)


def seed_all() -> None:
    """Run all seeders inside a single transaction."""
    init_db()
    db = SessionLocal()
    try:
        seed_cities(db)
        seed_rents(db)
        seed_cost_indices(db)
        seed_insurance_rates(db)
        db.commit()
        logger.info("Regional data seeding complete.")
    except Exception:
        db.rollback()
        logger.exception("Seeding failed, rolled back.")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    seed_all()
