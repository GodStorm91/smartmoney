# SmartMoney Codebase Summary
**Generated:** 2025-11-17
**Version:** v0.1.0 (MVP Complete)
**Total Files:** 102
**Total Tokens:** 57,579
**Test Status:** 89/89 passing
**Code Quality:** 92/100

---

## Project Overview

SmartMoney is personal finance webapp for tracking cashflow, expenses, and multi-horizon financial goals (1/3/5/10 years). Self-hosted, single-user, Japanese market focused with CSV import from MoneyForward/Zaim.

**Current Status:** MVP Complete, All Tests Passing, Ready for Deployment

**Tech Stack:**
- Backend: Python 3.11+ / FastAPI / SQLAlchemy / SQLite
- Frontend: React 18 / TypeScript / Vite / TanStack Router / Recharts
- Testing: pytest (89 tests passing)
- Code Quality: 92/100

---

## Repository Structure

```
smartmoney/
├── backend/               # FastAPI backend (Python)
│   ├── app/
│   │   ├── models/        # SQLAlchemy models (3 files)
│   │   ├── routes/        # API endpoints (4 files)
│   │   ├── schemas/       # Pydantic validation (3 files)
│   │   ├── services/      # Business logic (3 files)
│   │   ├── utils/         # CSV parsing, hashing (6 files)
│   │   ├── config.py      # Settings from env
│   │   ├── database.py    # DB session management
│   │   └── main.py        # FastAPI app init
│   ├── alembic/           # Database migrations
│   ├── tests/             # pytest tests (6 files, 89 tests)
│   └── pyproject.toml     # Python dependencies
├── frontend/              # React frontend (TypeScript)
│   └── src/
│       ├── components/    # UI components (24 files)
│       │   ├── charts/    # Recharts visualizations
│       │   ├── dashboard/ # Dashboard widgets
│       │   ├── financial/ # KPIs, goals, categories
│       │   ├── layout/    # Header, footer, layout
│       │   ├── ui/        # Base UI components
│       │   └── upload/    # CSV upload components
│       ├── pages/         # Page components (6 files)
│       ├── routes/        # TanStack Router (7 files)
│       ├── services/      # API clients (6 files)
│       ├── types/         # TypeScript types
│       ├── utils/         # Formatting, calculations
│       └── main.tsx       # React app entry
├── docs/                  # Documentation (15+ files)
├── specs/                 # Requirements spec
└── plans/                 # Design plans, research reports
```

---

## Backend Architecture

### Models (`backend/app/models/`)

**1. Transaction** (`transaction.py`)
- Core financial transaction model
- Fields: date, description, amount (BIGINT), category, subcategory, source, payment_method, notes
- Flags: is_income, is_transfer
- month_key (YYYY-MM format for grouping)
- tx_hash (SHA-256 for duplicate detection, unique constraint)
- Indexes: date, category, month_key, duplicate_check composite, month_category composite
- Constraint: amount != 0

**2. Goal** (`goal.py`)
- Financial goal tracking (1/3/5/10 year horizons)
- Fields: years (1,3,5,10), target_amount (BIGINT), start_date
- Constraints: years IN (1,3,5,10), target_amount > 0
- Unique index on years

**3. AppSettings** (`settings.py`)
- Singleton settings model
- Fields: currency (default JPY), starting_net_worth, base_date
- Singleton constraint: id = 1

### Routes (`backend/app/routes/`)

**1. Transactions** (`transactions.py`)
- `POST /api/transactions` - Create transaction
- `GET /api/transactions` - List with filters (date, category, source, is_income, skip/limit)
- `GET /api/transactions/{id}` - Get by ID
- `GET /api/transactions/summary/total` - Summary (income, expenses, net)

**2. Analytics** (`analytics.py`)
- `GET /api/analytics/monthly` - Monthly cashflow aggregation
- `GET /api/analytics/categories` - Category breakdown (expenses only)
- `GET /api/analytics/trend` - Last N months trend (default 12)
- `GET /api/analytics/sources` - Source breakdown (income/expenses by source)

**3. Goals** (`goals.py`)
- `POST /api/goals` - Create goal
- `GET /api/goals` - List all goals
- `GET /api/goals/{id}` - Get by ID
- `PUT /api/goals/{id}` - Update goal
- `DELETE /api/goals/{id}` - Delete goal
- `GET /api/goals/{id}/progress` - Calculate progress with projections

