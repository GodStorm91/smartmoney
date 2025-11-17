# SmartMoney - Project Overview & PDR
**Product Development Requirements**
**Version:** 0.1.0
**Last Updated:** 2025-11-17
**Status:** MVP Complete

---

## 1. Project Vision

SmartMoney is a personal finance webapp that enables Japanese users to track cashflow, analyze spending patterns, and monitor progress toward long-term financial goals through CSV import from popular finance apps.

**Mission:** Empower users with privacy-first, self-hosted financial tracking and goal-oriented savings insights.

---

## 2. Target Users

### Primary User Profile
- **Location:** Japan
- **Age:** 25-45
- **Financial Situation:** Salary workers, families with children
- **Finance Apps:** Using Zaim, MoneyForward, bank/card apps
- **Pain Points:**
  - Multiple finance apps → fragmented data
  - No long-term goal tracking (1/3/5/10 years)
  - Privacy concerns with cloud services
  - Need cashflow visibility across all accounts

### User Needs
1. **Data Privacy:** Self-hosted, no cloud data sharing
2. **CSV Import:** Monthly exports from existing finance apps
3. **Unified View:** All transactions in one place
4. **Goal Tracking:** Multi-horizon savings targets (1/3/5/10 years)
5. **Japanese Support:** Full Japanese UI/data handling

---

## 3. Project Objectives

### Primary Objectives
1. ✅ **CSV Import System** - Parse Japanese finance app exports (Zaim, MoneyForward)
2. ✅ **Transaction Storage** - Unified transaction database with duplicate detection
3. ✅ **Cashflow Analytics** - Monthly income/expense/net analysis with category breakdown
4. ✅ **Goal Tracking** - Multi-horizon goals (1/3/5/10 years) with progress calculation
5. ✅ **Dashboard UI** - Interactive visualizations with Recharts

### Secondary Objectives (Future)
- Budget vs actual tracking
- Year-over-year comparisons
- Mobile app (React Native)
- Multi-user support (family accounts)
- Bank API integration (replace CSV import)

---

## 4. Key Features

### 4.1 CSV Import & Parsing
**Status:** ✅ Complete

**Functionality:**
- Upload CSV files via drag-and-drop
- Auto-detect encoding (Shift-JIS, UTF-8, UTF-8-BOM)
- Map Japanese columns (日付, 金額（円）, 大項目, etc.) to English fields
- Duplicate detection via SHA-256 hash (date|amount|description|source)
- Category mapping (食費 → Food, 住宅 → Housing, etc.)
- Bulk import with error reporting

**Acceptance Criteria:**
- ✅ Parse MoneyForward CSV format
- ✅ Parse Zaim CSV format
- ✅ Handle Shift-JIS encoding
- ✅ Detect duplicates on re-upload
- ✅ Report import summary (total, imported, duplicates, errors)

### 4.2 Transaction Management
**Status:** ✅ Complete

**Functionality:**
- Store transactions in SQLite database
- Filter by date range, category, source, income/expense
- Pagination support (skip/limit)
- View individual transaction details
- Summary statistics (total income, total expenses, net)

**Acceptance Criteria:**
- ✅ CRUD operations via API
- ✅ Indexed queries for fast filtering
- ✅ Currency stored as BIGINT (no float precision issues)
- ✅ month_key for efficient monthly grouping

### 4.3 Cashflow Analytics
**Status:** ✅ Complete

**Functionality:**
- Monthly cashflow aggregation (income, expenses, net)
- Category breakdown (pie chart)
- 12-month trend line chart
- Source breakdown (income/expenses by account)

**Acceptance Criteria:**
- ✅ Monthly aggregation excludes transfers
- ✅ Category breakdown shows top categories
- ✅ Trend chart displays last N months
- ✅ Source breakdown shows account distribution

### 4.4 Goal Tracking
**Status:** ✅ Complete

**Functionality:**
- Define goals for 1, 3, 5, 10 year horizons
- Track total savings (sum income - sum expenses)
- Calculate needed per month to reach goal
- Project status: ahead / on_track / behind
- Visual progress bars with status badges

