"""Tests for PayPay CSV parser and upload endpoint source dispatch.

Covers:
1. Happy-path parse of the sanitized fixture
2. BOM stripping + comma-thousand-separator parsing
3. Missing required column → ValueError
4. Zero-amount rows (both outgoing+incoming = '-') are skipped
5. Endpoint dispatch: ?source=paypay routes to PayPay parser; no-source keeps generic path
"""
import io
import os
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.auth.utils import create_access_token, hash_password
from app.database import get_db
from app.main import app
from app.models.transaction import Base
from app.models.user import User
from app.utils.paypay_csv_parser import _parse_amount, parse_paypay_csv

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "paypay_sample.csv"


def _fixture_bytes() -> bytes:
    return FIXTURE_PATH.read_bytes()


def _make_csv_bytes(rows: list[str], bom: bool = True) -> bytes:
    """Build a minimal PayPay CSV from a header + given data rows."""
    header = (
        "Date & Time,Amount Outgoing (Yen),Amount Incoming (Yen),"
        "Amount Outgoing Overseas,Currency,Exchange Rate (Yen),Country Paid In,"
        "Transaction Type,Business Name,Method,Payment Option,User,Transaction ID"
    )
    content = "\n".join([header] + rows) + "\n"
    raw = content.encode("utf-8")
    return (b"\xef\xbb\xbf" + raw) if bom else raw


# ---------------------------------------------------------------------------
# Test 1: Happy-path — load fixture, check row count + amounts + hashes
# ---------------------------------------------------------------------------

def test_parse_paypay_csv_happy():
    """Fixture has 5 data rows; row 5 has amount=0 so only 4 rows returned.

    Expected rows from fixture:
      TEST_PAYPAY_001  outgoing=1732 → amount=-1732 (expense, abs=1732)
      TEST_PAYPAY_002  incoming=1    → amount=1     (income)
      TEST_PAYPAY_003  incoming=2556 → amount=2556  (income)
      TEST_PAYPAY_004  outgoing=3000 → amount=-3000 (expense, abs=3000)
      TEST_PAYPAY_005  both='-'      → amount=0     → skipped
    """
    import hashlib

    user_id = 42
    result = parse_paypay_csv(_fixture_bytes(), user_id)

    assert len(result) == 4, f"Expected 4 rows (zero-amount row skipped), got {len(result)}"

    # Verify expense row (TEST_PAYPAY_001): amount=1732, is_income=False
    tx1 = next(r for r in result if "Test Merchant 1" in r["description"])
    assert tx1["amount"] == 1732
    assert tx1["is_income"] is False
    assert tx1["source"] == "PayPay"
    assert tx1["category"] == "Other"

    # Verify income row (TEST_PAYPAY_002): amount=1, is_income=True
    tx2 = next(r for r in result if "Test Merchant 2" in r["description"])
    assert tx2["amount"] == 1
    assert tx2["is_income"] is True
    assert tx2["category"] == "Cashback"

    # Verify dedup hash for TEST_PAYPAY_001
    expected_hash = hashlib.sha256(f"{user_id}|PAYPAY:TEST_PAYPAY_001".encode()).hexdigest()
    assert tx1["tx_hash"] == expected_hash

    # All rows must have required keys
    required_keys = {
        "date", "description", "amount", "category", "source",
        "is_income", "is_transfer", "month_key", "tx_hash", "user_id",
    }
    for row in result:
        assert required_keys.issubset(row.keys()), f"Missing keys in row: {row}"
        assert row["user_id"] == user_id
        assert row["is_transfer"] is False


# ---------------------------------------------------------------------------
# Test 2: BOM stripping + comma-thousand-separator
# ---------------------------------------------------------------------------

def test_parse_paypay_csv_handles_bom_and_commas():
    """UTF-8 BOM does not break header detection; '1,732' parses to 1732."""
    rows = [
        '2026/01/15 10:00:00,"1,732",-,-,-,-,-,Payment,Shop A,PayPay,,BOM_TEST_001',
        '2026/01/16 11:00:00,-,"10,000",-,-,-,-,"Points, Balance Earned",Shop B,PayPay,,BOM_TEST_002',
    ]
    csv_bytes = _make_csv_bytes(rows, bom=True)

    result = parse_paypay_csv(csv_bytes, user_id=1)

    assert len(result) == 2

    expense = next(r for r in result if r["description"] == "Shop A")
    assert expense["amount"] == 1732
    assert expense["is_income"] is False

    income = next(r for r in result if r["description"] == "Shop B")
    assert income["amount"] == 10000
    assert income["is_income"] is True
    assert income["category"] == "Cashback"

    # Also verify _parse_amount helper directly
    assert _parse_amount("1,732") == 1732
    assert _parse_amount("-") == 0
    assert _parse_amount("") == 0
    assert _parse_amount("100") == 100


# ---------------------------------------------------------------------------
# Test 3: Missing required column → ValueError with column name
# ---------------------------------------------------------------------------