**4. Upload** (`upload.py`)
- `POST /api/upload/csv` - Upload CSV file (multipart/form-data)
- Encoding detection (Shift-JIS, UTF-8, UTF-8-BOM)
- Column mapping (Japanese → English)
- Category mapping
- Duplicate detection via tx_hash
- Returns: total_rows, imported_count, duplicate_count, errors

### Services (`backend/app/services/`)

**1. TransactionService** (`transaction_service.py`)
- `create_transaction(db, tx_data)` - Create with validation
- `get_transaction(db, tx_id)` - Fetch by ID
- `get_transactions(db, filters)` - List with filters, pagination
- `get_total_summary(db, filters)` - Aggregate income/expenses/net

**2. AnalyticsService** (`analytics_service.py`)
- `get_monthly_cashflow(db, start_date, end_date)` - Monthly aggregates
- `get_category_breakdown(db, start_date, end_date)` - Category totals (expenses)
- `get_monthly_trend(db, months)` - Last N months trend
- `get_sources_breakdown(db, start_date, end_date)` - Source totals

**3. GoalService** (`goal_service.py`)
- `create_goal(db, goal_data)` - Create goal
- `get_goal(db, goal_id)` - Fetch by ID
- `get_all_goals(db)` - List all
- `update_goal(db, goal_id, updates)` - Update goal
- `delete_goal(db, goal_id)` - Delete goal
- `calculate_progress(db, goal_id)` - Complex progress calculation with projections

**Progress Calculation Algorithm:**
1. Determine start_date (goal.start_date or earliest transaction date)
2. Calculate target_date (start_date + years)
3. Compute total_saved (sum income - sum expenses, exclude transfers)
4. Compute months_elapsed, months_remaining
5. Compute needed_per_month: (target - saved) / months_remaining
6. Project status: ahead (>5% over), on_track (±5%), behind (<5% under)

### Utils (`backend/app/utils/`)

**1. csv_parser.py** - Main CSV parser orchestrator
- `parse_csv(file_content, filename)` - Entry point
- Detects encoding, maps columns, parses rows, validates data

**2. encoding_detector.py** - Encoding detection
- `detect_encoding(content)` - Auto-detect Shift-JIS, UTF-8, UTF-8-BOM using chardet

**3. csv_column_mapper.py** - Column mapping
- Maps Japanese column names (日付, 金額（円）, 大項目, etc.) to English fields
- Handles variations (e.g., "金額" vs "金額（円）")

**4. csv_row_parser.py** - Row parsing
- `parse_row(row, column_map)` - Convert CSV row to transaction dict
- Date parsing (YYYY/MM/DD, YYYY-MM-DD)
- Amount normalization (remove commas, convert to int)
- month_key generation (YYYY-MM)

**5. category_mapper.py** - Category mapping
- Japanese → English category mapping
- 食費 → Food, 住宅 → Housing, 交通 → Transportation, etc.
- Handles subcategories

**6. transaction_hasher.py** - Duplicate detection
- `generate_tx_hash(date, amount, description, source)` - SHA-256 hash
- Format: "date|amount|description|source"

---

## Frontend Architecture

### Component Organization

**1. Charts** (`src/components/charts/`)
- `CategoryPieChart.tsx` - Recharts pie chart for category breakdown
- `IncomeExpenseBarChart.tsx` - Recharts bar chart for income vs expenses
- `TrendLineChart.tsx` - Recharts line chart for monthly trends

**2. Dashboard** (`src/components/dashboard/`)
- `DashboardKPIs.tsx` - 3 KPI cards (income, expenses, net)
- `QuickActionsCard.tsx` - Quick action buttons (upload, add transaction)
- `TrendChartCard.tsx` - 12-month trend chart card

**3. Financial** (`src/components/financial/`)
- `CategoryBreakdownList.tsx` - List of categories with amounts
- `GoalProgressCard.tsx` - Goal progress card with status badge
- `KPICard.tsx` - Reusable KPI card component

**4. Layout** (`src/components/layout/`)
- `Header.tsx` - Top navigation with logo, links
- `Footer.tsx` - Footer with copyright
- `Layout.tsx` - Main layout wrapper with header/footer

