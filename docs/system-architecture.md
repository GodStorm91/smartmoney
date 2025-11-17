# SmartMoney System Architecture
**Version:** 1.0
**Last Updated:** 2025-11-17
**Status:** MVP Complete

---

## Architecture Overview

SmartMoney uses a **three-tier monolithic architecture**:

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Tier                        │
│  React 18 + TypeScript + TanStack Router + Recharts    │
│                  (localhost:5173)                       │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP REST API
                     │ (JSON)
┌────────────────────▼────────────────────────────────────┐
│                    Backend Tier                         │
│        FastAPI + SQLAlchemy + Pandas + Python          │
│                  (localhost:8000)                       │
└────────────────────┬────────────────────────────────────┘
                     │ SQLAlchemy ORM
                     │
┌────────────────────▼────────────────────────────────────┐
│                    Data Tier                            │
│         SQLite (MVP) / PostgreSQL (Production)         │
│                  (smartmoney.db)                        │
└─────────────────────────────────────────────────────────┘
```

**Design Rationale:**
- **Monolithic:** Simplicity over microservices (KISS principle)
- **Three-tier:** Clear separation of concerns
- **RESTful API:** Standard, well-understood pattern
- **SQLite → PostgreSQL:** Start simple, scale when needed

---

## Component Architecture

### Frontend Components

```
┌─────────────────────────────────────────────────────────┐
│                         Browser                         │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │            TanStack Router (Routing)            │   │
│  └──────────────────────┬──────────────────────────┘   │
│                         │                               │
│  ┌──────────────────────▼──────────────────────────┐   │
│  │              Pages (6 components)               │   │
│  │  Dashboard | Upload | Transactions | Analytics │   │
│  │          Goals | Settings                       │   │
│  └──────────────────────┬──────────────────────────┘   │
│                         │                               │
│  ┌──────────────────────▼──────────────────────────┐   │
│  │           UI Components (24 files)              │   │
│  │  Charts | Dashboard | Financial | Layout | UI  │   │
│  └──────────────────────┬──────────────────────────┘   │
│                         │                               │
│  ┌──────────────────────▼──────────────────────────┐   │
│  │           Services (API Clients)                │   │
│  │  transaction-service | analytics-service       │   │
│  │  goal-service | upload-service                 │   │
│  └──────────────────────┬──────────────────────────┘   │
│                         │                               │
│  ┌──────────────────────▼──────────────────────────┐   │
│  │              Axios HTTP Client                  │   │
│  │           (apiClient instance)                  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Backend Components

```
┌─────────────────────────────────────────────────────────┐
│                      FastAPI App                        │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │                Routes (4 files)                 │   │
│  │  /api/transactions | /api/analytics            │   │
│  │  /api/goals | /api/upload                      │   │
│  └──────────────────────┬──────────────────────────┘   │
│                         │                               │
│  ┌──────────────────────▼──────────────────────────┐   │
│  │             Schemas (Pydantic)                  │   │
│  │    Request/Response validation & serialization  │   │
│  └──────────────────────┬──────────────────────────┘   │
│                         │                               │
│  ┌──────────────────────▼──────────────────────────┐   │
│  │             Services (3 files)                  │   │
│  │  TransactionService | AnalyticsService         │   │
│  │  GoalService                                    │   │
│  └──────────────────────┬──────────────────────────┘   │
│                         │                               │
│  ┌──────────────────────▼──────────────────────────┐   │
│  │            Utils (6 files)                      │   │
│  │  csv_parser | encoding_detector                │   │
│  │  category_mapper | transaction_hasher          │   │
│  └──────────────────────┬──────────────────────────┘   │
│                         │                               │
│  ┌──────────────────────▼──────────────────────────┐   │
│  │          SQLAlchemy ORM (Models)                │   │
│  │  Transaction | Goal | AppSettings              │   │
│  └──────────────────────┬──────────────────────────┘   │
│                         │                               │
│  ┌──────────────────────▼──────────────────────────┐   │
│  │            Database Session                     │   │
│  │          (get_db dependency)                    │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Entity Relationship Diagram

```
┌──────────────────────────┐
│      transactions        │
├──────────────────────────┤
│ id (PK)                  │
│ date                     │◄───── Indexed
│ description              │
│ amount (BIGINT)          │
│ category                 │◄───── Indexed
│ subcategory              │
│ source                   │
│ payment_method           │
│ notes                    │
│ is_income (BOOLEAN)      │
│ is_transfer (BOOLEAN)    │
│ month_key (YYYY-MM)      │◄───── Indexed
│ tx_hash (SHA-256)        │◄───── Unique
│ created_at               │
└──────────────────────────┘
         │
         │ Used by Analytics
         │ Aggregations
         ▼