def test_parse_paypay_csv_missing_columns_raises():
    """Dropping 'Transaction ID' column must raise ValueError mentioning that column."""
    rows = [
        "2026/01/15 10:00:00,500,-,-,-,-,-,Payment,Shop A,PayPay,,",
    ]
    # Build CSV without 'Transaction ID' column by overriding the header
    header_no_tx_id = (
        "Date & Time,Amount Outgoing (Yen),Amount Incoming (Yen),"
        "Amount Outgoing Overseas,Currency,Exchange Rate (Yen),Country Paid In,"
        "Transaction Type,Business Name,Method,Payment Option,User"
    )
    content = header_no_tx_id + "\n" + rows[0] + "\n"
    csv_bytes = b"\xef\xbb\xbf" + content.encode("utf-8")

    with pytest.raises(ValueError) as exc_info:
        parse_paypay_csv(csv_bytes, user_id=1)

    error_msg = str(exc_info.value)
    assert "Transaction ID" in error_msg, f"Expected column name in error: {error_msg}"
    assert "missing" in error_msg.lower()


# ---------------------------------------------------------------------------
# Test 4: Zero-amount rows are skipped
# ---------------------------------------------------------------------------

def test_parse_paypay_csv_skips_zero_amount_rows():
    """Rows where both outgoing and incoming are '-' produce amount=0 → skipped."""
    rows = [
        # Normal expense row — should be included
        '2026/01/15 10:00:00,500,-,-,-,-,-,Payment,Shop A,PayPay,,ZERO_TEST_001',
        # Zero-amount row (both '-') — should be skipped
        '2026/01/16 10:00:00,-,-,-,-,-,-,Payment,Shop B,PayPay,,ZERO_TEST_002',
        # Normal income row — should be included
        '2026/01/17 10:00:00,-,200,-,-,-,-,"Points, Balance Earned",Shop C,PayPay,,ZERO_TEST_003',
    ]
    csv_bytes = _make_csv_bytes(rows, bom=True)

    result = parse_paypay_csv(csv_bytes, user_id=1)

    assert len(result) == 2, f"Expected 2 rows (zero-amount skipped), got {len(result)}"
    descriptions = {r["description"] for r in result}
    assert "Shop A" in descriptions
    assert "Shop C" in descriptions
    assert "Shop B" not in descriptions, "Zero-amount row should have been skipped"


# ---------------------------------------------------------------------------
# Test 5: Upload endpoint dispatches ?source=paypay; generic path unaffected
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def upload_client_and_token():
    """TestClient + access token for upload endpoint tests."""
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)
    try:
        engine = create_engine(f"sqlite:///{db_path}")
        Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        Base.metadata.create_all(bind=engine)

        db = Session()
        user = User(
            email="paypay_test@example.com",
            hashed_password=hash_password("x"),
            is_active=True,
        )
        db.add(user)
        db.commit()
        access_token = create_access_token(data={"sub": user.id})
        db.close()

        def override():
            s = Session()
            try:
                yield s
            finally:
                s.close()

        app.dependency_overrides[get_db] = override
        yield TestClient(app), access_token
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_upload_endpoint_dispatches_paypay_source(upload_client_and_token):
    """POST /api/upload/csv?source=paypay routes to PayPay parser.

    Also verifies:
    - Re-upload of same file → 100% skipped (tx_hash dedup works)
    - POST without source uses generic path (no regression)
    - Unknown source value returns 400
    """
    client, token = upload_client_and_token
    fixture_bytes = _fixture_bytes()

    # --- PayPay source dispatch ---
    resp = client.post(
        "/api/upload/csv?source=paypay",
        headers=_auth(token),
        files={"file": ("paypay_sample.csv", io.BytesIO(fixture_bytes), "text/csv")},
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    body = resp.json()
    # Fixture has 5 rows; 1 zero-amount row is skipped → 4 transactions
    assert body["total_rows"] == 4
    assert body["created"] == 4
    assert body["skipped"] == 0
    assert body["filename"] == "paypay_sample.csv"

    # --- Re-upload same file → all skipped (dedup via tx_hash) ---
    resp2 = client.post(
        "/api/upload/csv?source=paypay",
        headers=_auth(token),
        files={"file": ("paypay_sample.csv", io.BytesIO(fixture_bytes), "text/csv")},
    )
    assert resp2.status_code == 200
    body2 = resp2.json()
    assert body2["skipped"] == 4
    assert body2["created"] == 0

    # --- Unknown source → 400 ---
    resp3 = client.post(
        "/api/upload/csv?source=unknown_bank",
        headers=_auth(token),
        files={"file": ("test.csv", io.BytesIO(b"col\nval"), "text/csv")},
    )
    assert resp3.status_code == 400
    assert "unknown_bank" in resp3.json()["detail"].lower()

    # --- Generic path (no source) still works ---
    generic_csv = (
        "日付,内容,金額（円）,大項目,中項目,保有金融機関,振替,メモ\n"
        "2024/01/15,スーパー,-3000,食費,食料品,楽天カード,0,買い物\n"
    ).encode("utf-8")
    resp4 = client.post(
        "/api/upload/csv",
        headers=_auth(token),
        files={"file": ("generic.csv", io.BytesIO(generic_csv), "text/csv")},
    )
    # Generic path must NOT return 401/403/500 — parser may succeed or return 400 for format
    assert resp4.status_code not in (401, 403, 500), (
        f"Generic path broken: {resp4.status_code}: {resp4.text}"
    )