**5. UI** (`src/components/ui/`)
- `Badge.tsx` - Status badges (ahead, on_track, behind, income, expense)
- `Button.tsx` - Button variants (primary, secondary, ghost)
- `Card.tsx` - Card container
- `EmptyState.tsx` - Empty state component
- `Input.tsx` - Form input
- `LoadingSpinner.tsx` - Loading spinner
- `Select.tsx` - Select dropdown

**6. Upload** (`src/components/upload/`)
- `UploadDropZone.tsx` - Drag-and-drop file upload
- `UploadFAQ.tsx` - CSV format FAQ
- `UploadHistoryList.tsx` - Upload history list (future)

### Pages (`src/pages/`)

**1. Dashboard.tsx** - Home page
- KPIs, 12-month trend, goal widgets, quick actions

**2. Upload.tsx** - CSV upload page
- Drag-drop zone, file selection, upload progress, results

**3. Transactions.tsx** - Transaction list page
- Filters (date, category, source, income/expense), pagination, table

**4. Analytics.tsx** - Analytics page
- Monthly cashflow chart, category pie chart, source breakdown

**5. Goals.tsx** - Goals page
- Goal cards (1/3/5/10 years), progress bars, status badges, CRUD

**6. Settings.tsx** - Settings page
- Currency, base date, starting net worth (future)

### Services (`src/services/`)

**1. api-client.ts** - Axios client with base URL
- `apiClient` instance configured for http://localhost:8000

**2. transaction-service.ts**
- `getTransactions(filters)`, `createTransaction(data)`, `getTotalSummary(filters)`

**3. analytics-service.ts**
- `getMonthlyCashflow(filters)`, `getCategoryBreakdown(filters)`, `getMonthlyTrend(months)`, `getSourcesBreakdown(filters)`

**4. goal-service.ts**
- `getGoals()`, `getGoal(id)`, `createGoal(data)`, `updateGoal(id, data)`, `deleteGoal(id)`, `getGoalProgress(id)`

**5. upload-service.ts**
- `uploadCSV(file)` - Multipart upload

**6. settings-service.ts**
- `getSettings()`, `updateSettings(data)` (future)

### Types (`src/types/index.ts`)

Central TypeScript types:
- `Transaction`, `TransactionFilters`, `TransactionSummary`
- `MonthlyCashflow`, `CategoryBreakdown`, `SourceBreakdown`
- `Goal`, `GoalProgress`
- `UploadResult`

### Utils (`src/utils/`)

**1. formatCurrency.ts**
- `formatCurrency(amount)` - Format JPY with `Intl.NumberFormat('ja-JP')`

**2. formatDate.ts**
- `formatDate(date, format)` - Format dates with date-fns

**3. calculations.ts**
- `calculateNetCashflow(income, expenses)`
- `calculatePercentage(part, total)`

**4. cn.ts**
- `cn(...classes)` - Merge Tailwind classes with clsx + tailwind-merge

---

## Data Flow

### CSV Upload Flow

```
User uploads CSV
  ↓
UploadDropZone.tsx (frontend)
  ↓
uploadCSV(file) → POST /api/upload/csv
  ↓
upload.py route
  ↓
csv_parser.parse_csv(content, filename)
  ├─ encoding_detector.detect_encoding()
  ├─ csv_column_mapper.map_columns()
  ├─ csv_row_parser.parse_row()
  ├─ category_mapper.map_category()
  └─ transaction_hasher.generate_tx_hash()
  ↓
TransactionService.create_transaction()
  ↓
Database (SQLite) - transactions table
  ↓
Return UploadResult (total_rows, imported_count, duplicate_count, errors)
```

### Dashboard Data Flow

```
Dashboard.tsx loads
  ↓
Parallel requests:
  ├─ getTotalSummary() → GET /api/transactions/summary/total
  ├─ getMonthlyTrend(12) → GET /api/analytics/trend?months=12
  ├─ getCategoryBreakdown() → GET /api/analytics/categories
  └─ getGoals() → GET /api/goals
  ↓
Services fetch from routes
  ↓
Services call SQLAlchemy queries
  ↓
Return aggregated data
  ↓
Components render charts (Recharts)
```

### Goal Progress Flow