┌──────────────────────────┐
│         goals            │
├──────────────────────────┤
│ id (PK)                  │
│ years (1,3,5,10)         │◄───── Unique
│ target_amount (BIGINT)   │
│ start_date               │
│ created_at               │
└──────────────────────────┘
         │
         │ Used by Goal
         │ Progress Calc
         ▼
┌──────────────────────────┐
│      app_settings        │
├──────────────────────────┤
│ id (PK=1) Singleton      │
│ currency (JPY)           │
│ starting_net_worth       │
│ base_date                │
│ created_at               │
│ updated_at               │
└──────────────────────────┘
```

### Key Indexes

```sql
-- Primary indexes for common queries
CREATE INDEX ix_transactions_date ON transactions(date);
CREATE INDEX ix_transactions_category ON transactions(category);
CREATE INDEX ix_transactions_month_key ON transactions(month_key);

-- Composite indexes for performance
CREATE INDEX ix_duplicate_check ON transactions(date, amount, description, source);
CREATE INDEX ix_month_category ON transactions(month_key, category);

-- Unique constraints
CREATE UNIQUE INDEX ix_transactions_tx_hash ON transactions(tx_hash);
CREATE UNIQUE INDEX ix_goals_years ON goals(years);
```

---

## Data Flow Diagrams

### CSV Upload Flow

```
User Browser
    │
    │ 1. Upload CSV file
    │    (multipart/form-data)
    ▼
┌─────────────────────────────┐
│  UploadDropZone.tsx         │
│  (React Component)          │
└───────────┬─────────────────┘
            │
            │ 2. uploadCSV(file)
            │    POST /api/upload/csv
            ▼
┌─────────────────────────────┐
│  upload.py (Route)          │
│  - Receive file             │
│  - Read content             │
└───────────┬─────────────────┘
            │
            │ 3. csv_parser.parse_csv()
            ▼
┌─────────────────────────────┐
│  CSV Parser (Utils)         │
│  ┌─────────────────────┐   │
│  │ encoding_detector   │   │
│  │ (Shift-JIS/UTF-8)   │   │
│  └──────────┬──────────┘   │
│             ▼               │
│  ┌─────────────────────┐   │
│  │ csv_column_mapper   │   │
│  │ (日付→date mapping) │   │
│  └──────────┬──────────┘   │
│             ▼               │
│  ┌─────────────────────┐   │
│  │ csv_row_parser      │   │
│  │ (Parse each row)    │   │
│  └──────────┬──────────┘   │
│             ▼               │
│  ┌─────────────────────┐   │
│  │ category_mapper     │   │
│  │ (食費→Food)         │   │
│  └──────────┬──────────┘   │
│             ▼               │
│  ┌─────────────────────┐   │
│  │ transaction_hasher  │   │
│  │ (SHA-256 hash)      │   │
│  └──────────┬──────────┘   │
└─────────────┼───────────────┘
              │
              │ 4. For each parsed row
              ▼
┌─────────────────────────────┐
│  TransactionService         │
│  .create_transaction()      │
│  - Check duplicate hash     │
│  - Insert to DB             │
└───────────┬─────────────────┘
            │
            │ 5. INSERT (if not duplicate)
            ▼
┌─────────────────────────────┐
│  Database (transactions)    │
│  - tx_hash unique check     │
│  - Constraints validated    │
└───────────┬─────────────────┘
            │
            │ 6. Return result
            ▼
