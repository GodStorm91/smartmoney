"""Backfill snapshot-derived DeFi position cost basis."""
from app.database import SessionLocal
from app.services.position_cost_basis_service import PositionCostBasisService


def main() -> None:
    db = SessionLocal()
    try:
        print(PositionCostBasisService.backfill_derived_basis(db))
    finally:
        db.close()


if __name__ == "__main__":
    main()