**Acceptance Criteria:**
- ✅ Create/update/delete goals
- ✅ Unique constraint on years (one goal per horizon)
- ✅ Progress calculation with linear projection
- ✅ Status determination (ahead: >5% over, on_track: ±5%, behind: <5% under)

### 4.5 Dashboard UI
**Status:** ✅ Complete

**Functionality:**
- KPI cards (current month income/expenses/net)
- 12-month trend chart
- Category breakdown pie chart
- Goal progress widgets (1/3/5/10 years)
- Quick action buttons (upload CSV, add transaction)

**Acceptance Criteria:**
- ✅ Responsive design (mobile-first)
- ✅ Interactive charts (Recharts)
- ✅ Japanese currency formatting (¥1,234,567)
- ✅ Status badges (green=ahead, yellow=on_track, red=behind)

---

## 5. Success Criteria

### MVP Success Criteria (v0.1.0)
- ✅ Import 100+ transactions from CSV without errors
- ✅ Dashboard loads in <500ms with 1000 transactions
- ✅ Goal progress calculation matches manual calculation
- ✅ All 89 tests passing
- ✅ Code quality score ≥90/100

### User Success Criteria
- User can upload monthly CSV in <30 seconds
- User can view cashflow summary in <5 seconds
- User can create goal in <10 seconds
- User understands goal status (ahead/on_track/behind) immediately

### Technical Success Criteria
- ✅ Database queries return in <100ms (monthly aggregation)
- ✅ CSV upload processes 10k rows in <2s
- ✅ Zero data loss on duplicate uploads
- ✅ No float precision errors in currency handling

---

## 6. Non-Functional Requirements

### 6.1 Performance
- **Target:** 100k transactions
- **CSV Upload:** 10k rows in ~2s
- **Monthly Aggregation:** <100ms
- **Dashboard Load:** <500ms
- **Database:** SQLite (MVP), PostgreSQL (production scale)

### 6.2 Security
- **Deployment:** Self-hosted (local or VPS)
- **Auth:** Single-user (no multi-tenant in v0.1)
- **Data:** No cloud storage, all local
- **Future:** Basic auth for VPS deployment

### 6.3 Reliability
- **Duplicate Detection:** 100% accuracy via SHA-256 hash + unique constraint
- **Data Integrity:** Currency stored as BIGINT (no precision loss)
- **Error Handling:** Graceful CSV parsing errors with detailed messages

### 6.4 Usability
- **Language:** Japanese primary (UI translations future)
- **Design:** Mobile-first responsive
- **Accessibility:** WCAG AA compliance (future)
- **Learning Curve:** <5 minutes to upload first CSV and view dashboard

### 6.5 Maintainability
- **Code Quality:** 92/100 (code review)
- **Test Coverage:** 95%+ (services), 100% (utils)
- **Documentation:** Comprehensive (15+ docs)
- **Standards:** PEP 8 (Python), TypeScript strict mode

---

## 7. Technical Constraints

### 7.1 Technology Stack
**Backend:**
- Python 3.11+ (required for type hints, performance)
- FastAPI (chosen for async, type safety, auto docs)
- SQLAlchemy ORM (chosen for dialect portability)
- SQLite (MVP) → PostgreSQL (production)
- Pandas (CSV parsing)

**Frontend:**
- React 18 (hooks, concurrent features)
- TypeScript (strict mode, no `any`)
- Vite (fast build, HMR)
- TanStack Router (file-based routing)
- Recharts (declarative charts)
- Tailwind CSS (utility-first)

**Rationale:**
- FastAPI over Flask: Type safety, async, OpenAPI auto-generation
- Recharts over Chart.js/D3: React integration, declarative API
- Vite over CRA: 10x faster builds, better DX
- SQLite → PostgreSQL: Start simple, migrate when needed

### 7.2 Design Principles