┌─────────────────────────────┐
│  Upload Result              │
│  - total_rows: 1000         │
│  - imported_count: 950      │
│  - duplicate_count: 50      │
│  - errors: []               │
└─────────────────────────────┘
```

### Dashboard Load Flow

```
User navigates to Dashboard
            │
            ▼
┌─────────────────────────────┐
│  Dashboard.tsx              │
│  (React Component)          │
└───────────┬─────────────────┘
            │
            │ Parallel API calls
            ├──────────────────────────┬──────────────────┬───────────────┐
            │                          │                  │               │
            ▼                          ▼                  ▼               ▼
┌─────────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌──────────┐
│ getTotalSummary()   │  │ getMonthlyTrend │  │ getCategory     │  │ getGoals │
│ GET /api/           │  │ GET /api/       │  │ Breakdown       │  │ GET      │
│ transactions/       │  │ analytics/trend │  │ GET /api/       │  │ /api/    │
│ summary/total       │  │ ?months=12      │  │ analytics/      │  │ goals    │
│                     │  │                 │  │ categories      │  │          │
└─────────┬───────────┘  └────────┬────────┘  └────────┬────────┘  └────┬─────┘
          │                       │                     │                │
          ▼                       ▼                     ▼                ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                          Backend Routes                                    │
│  transactions.py        analytics.py        analytics.py        goals.py  │
└───────────┬────────────────────┬────────────────────┬──────────────────┬──┘
            │                    │                    │                  │
            ▼                    ▼                    ▼                  ▼
┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  ┌─────────────┐
│ Transaction     │  │ Analytics       │  │ Analytics      │  │ Goal        │
│ Service         │  │ Service         │  │ Service        │  │ Service     │
│ .get_total_     │  │ .get_monthly_   │  │ .get_category_ │  │ .get_all_   │
│ summary()       │  │ trend()         │  │ breakdown()    │  │ goals()     │
└────────┬────────┘  └────────┬────────┘  └───────┬────────┘  └──────┬──────┘
         │                    │                    │                  │
         │                    │                    │                  │
         └────────────────────┴────────────────────┴──────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │  Database Queries   │
                    │  - Aggregations     │
                    │  - Group by month   │
                    │  - Exclude transfers│
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Return JSON        │
                    │  {                  │
                    │    income: 500000,  │
                    │    expenses: 300000,│
                    │    net: 200000      │
                    │  }                  │
                    └──────────┬──────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Dashboard Components                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │ DashboardKPIs│  │ TrendChartCard│  │ CategoryPie │             │
│  │ (3 KPI cards)│  │ (Line chart)  │  │ Chart       │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│  ┌──────────────────────────────────────────────────┐             │
│  │      GoalProgressCard (x4 for 1/3/5/10 years)    │             │
│  └──────────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
```

### Goal Progress Calculation Flow

```
User views Goals page
            │
            ▼
┌─────────────────────────────┐
│  Goals.tsx                  │
│  - Fetch all goals          │
└───────────┬─────────────────┘
            │
            │ For each goal
            │ getGoalProgress(goal.id)
            ▼
┌─────────────────────────────┐
│  GET /api/goals/{id}/       │
│  progress                   │
└───────────┬─────────────────┘
            │
            ▼