```
Goals.tsx fetches goals
  ↓
For each goal: getGoalProgress(id)
  ↓
GET /api/goals/{id}/progress
  ↓
GoalService.calculate_progress()
  ├─ Determine start_date (goal.start_date or earliest transaction)
  ├─ Calculate target_date (start_date + years)
  ├─ Query transactions (exclude transfers)
  ├─ Sum income, sum expenses
  ├─ Compute total_saved = income - expenses
  ├─ Compute months_elapsed, months_remaining
  ├─ Compute needed_per_month
  ├─ Project final total (linear projection)
  └─ Determine status (ahead/on_track/behind)
  ↓
Return GoalProgress
  ↓
GoalProgressCard.tsx renders progress bar, status badge
```

---

## Key Design Patterns

### Backend Patterns

**1. Service Layer Pattern**
- Routes delegate to services for business logic
- Services contain no HTTP/request logic
- Services return domain objects, not responses

**2. Repository Pattern (implicit via SQLAlchemy)**
- Models define schema
- Services query via ORM
- No raw SQL except complex aggregations

**3. Dependency Injection**
- `get_db()` yields DB session per request
- Injected via `Depends(get_db)`

**4. Schema Validation**
- Pydantic schemas for request/response validation
- Separate schemas from models

**5. Hash-Based Duplicate Detection**
- tx_hash = SHA-256(date|amount|description|source)
- Unique constraint prevents duplicates at DB level
- Skips duplicates silently during bulk import

### Frontend Patterns

**1. File-Based Routing** (TanStack Router)
- `src/routes/*.tsx` define routes
- `routeTree.ts` auto-generated

**2. Service Layer**
- API calls isolated in `src/services/*`
- Pages/components consume services, not raw axios

**3. Component Composition**
- Small, focused components
- Composition over inheritance
- Props for customization

**4. Centralized Types**
- `src/types/index.ts` defines all types
- Shared between components, services

**5. Utility Functions**
- Formatting isolated in `src/utils/*`
- Calculations separated from UI

---

## Database Schema

### transactions
```sql
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY,
  date DATE NOT NULL,
  description VARCHAR(500) NOT NULL,
  amount BIGINT NOT NULL,  -- JPY as integer
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  source VARCHAR(100) NOT NULL,
  payment_method VARCHAR(100),
  notes VARCHAR(1000),
  is_income BOOLEAN NOT NULL DEFAULT 0,
  is_transfer BOOLEAN NOT NULL DEFAULT 0,
  month_key VARCHAR(7) NOT NULL,  -- YYYY-MM
  tx_hash VARCHAR(64) UNIQUE NOT NULL,  -- SHA-256
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ix_transactions_date ON transactions(date);
CREATE INDEX ix_transactions_category ON transactions(category);
CREATE INDEX ix_transactions_month_key ON transactions(month_key);
CREATE INDEX ix_duplicate_check ON transactions(date, amount, description, source);
CREATE INDEX ix_month_category ON transactions(month_key, category);
```

### goals
```sql
CREATE TABLE goals (
  id INTEGER PRIMARY KEY,
  years INTEGER NOT NULL CHECK(years IN (1,3,5,10)),
  target_amount BIGINT NOT NULL CHECK(target_amount > 0),
  start_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(years)
);
```

### app_settings
```sql
CREATE TABLE app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK(id = 1),  -- Singleton
  currency VARCHAR(3) NOT NULL DEFAULT 'JPY',
  starting_net_worth BIGINT NOT NULL DEFAULT 0,
  base_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Endpoints Summary

### Transactions
- `POST /api/transactions` - Create
- `GET /api/transactions` - List (filters: date, category, source, is_income, skip, limit)
- `GET /api/transactions/{id}` - Get by ID
- `GET /api/transactions/summary/total` - Summary (income, expenses, net)

### Analytics
- `GET /api/analytics/monthly` - Monthly cashflow (filters: start_date, end_date)
- `GET /api/analytics/categories` - Category breakdown (filters: start_date, end_date)
- `GET /api/analytics/trend` - Trend (params: months=12)
- `GET /api/analytics/sources` - Source breakdown (filters: start_date, end_date)

### Goals
- `POST /api/goals` - Create
- `GET /api/goals` - List all
- `GET /api/goals/{id}` - Get by ID
- `PUT /api/goals/{id}` - Update
- `DELETE /api/goals/{id}` - Delete
- `GET /api/goals/{id}/progress` - Progress calculation

### Upload
- `POST /api/upload/csv` - CSV upload (multipart/form-data)

---

## Testing

**Test Suite:** pytest
**Total Tests:** 89
**Status:** All passing

**Test Files:**
1. `test_models.py` - Model constraints, relationships
2. `test_transaction_service.py` - Transaction CRUD, filtering, summary
3. `test_analytics_service.py` - Monthly cashflow, categories, trends, sources
4. `test_goal_service.py` - Goal CRUD, progress calculations
5. `test_csv_parser.py` - CSV parsing, encoding detection, column mapping, duplicate detection
6. `test_api_routes.py` - API endpoint integration tests

**Test Coverage:**
- Models: 100%
- Services: 95%+
- Routes: 90%+
- Utils: 100%

---

## Configuration

### Backend Environment Variables
```env
DATABASE_URL=sqlite:///./smartmoney.db
DEBUG=True
```

### Frontend Build Configuration
- Vite dev server: http://localhost:5173
- API proxy: http://localhost:8000
- Tailwind CSS with design system
- PostCSS for autoprefixing

---

## Key Implementation Details

### Currency Handling
- **Storage:** BIGINT (¥1,234,567 = 1234567)
- **NO decimals, NO floats** (avoid precision issues)
- **Display:** `Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' })`

