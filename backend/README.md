# SmartMoney Backend

FastAPI backend for SmartMoney Cashflow Tracker.

## Features

- **Transaction Management**: CRUD operations, filtering, pagination
- **CSV Import**: Parse Japanese finance app exports (Zaim, MoneyForward)
- **Analytics**: Monthly cashflow, category breakdown, trends
- **Goal Tracking**: Multi-horizon goals (1, 3, 5, 10 years) with progress calculations
- **Database**: SQLAlchemy ORM with SQLite (MVP) / PostgreSQL (production)

## Project Structure

```
backend/
├── app/
│   ├── models/              # SQLAlchemy models
│   │   ├── transaction.py   # Transaction model with tx_hash for duplicates
│   │   ├── goal.py          # Financial goal model
│   │   └── settings.py      # App settings model
│   ├── schemas/             # Pydantic schemas for validation
│   │   ├── transaction.py
│   │   ├── analytics.py
│   │   └── goal.py
│   ├── routes/              # API endpoints
│   │   ├── transactions.py  # GET, POST, summary
│   │   ├── analytics.py     # Monthly, categories, trends, sources
│   │   ├── goals.py         # CRUD, progress calculation
│   │   └── upload.py        # CSV file upload
│   ├── services/            # Business logic
│   │   ├── transaction_service.py
│   │   ├── analytics_service.py
│   │   └── goal_service.py
│   ├── utils/               # Utilities
│   │   ├── csv_parser.py    # Main CSV parser
│   │   ├── encoding_detector.py
│   │   ├── category_mapper.py
│   │   ├── csv_column_mapper.py
│   │   ├── csv_row_parser.py
│   │   └── transaction_hasher.py
│   ├── database.py          # Database session management
│   ├── config.py            # Settings from environment
│   └── main.py              # FastAPI app initialization
├── alembic/                 # Database migrations
│   ├── versions/
│   └── env.py
├── alembic.ini
├── pyproject.toml
└── README.md
```

## API Endpoints

### Transactions
- `POST /api/transactions` - Create transaction
- `GET /api/transactions` - List with filters (date, category, source, etc.)
- `GET /api/transactions/{id}` - Get by ID
- `GET /api/transactions/summary/total` - Get summary (income, expenses, net)

### Analytics
- `GET /api/analytics/monthly` - Monthly cashflow
- `GET /api/analytics/categories` - Category breakdown
- `GET /api/analytics/trend` - Last N months trend
- `GET /api/analytics/sources` - Source breakdown

### Goals
- `POST /api/goals` - Create goal
- `GET /api/goals` - List all goals
- `GET /api/goals/{id}` - Get by ID
- `PUT /api/goals/{id}` - Update goal
- `DELETE /api/goals/{id}` - Delete goal
- `GET /api/goals/{id}/progress` - Calculate progress

### Upload
- `POST /api/upload/csv` - Upload CSV file

## Installation

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -e ".[dev]"
```

## Database Setup

```bash
# Initialize database (creates tables)
# Done automatically on app startup

# Create migration (after model changes)
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

## Running

```bash
# Development mode (auto-reload)
fastapi dev app/main.py

# Production mode
fastapi run app/main.py
```

API documentation:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## CSV Format

Expected columns (Japanese or English):

**Japanese:**
- 日付 (date)
- 内容/詳細 (description)
- 金額（円）/金額 (amount)
- 大項目 (category)
- 中項目 (subcategory) - optional
- 保有金融機関/口座 (source)
- 振替 (transfer flag) - optional
- メモ (notes) - optional

**English:**
- date, description, amount, category, subcategory, source, transfer, notes

## Key Implementation Details

### Duplicate Detection
- Uses SHA-256 hash of `date|amount|description|source`
- Stored in `tx_hash` column with unique constraint
- Bulk import skips duplicates automatically

### Category Mapping
- Japanese → English mapping in `utils/category_mapper.py`
- Food (食費, 外食), Housing (住宅), Transportation (交通), etc.

### Encoding Detection
- Auto-detects Shift-JIS, UTF-8, UTF-8-BOM using `chardet`
- Handles Japanese CSV exports from various apps

### Goal Progress Calculation
Formula from specs section 7.3:
- `total_saved = sum(income) - sum(expenses)` (excludes transfers)
- `needed_per_month = (target - saved) / months_remaining`
- `status = ahead | on_track | behind` (based on projected total vs target)

### Database Design
- **JPY as BIGINT**: ¥1,234,567 stored as `1234567` (no decimals)
- **month_key**: YYYY-MM format for efficient grouping
- **Indexes**: date, category, month_key, duplicate_check composite

## Environment Variables

Create `.env` file:

```env
DATABASE_URL=sqlite:///./smartmoney.db
DEBUG=True
```

For PostgreSQL:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/smartmoney
```

## Testing

```bash
# Run tests (when implemented)
pytest

# With coverage
pytest --cov=app tests/
```

## Notes

- All routes use dependency injection for database sessions
- Global exception handlers for SQLAlchemy and general errors
- CORS configured for frontend (localhost:5173, localhost:3000)
- File upload limit: 50MB
- Currency stored as integers (no float precision issues)