┌─────────────────────────────┐
│  goals.py (Route)           │
│  - Call GoalService         │
└───────────┬─────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│  GoalService.calculate_progress(db, goal_id)                │
│                                                              │
│  1. Fetch goal from DB                                      │
│     ┌──────────────────────────┐                            │
│     │ goal = db.query(Goal)... │                            │
│     └────────────┬─────────────┘                            │
│                  │                                           │
│  2. Determine start_date                                    │
│     ┌──────────────────────────────────────┐               │
│     │ start_date = goal.start_date OR      │               │
│     │ earliest transaction date            │               │
│     └────────────┬───────────────────────────┘             │
│                  │                                           │
│  3. Calculate target_date                                   │
│     ┌──────────────────────────────────────┐               │
│     │ target_date = start_date +           │               │
│     │ relativedelta(years=goal.years)      │               │
│     └────────────┬───────────────────────────┘             │
│                  │                                           │
│  4. Query all transactions (exclude transfers)              │
│     ┌──────────────────────────────────────┐               │
│     │ transactions = db.query(Transaction) │               │
│     │   .filter(is_transfer == False)      │               │
│     │   .filter(date >= start_date)        │               │
│     │   .filter(date <= now)               │               │
│     └────────────┬───────────────────────────┘             │
│                  │                                           │
│  5. Sum income and expenses                                 │
│     ┌──────────────────────────────────────┐               │
│     │ income = sum(amount where is_income) │               │
│     │ expenses = sum(amount where not      │               │
│     │              is_income AND amount<0) │               │
│     │ total_saved = income - abs(expenses) │               │
│     └────────────┬───────────────────────────┘             │
│                  │                                           │
│  6. Calculate time metrics                                  │
│     ┌──────────────────────────────────────┐               │
│     │ months_total = years * 12            │               │
│     │ months_elapsed = (now - start_date)  │               │
│     │ months_remaining = months_total -    │               │
│     │                    months_elapsed    │               │
│     └────────────┬───────────────────────────┘             │
│                  │                                           │
│  7. Calculate needed per month                              │
│     ┌──────────────────────────────────────┐               │
│     │ needed_total = target - total_saved  │               │
│     │ needed_per_month = needed_total /    │               │
│     │                    months_remaining  │               │
│     └────────────┬───────────────────────────┘             │
│                  │                                           │
│  8. Project final total (linear projection)                 │
│     ┌──────────────────────────────────────┐               │
│     │ avg_monthly = total_saved /          │               │
│     │               months_elapsed         │               │
│     │ projected_total = total_saved +      │               │
│     │   (avg_monthly * months_remaining)   │               │
│     └────────────┬───────────────────────────┘             │
│                  │                                           │
│  9. Determine status                                        │
│     ┌──────────────────────────────────────┐               │
│     │ if projected_total > target * 1.05:  │               │
│     │   status = "ahead"                   │               │
│     │ elif projected_total >= target*0.95: │               │
│     │   status = "on_track"                │               │
│     │ else:                                │               │
│     │   status = "behind"                  │               │
│     └────────────┬───────────────────────────┘             │
│                  │                                           │
│  10. Return GoalProgress                                    │
│     ┌──────────────────────────────────────┐               │
│     │ return GoalProgress(                 │               │
│     │   goal_id, total_saved,              │               │
│     │   needed_per_month, status,          │               │
│     │   projected_total, ...               │               │
│     │ )                                    │               │
│     └──────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│  GoalProgressCard.tsx       │
│  - Progress bar             │
│  - Status badge (color)     │
│  - Needed per month         │
│  - Projected total          │
└─────────────────────────────┘
```

---

## API Architecture

### RESTful Endpoints

```
/api/transactions
  GET     List transactions (filters, pagination)
  POST    Create transaction
  /{id}
    GET   Get transaction by ID

/api/transactions/summary
  /total
    GET   Total income/expenses/net summary

/api/analytics
  /monthly
    GET   Monthly cashflow aggregation
  /categories
    GET   Category breakdown (expenses)
  /trend
    GET   Last N months trend
  /sources
    GET   Source breakdown

/api/goals
  GET     List all goals
  POST    Create goal
  /{id}
    GET   Get goal by ID
    PUT   Update goal
    DELETE Delete goal
    /progress
      GET Calculate progress

/api/upload
  /csv
    POST  Upload CSV file
```

### Request/Response Flow

```
Client Request
      │
      │ HTTP Request (JSON)
      ▼
┌────────────────────┐
│  FastAPI Route     │
│  - URL routing     │
│  - Auth (future)   │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  Pydantic Schema   │
│  - Validate input  │
│  - Parse types     │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  Service Layer     │
│  - Business logic  │
│  - DB queries      │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  SQLAlchemy ORM    │
│  - Execute query   │
│  - Return models   │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  Pydantic Schema   │
│  - Serialize output│
│  - Format response │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  FastAPI Route     │
│  - HTTP response   │
│  - Status code     │
└─────────┬──────────┘
          │
          │ HTTP Response (JSON)
          ▼
    Client Response
