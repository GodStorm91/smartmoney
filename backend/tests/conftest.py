"""Pytest configuration and fixtures for backend tests."""
from datetime import date, timedelta
from io import BytesIO

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.models.transaction import Base


@pytest.fixture(scope="function")
def db_session():
    """Create an in-memory SQLite database for each test."""
    # Create in-memory database
    engine = create_engine("sqlite:///:memory:")

    # Create all tables
    Base.metadata.create_all(bind=engine)

    # Create session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def sample_transaction_data():
    """Sample transaction data for testing."""
    today = date.today()
    return {
        "date": today,
        "description": "Grocery shopping",
        "amount": -5000,
        "category": "Food",
        "subcategory": "Groceries",
        "source": "Rakuten Card",
        "payment_method": "Credit Card",
        "notes": "Weekly shopping",
        "is_income": False,
        "is_transfer": False,
        "month_key": today.strftime("%Y-%m"),
        "tx_hash": "abc123def456",
    }


@pytest.fixture
def sample_goal_data():
    """Sample goal data for testing."""
    return {
        "years": 5,
        "target_amount": 10000000,  # 10M JPY
        "start_date": date(2024, 1, 1),
    }


@pytest.fixture
def sample_csv_japanese():
    """Sample Japanese CSV data."""
    csv_content = """日付,内容,金額（円）,大項目,中項目,保有金融機関,振替,メモ
2024/01/15,スーパー,-3000,食費,食料品,楽天カード,0,週間買い物
2024/01/16,給料,300000,収入,給与,三菱UFJ,0,月給
2024/01/17,家賃,-80000,住宅,家賃,みずほ銀行,0,
2024/01/18,電車代,-1500,交通,電車,PASMO,0,
2024/01/20,振込,50000,その他,,三菱UFJ,1,内部移動"""

    return BytesIO(csv_content.encode("utf-8"))


@pytest.fixture
def sample_csv_shift_jis():
    """Sample Shift-JIS encoded CSV data."""
    csv_content = """日付,内容,金額（円）,大項目,中項目,保有金融機関,振替,メモ
2024/02/01,レストラン,-5000,外食,飲食,楽天カード,0,
2024/02/05,ガソリン,-3500,交通,車,Shell,0,"""

    return BytesIO(csv_content.encode("shift_jis"))


@pytest.fixture
def create_sample_transactions(db_session: Session):
    """Factory fixture to create sample transactions."""
    def _create_transactions(count: int = 10):
        from app.models.transaction import Transaction
        from app.utils.transaction_hasher import generate_tx_hash

        transactions = []
        base_date = date(2024, 1, 1)

        for i in range(count):
            tx_date = base_date + timedelta(days=i * 3)
            is_income = i % 5 == 0
            amount = 200000 if is_income else -5000 - (i * 100)
            category = "Income" if is_income else ["Food", "Housing", "Transportation"][i % 3]

            tx_hash = generate_tx_hash(
                str(tx_date),
                amount,
                f"Transaction {i}",
                "Test Source"
            )

            tx = Transaction(
                date=tx_date,
                description=f"Transaction {i}",
                amount=amount,
                category=category,
                subcategory=None,
                source="Test Source",
                is_income=is_income,
                is_transfer=False,
                month_key=tx_date.strftime("%Y-%m"),
                tx_hash=tx_hash,
            )
            db_session.add(tx)
            transactions.append(tx)

        db_session.commit()
        return transactions

    return _create_transactions