### Japanese Text Support
- **Encoding:** Auto-detect Shift-JIS, UTF-8, UTF-8-BOM via chardet
- **Column mapping:** 日付 → date, 金額（円） → amount, 大項目 → category, etc.
- **Category mapping:** 食費 → Food, 住宅 → Housing, 交通 → Transportation

### Duplicate Detection
- **Method:** SHA-256 hash of `date|amount|description|source`
- **Storage:** tx_hash column with unique constraint
- **Behavior:** Silently skip duplicates during bulk import

### Month Key
- **Format:** YYYY-MM (e.g., "2025-11")
- **Purpose:** Efficient monthly grouping
- **Index:** month_key indexed for fast queries

### Goal Progress Algorithm
1. Start date = goal.start_date OR earliest transaction date
2. Target date = start_date + years
3. Total saved = Σ(income) - Σ(expenses) [exclude transfers]
4. Months elapsed = months from start_date to now
5. Months remaining = (years × 12) - months_elapsed
6. Needed per month = (target - saved) / months_remaining
7. Projected total = saved + (months_remaining × avg_monthly_net)
8. Status:
   - ahead: projected > target × 1.05
   - on_track: target × 0.95 ≤ projected ≤ target × 1.05
   - behind: projected < target × 0.95

---

## Performance Considerations

### Database Indexes
- `date` - Fast date range queries
- `category` - Fast category filtering
- `month_key` - Fast monthly grouping
- `(date, amount, description, source)` - Fast duplicate checks
- `(month_key, category)` - Fast monthly category queries

### Frontend Optimization
- Recharts for performant visualizations
- React.memo for chart components
- Pagination for transaction lists (skip/limit)
- Date range filters to limit data fetching

### Query Optimization
- Use month_key for monthly aggregations (faster than date grouping)
- Exclude transfers in analytics (is_transfer=false filter)
- Composite indexes for common filter combinations

---

## Unresolved Questions

1. **CSV Format Detection:** Auto-detect Zaim vs MoneyForward or require user selection?
2. **Category Recategorization:** Bulk update historical transactions when mappings change?
3. **Transfer Inference:** Detect transfers from keywords if 振替 flag missing?
4. **Multi-Currency:** Should schema support future expansion beyond JPY?
5. **Audit Trail:** Store original CSV files or normalized data only?
6. **Goal Start Date:** Auto-detect from first transaction vs user-defined?

---

## Next Steps (Post-MVP)

1. **Frontend Polish:**
   - Add loading states for all async operations
   - Improve error handling with user-friendly messages
   - Add transaction editing/deletion UI

2. **Analytics Enhancements:**
   - Year-over-year comparisons
   - Budget vs actual tracking
   - Spending velocity trends

3. **Goal Features:**
   - Goal milestones (25%, 50%, 75%)
   - Goal visualization (line chart of progress over time)
   - Multiple goals per horizon

4. **Settings:**
   - Custom category management UI
   - CSV format templates
   - Export data (CSV, JSON)

5. **Deployment:**
   - Docker Compose setup
   - VPS deployment guide
   - PostgreSQL migration
   - Backup automation

---

**END OF CODEBASE SUMMARY**