**YAGNI (You Aren't Gonna Need It):**
- Single-user only (no multi-tenant complexity)
- Basic auth for VPS (defer OAuth until needed)
- SQLite first (defer PostgreSQL until >250k transactions)
- JSON config for categories (defer admin UI)

**KISS (Keep It Simple, Stupid):**
- Monolithic MVC (not microservices)
- Hash-based duplicate detection (not ML)
- Pandas for CSV parsing (battle-tested)
- No premature optimization

**DRY (Don't Repeat Yourself):**
- SQLAlchemy ORM (dialect-agnostic queries)
- Category mappings in JSON (single source of truth)
- Pydantic schemas for validation (reuse across routes)

### 7.3 File Size Standards
- **Python files:** <200 lines
- **TypeScript files:** <200 lines
- **Functions:** <50 lines
- **Documentation:** <300 lines per file

---

## 8. User Stories

### US-1: CSV Import
**As a user**, I want to upload my monthly CSV export from MoneyForward/Zaim so that my transactions are automatically stored in the app.

**Acceptance Criteria:**
- ✅ Drag-and-drop CSV file
- ✅ Auto-detect Japanese encoding
- ✅ Map Japanese columns to English fields
- ✅ Skip duplicates on re-upload
- ✅ Show import summary (total, imported, duplicates, errors)

### US-2: Dashboard Overview
**As a user**, I want to see my current month's income, expenses, and net cashflow on the dashboard so that I quickly understand my financial status.

**Acceptance Criteria:**
- ✅ Display current month KPIs (income, expenses, net)
- ✅ Show 12-month trend chart
- ✅ Display top 5 categories
- ✅ Show goal progress widgets

### US-3: Category Analysis
**As a user**, I want to see which categories consume the most money so that I can identify areas to reduce spending.

**Acceptance Criteria:**
- ✅ Display category breakdown pie chart
- ✅ Show category amounts in descending order
- ✅ Filter by date range
- ✅ Exclude transfers from analysis

### US-4: Goal Setting
**As a user**, I want to set savings targets for 1, 3, 5, and 10 years so that I can track my long-term financial goals.

**Acceptance Criteria:**
- ✅ Create goals with target amounts
- ✅ Unique goal per horizon (1/3/5/10 years)
- ✅ Optional start date (default to earliest transaction)
- ✅ Update/delete goals

### US-5: Goal Progress Tracking
**As a user**, I want to see if I'm on track to meet my goals so that I can adjust my savings behavior.

**Acceptance Criteria:**
- ✅ Display total saved so far
- ✅ Calculate needed per month
- ✅ Show projected total at target date
- ✅ Status badge: ahead (green), on_track (yellow), behind (red)

### US-6: Transaction Filtering
**As a user**, I want to filter transactions by date, category, and source so that I can drill down into specific spending.

**Acceptance Criteria:**
- ✅ Filter by date range
- ✅ Filter by category
- ✅ Filter by source
- ✅ Filter by income/expense
- ✅ Pagination (50 per page)

---

## 9. Out of Scope (v0.1)

The following features are explicitly **NOT** included in MVP:

1. **Multi-User Support** - Single-user only
2. **Authentication** - No login (local deployment assumed)
3. **Budget Management** - Only actual tracking, no budgets
4. **Transaction Editing** - Read-only after import
5. **Bank API Integration** - CSV import only
6. **Mobile App** - Web only
7. **Export Functionality** - Import only
8. **Recurring Transactions** - No templates
9. **Tags/Labels** - Category only
10. **Alerts/Notifications** - No automated alerts

---

## 10. Risks & Mitigations

### Risk 1: CSV Format Changes
**Impact:** High
**Probability:** Medium
**Mitigation:**
- Flexible column mapping (handles variations)
- Externalized category mappings (JSON config)
- Error reporting for unmapped columns
- Future: User-defined mapping UI

### Risk 2: Performance at Scale
**Impact:** Medium
**Probability:** Low
**Mitigation:**
- Database indexes on key columns
- Pagination for large result sets
- month_key for efficient grouping
- SQLite → PostgreSQL migration path

### Risk 3: Data Loss
**Impact:** Critical
**Probability:** Very Low
**Mitigation:**
- Duplicate detection prevents re-import issues
- Database transactions for atomic operations
- Future: Automated backups

### Risk 4: User Adoption
**Impact:** Medium
**Probability:** Medium
**Mitigation:**
- Mobile-first responsive design
- Quick start guide in docs
- Upload FAQ with example CSV
- Future: Video tutorial

---

## 11. Dependencies

### External Dependencies
- **Python Packages:** FastAPI, SQLAlchemy, Pandas, chardet, pytest
- **Node Packages:** React, TypeScript, Recharts, TanStack Router, Tailwind CSS
- **System:** Python 3.11+, Node 18+, SQLite 3

### Internal Dependencies
- Backend must be running for frontend to function
- Database must exist (created on first run)
- CSV files must match expected format

---

## 12. Milestones & Timeline

### Phase 1: Research & Planning (Complete)
- ✅ Requirements gathering (specs.md)
- ✅ Tech stack selection
- ✅ Database schema design
- ✅ CSV parsing research
- ✅ Design guidelines & wireframes

### Phase 2: Backend Development (Complete)
- ✅ Database models & migrations
- ✅ API routes & services
- ✅ CSV parser implementation
- ✅ Goal progress algorithm
- ✅ Comprehensive testing (89 tests)

### Phase 3: Frontend Development (Complete)
- ✅ Component library (24 components)
- ✅ Pages & routing (6 pages)
- ✅ API integration (6 services)
- ✅ Charts & visualizations
- ✅ Responsive design

### Phase 4: Integration & Testing (Complete)
- ✅ End-to-end testing
- ✅ Code review (92/100)
- ✅ Documentation (15+ docs)
- ✅ Performance validation

### Phase 5: Deployment (Pending)
- ⏳ Docker Compose setup
- ⏳ VPS deployment guide
- ⏳ PostgreSQL migration script
- ⏳ Backup automation

---

## 13. Future Roadmap

### v0.2 - Polish & Deployment (Q1 2026)
- Docker Compose for easy deployment
- VPS deployment guide (Hetzner)
- PostgreSQL migration
- Transaction editing UI
- Settings page implementation

### v0.3 - Enhanced Analytics (Q2 2026)
- Budget vs actual tracking
- Year-over-year comparisons
- Spending velocity analysis
- Custom date range reports

### v0.4 - Advanced Features (Q3 2026)
- Multi-user support (family accounts)
- Custom category management UI
- Export functionality (CSV, JSON, PDF)
- Recurring transaction templates

### v1.0 - Production Ready (Q4 2026)
- Mobile app (React Native)
- Bank API integration
- Automated alerts/notifications
- Internationalization (English UI)

---

## 14. Metrics & KPIs

### Product Metrics
- **Import Success Rate:** Target 99%+ (CSV parsing)
- **Data Accuracy:** 100% (duplicate detection, currency handling)
- **Response Time:** <500ms (dashboard load)
- **Uptime:** 99.9% (self-hosted target)

### User Engagement Metrics (Future)
- Monthly active usage
- CSV upload frequency
- Goal creation rate
- Dashboard view frequency

### Technical Metrics
- Test coverage: 95%+ (current)
- Code quality: 90+ (current: 92)
- Build time: <30s (current: ~15s)
- Bundle size: <500KB (gzipped)

---

## 15. Unresolved Questions

1. **CSV Format Detection:** Auto-detect Zaim vs MoneyForward or require user selection?
   - **Current:** Manual selection assumed
   - **Recommendation:** Add format dropdown in upload UI

2. **Category Recategorization:** Bulk update historical transactions when mappings change?
   - **Current:** No recategorization
   - **Recommendation:** Add bulk update API for v0.2

3. **Transfer Inference:** Detect transfers from keywords if 振替 flag missing?
   - **Current:** Rely on 振替 flag
   - **Recommendation:** Add keyword detection for v0.2

4. **Multi-Currency:** Should schema support future expansion beyond JPY?
   - **Current:** JPY only
   - **Recommendation:** Add currency field in v0.3 if needed

5. **Audit Trail:** Store original CSV files or normalized data only?
   - **Current:** Normalized data only
   - **Recommendation:** Add file storage for audit trail in v0.2

6. **Goal Start Date:** Auto-detect from first transaction vs user-defined?
   - **Current:** Auto-detect with optional override
   - **Recommendation:** Keep current approach

---

## 16. Approval & Sign-Off

**Product Owner:** Self (Personal Project)
**Status:** ✅ Approved for MVP Release
**Date:** 2025-11-17
**Next Review:** Q1 2026 (v0.2 planning)

---

**END OF PDR**