```

---

## Security Architecture

### Current Security (MVP)

```
┌─────────────────────────────────────┐
│          No Authentication          │
│     (Single-user local deployment)  │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│       Input Validation              │
│  - Pydantic schemas                 │
│  - Type checking                    │
│  - Constraint validation            │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│       SQL Injection Prevention      │
│  - SQLAlchemy ORM (parameterized)   │
│  - No raw SQL                       │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│       File Upload Validation        │
│  - Max size: 50MB                   │
│  - CSV format check                 │
│  - Encoding detection               │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│       CORS Configuration            │
│  - localhost:5173, localhost:3000   │
│  - Credentials allowed              │
└─────────────────────────────────────┘
```

### Future Security (Production)

```
┌─────────────────────────────────────┐
│       HTTPS (Let's Encrypt)         │
│  - Caddy reverse proxy              │
│  - Auto SSL certificates            │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│       Basic Authentication          │
│  - Username/password                │
│  - Caddy basicauth                  │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│       Rate Limiting                 │
│  - Slowapi middleware               │
│  - Per-IP limits                    │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│       Content Security Policy       │
│  - Helmet.js equivalent             │
│  - XSS protection                   │
└─────────────────────────────────────┘
```

---

## Deployment Architecture

### Local Development

```
┌──────────────────────────────────────────────┐
│              Developer Machine               │
├──────────────────────────────────────────────┤
│  ┌────────────────┐  ┌──────────────────┐   │
│  │   Terminal 1   │  │    Terminal 2    │   │
│  │                │  │                  │   │
│  │  cd backend    │  │  cd frontend     │   │
│  │  fastapi dev   │  │  npm run dev     │   │
│  │  :8000         │  │  :5173           │   │
│  └────────────────┘  └──────────────────┘   │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │         smartmoney.db (SQLite)       │   │
│  │         backend/smartmoney.db        │   │
│  └──────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
              │
              ▼
        Browser: localhost:5173
```

### Production VPS (Future)

```
┌──────────────────────────────────────────────────────┐
│                    VPS (Hetzner CX21)                │
│                  Ubuntu 22.04 LTS                    │
├──────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────┐ │
│  │           Caddy (Reverse Proxy)                │ │
│  │  - HTTPS (Let's Encrypt)                       │ │
│  │  - Basic auth                                  │ │
│  │  - Port 443 → :8000 (API), :5173 (Frontend)  │ │
│  └──────────────────┬─────────────────────────────┘ │
│                     │                                │
│  ┌──────────────────▼─────────────────────────────┐ │
│  │         Docker Compose                         │ │
│  │  ┌──────────────┐  ┌────────────────────────┐ │ │
│  │  │   backend    │  │      frontend          │ │ │
│  │  │   FastAPI    │  │  Nginx (static serve)  │ │ │
│  │  │   :8000      │  │      :5173             │ │ │
│  │  └──────┬───────┘  └────────────────────────┘ │ │
│  │         │                                      │ │
│  │         ▼                                      │ │
│  │  ┌──────────────────────────────────────────┐ │ │
│  │  │    PostgreSQL (container)                │ │ │
│  │  │    :5432                                 │ │ │
│  │  │    Volume: /var/lib/postgresql/data     │ │ │
│  │  └──────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │         Backup Cron Job (daily)                │ │
│  │  - pg_dump → /backups/smartmoney-YYYYMMDD.sql │ │
│  │  - rsync to remote storage                    │ │
│  └────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
              │
              ▼
   Internet → https://smartmoney.yourdomain.com
```

---

## Performance Optimization

### Database Query Optimization

**Indexes:**
```sql
-- Single column indexes
ix_transactions_date        -- Date range queries
ix_transactions_category    -- Category filtering
ix_transactions_month_key   -- Monthly aggregations

-- Composite indexes
ix_duplicate_check          -- (date, amount, description, source)
ix_month_category           -- (month_key, category)
```

**Query Patterns:**
```python
# Use month_key for monthly aggregations (faster than date grouping)
# Good
.filter(Transaction.month_key == '2025-11')

# Bad
.filter(extract('year', Transaction.date) == 2025)\
.filter(extract('month', Transaction.date) == 11)

# Exclude transfers in analytics (reduce result set)
.filter(Transaction.is_transfer == False)

# Use pagination for large result sets
.offset(skip).limit(limit)
```

### Frontend Optimization

**Code Splitting:**
```typescript
// Lazy load routes
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Analytics = lazy(() => import('./pages/Analytics'));
```

**Memoization:**
```typescript
// Memoize expensive chart components
export const TrendLineChart = React.memo(function TrendLineChart({
  data,
}: TrendLineChartProps) {
  // ...
});
```

**Data Fetching:**
```typescript
// Parallel requests
const [summary, trend, categories, goals] = await Promise.all([
  getTotalSummary(),
  getMonthlyTrend(12),
  getCategoryBreakdown(),
  getGoals(),
]);
```

---

## Error Handling Strategy

### Backend Error Hierarchy

```
Exception
  │
  ├─ HTTPException (FastAPI)
  │   ├─ 400 Bad Request (validation errors)
  │   ├─ 404 Not Found (resource not found)
  │   ├─ 409 Conflict (duplicate hash)
  │   └─ 500 Internal Server Error (unexpected)
  │
  ├─ ValueError (business logic errors)
  │   └─ Raised in services, caught in routes
  │
  └─ SQLAlchemyError (database errors)
      ├─ IntegrityError (constraint violations)
      └─ OperationalError (connection issues)
```

### Error Flow

```
Service raises ValueError
      │
      ▼
Route catches error
      │
      ▼
Convert to HTTPException
      │
      ▼
FastAPI middleware
      │
      ▼
JSON error response
  {
    "detail": "Transaction not found"
  }
      │
      ▼
Frontend service catches
      │
      ▼
Component displays error
```

---

## Monitoring & Logging (Future)

### Logging Strategy

```python
# Application logs
logger.info("CSV upload started: filename={filename}")
logger.warning("Duplicate transaction detected: hash={tx_hash}")
logger.error("Database connection failed: error={error}")

# Access logs (Caddy)
# Automatically logged by reverse proxy

# Performance metrics
# Response time per endpoint
# Database query duration
```

### Metrics to Track

- API response times (p50, p95, p99)
- Database query performance
- CSV upload success rate
- Active sessions (future multi-user)
- Disk space usage
- Memory usage

---

## Technology Decisions Rationale

### Backend: FastAPI over Flask
- **Type safety:** Automatic request/response validation
- **Performance:** Async support, faster than Flask
- **Documentation:** Auto-generated OpenAPI/Swagger
- **Modern:** Built on Pydantic, Starlette

### Frontend: Vite over CRA
- **Speed:** 10-20x faster builds
- **HMR:** Instant hot module replacement
- **Modern:** Native ESM, optimized production builds
- **DX:** Better developer experience

### Charts: Recharts over Chart.js/D3
- **React integration:** Declarative, component-based
- **TypeScript:** Full type support
- **Simplicity:** Less code than D3
- **Responsive:** Built-in responsive features

### Database: SQLite → PostgreSQL
- **Start simple:** SQLite for MVP (zero config)
- **Scale later:** Migrate to PostgreSQL when needed (>250k transactions)
- **Same ORM:** SQLAlchemy abstracts dialect differences

---

## Future Architecture Enhancements

### Phase 1: Docker Compose
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    environment:
      - DATABASE_URL=postgresql://...

  frontend:
    build: ./frontend
    depends_on:
      - backend

  db:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

### Phase 2: Caching Layer
```
Frontend → Redis Cache → Backend → Database
           (cache monthly aggregations)
```

### Phase 3: Background Workers
```
FastAPI → Celery Worker → Task Queue
          (CSV processing, email reports)
```

---

**END OF SYSTEM ARCHITECTURE**
