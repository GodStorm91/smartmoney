import os
import tempfile
from datetime import datetime
from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.auth.utils import hash_password
from app.models.crypto_wallet import DefiPositionSnapshot, PositionCostBasis
from app.models.transaction import Base
from app.models.user import User
from app.services.position_cost_basis_service import PositionCostBasisService

WALLET = "0x1111111111111111111111111111111111111111"


@pytest.fixture
def session():
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)
    try:
        engine = create_engine(f"sqlite:///{db_path}")
        Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        Base.metadata.create_all(bind=engine)
        db = Session()
        try:
            yield db
        finally:
            db.close()
            Base.metadata.drop_all(bind=engine)
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def _user(db) -> User:
    user = User(
        email="basis-service@example.com",
        hashed_password=hash_password("x"),
        is_active=True,
    )
    db.add(user)
    db.commit()
    return user


def _snapshot(db, user_id: int, position_id: str, value: str, day: int):
    db.add(
        DefiPositionSnapshot(
            user_id=user_id,
            wallet_address=WALLET,
            position_id=position_id,
            protocol="Algebra",
            chain_id="base",
            position_type="liquidity",
            symbol="WETH/AAVE",
            balance=Decimal("1"),
            balance_usd=Decimal(value),
            snapshot_date=datetime(2026, 6, day, 9, 0, 0),
        )
    )


def _basis_row(db, user_id: int, position_id: str, total: str):
    row = PositionCostBasis(
        user_id=user_id,
        position_id=position_id,
        wallet_address=WALLET,
        chain_id="base",
        vault_address="0x9999999999999999999999999999999999999999",
        total_usd=Decimal(total),
        deposited_at=datetime(2026, 5, 25, 9, 0, 0),
        tx_hash="0x" + position_id[-64:].rjust(64, "0"),
    )
    db.add(row)
    return row


def test_backfill_derived_basis_uses_oldest_snapshot(session):
    user = _user(session)
    _snapshot(session, user.id, "lp-1", "100.00", 1)
    _snapshot(session, user.id, "lp-1", "300.00", 2)
    session.commit()

    stats = PositionCostBasisService.backfill_derived_basis(session, user.id)

    assert stats == {"positions_updated": 1, "positions_skipped": 0, "errors": 0}
    row = session.query(PositionCostBasis).one()
    assert row.derived_basis_usd == Decimal("100.00")
    assert row.manual_basis_usd is None
    basis = PositionCostBasisService.get_effective_basis_map(session, user.id, "base")
    assert basis[("lp-1", WALLET, "base")].amount == Decimal("100.00")
    assert basis[("lp-1", WALLET, "base")].source == "derived"


def test_manual_basis_wins_over_backfill(session):
    user = _user(session)
    _snapshot(session, user.id, "lp-manual", "100.00", 1)
    row = _basis_row(session, user.id, "lp-manual", "250.00")
    row.manual_basis_usd = Decimal("250.00")
    session.commit()

    stats = PositionCostBasisService.backfill_derived_basis(session, user.id)

    assert stats == {"positions_updated": 0, "positions_skipped": 1, "errors": 0}
    basis = PositionCostBasisService.get_effective_basis_map(session, user.id, "base")
    assert basis[("lp-manual", WALLET, "base")].amount == Decimal("250.00")
    assert basis[("lp-manual", WALLET, "base")].source == "manual"


def test_legacy_total_usd_rows_are_treated_as_derived_basis(session):
    """Legacy total_usd (from on-chain reconstruction) attributes to DERIVED,
    not manual. Calling unattributed numbers "user-asserted manual entry" would
    violate the caveat doctrine — the LLM would tell the user they confirmed
    a basis they never set."""
    user = _user(session)
    _snapshot(session, user.id, "lp-legacy", "100.00", 1)
    _basis_row(session, user.id, "lp-legacy", "70.00")
    _basis_row(session, user.id, "lp-legacy", "30.00")
    session.commit()

    stats = PositionCostBasisService.backfill_derived_basis(session, user.id)

    assert stats == {"positions_updated": 1, "positions_skipped": 0, "errors": 0}
    basis = PositionCostBasisService.get_effective_basis_map(session, user.id, "base")
    assert basis[("lp-legacy", WALLET, "base")].amount == Decimal("100.00")
    assert basis[("lp-legacy", WALLET, "base")].source == "derived"
