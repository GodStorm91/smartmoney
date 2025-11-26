# SmartMoney Cashflow Tracker - Project Roadmap

**Version:** 1.2
**Last Updated:** 2025-11-25
**Current Release:** v0.2.1 (Production Deployed)
**Status:** ✅ Live at https://money.khanh.page

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Version History](#version-history)
3. [Short-Term Roadmap (v0.2.0 - v0.5.0)](#short-term-roadmap-v020---v050)
4. [Mid-Term Roadmap (v0.6.0 - v1.0.0)](#mid-term-roadmap-v060---v100)
5. [Long-Term Vision (v2.0+)](#long-term-vision-v20)
6. [Technical Debt & Improvements](#technical-debt--improvements)
7. [Milestones & Timeline](#milestones--timeline)
8. [Success Metrics](#success-metrics)
9. [Risk Management](#risk-management)
10. [Changelog](#changelog)

---

## Executive Summary

SmartMoney Cashflow Tracker is a privacy-first personal finance webapp designed for Japanese users to track cashflow, analyze spending patterns, and monitor progress toward long-term financial goals through CSV imports from popular finance apps (MoneyForward, Zaim).

**Current State (v0.1.0):**
- 89/89 tests passing (95%+ coverage)
- Code quality: 92/100
- Dashboard loads <500ms with 1000 transactions
- Full Japanese support (Shift-JIS/UTF-8)
- 102 files, 57,579 tokens

**Next Phase Focus:**
Production readiness, deployment automation, and enhanced user experience features.

---

## Version History

### v0.1.0 - MVP Complete (2025-11-17) ✅

**Release Date:** 2025-11-17
**Status:** Complete
**Test Coverage:** 95%+ | **Code Quality:** 92/100 | **Tests:** 89/89 passing

#### Features Shipped

**CSV Import System:**
- ✅ Auto-detect encoding (Shift-JIS, UTF-8, UTF-8-BOM)
- ✅ MoneyForward & Zaim format support
- ✅ Duplicate detection (SHA-256 hash)
- ✅ Category mapping (食費→Food, 住宅→Housing)
- ✅ Bulk import with error reporting

**Transaction Management:**
- ✅ SQLite database with SQLAlchemy ORM
- ✅ CRUD operations via REST API
- ✅ Filtering (date, category, source, income/expense)
- ✅ Pagination support (skip/limit)
- ✅ Currency as BIGINT (no float precision issues)

**Cashflow Analytics:**
- ✅ Monthly income/expense/net aggregation
- ✅ Category breakdown (pie chart)
- ✅ 12-month trend visualization (line chart)
- ✅ Source breakdown by account

**Goal Tracking:**
- ✅ Multi-horizon goals (1/3/5/10 years)
- ✅ Linear projection algorithm
- ✅ Status determination (ahead/on_track/behind)
- ✅ Progress bars with status badges

**Dashboard UI:**
- ✅ KPI cards (current month summary)
- ✅ Interactive Recharts visualizations
- ✅ Responsive design (mobile-first)
- ✅ Japanese currency formatting (¥1,234,567)

#### Technical Achievements

**Backend:**
- Python 3.11+ FastAPI application
- 4 route modules, 3 services
- 89 tests (pytest), 95%+ coverage
- Database migrations (Alembic)

**Frontend:**
- React 18 + TypeScript (strict mode)
- 24 components, 6 pages
- TanStack Router, Recharts
- Tailwind CSS + Shadcn/ui

**Performance:**
- Dashboard loads <500ms (1000 transactions)
- CSV upload: 10k rows in ~2s
- Monthly aggregation: <100ms
- Database queries optimized with indexes

#### Known Limitations

- ~~No transaction editing/deletion UI~~ ✅ Implemented
- No budget tracking (actual only)
- No data export functionality
- ~~Single-user only (no authentication)~~ ✅ JWT auth implemented
- ~~SQLite only (PostgreSQL pending)~~ ✅ PostgreSQL deployed
- ~~No Docker deployment yet~~ ✅ Docker on Hetzner VPS
- No production error handling
- No automated backups

#### Technical Debt

- Frontend bundle size: ~800KB (target: <500KB)
- No error message sanitization for production
- No database connection pooling
- TypeScript strict null checks not fully enabled

---

### v0.2.1 - Production Deployment (2025-11-24) ✅

**Release Date:** 2025-11-24
**Status:** Complete - Live at https://money.khanh.page

#### Features Shipped (Beyond Original Roadmap)

**Authentication System:**
- ✅ JWT-based authentication
- ✅ User registration and login
- ✅ Protected API routes
- ✅ Per-user data isolation

**Accounts Management:**
- ✅ Multi-currency support (JPY, USD, VND)
- ✅ Account types (bank, cash, credit_card, investment, receivable)
- ✅ Balance tracking with transaction history
- ✅ Balance adjustment functionality
- ✅ Thousand separator formatting for inputs

**Dashboard Enhancements:**
- ✅ Net Worth hero card with assets/liabilities breakdown
- ✅ Click-to-toggle breakdown view
- ✅ Privacy mode to mask amounts
- ✅ Monthly Cash Flow chart in Analytics

**Internationalization:**
- ✅ i18next integration
- ✅ Japanese, English, Vietnamese translations
- ✅ Language switcher in settings

**Transaction Management:**
- ✅ Edit transaction modal
- ✅ Delete with confirmation
- ✅ Create new transaction UI
- ✅ Date range filtering

**Deployment:**
- ✅ Docker Compose on Hetzner VPS
- ✅ PostgreSQL with Alembic migrations
- ✅ Nginx reverse proxy with SSL (Let's Encrypt)
- ✅ Environment variable configuration

---

### v0.2.2 - Budget Swipe Feature (2025-11-25) ✅

**Release Date:** 2025-11-25
**Status:** Complete - Production Ready
**Test Results:** All tests passing | Code quality maintained

#### Features Shipped

**Budget Draft Mode:**
- ✅ Generate budget creates draft (not auto-saved)
- ✅ "Draft" badge indicator in UI
- ✅ Multiple regenerations without persistence
- ✅ Clear visual distinction from saved budgets

**Interactive Budget Editing:**
- ✅ Swipe left/right to adjust allocation amounts
- ✅ 2.5x improved gesture sensitivity (400px = 100%)
- ✅ Touch support (mobile)
- ✅ Mouse support (desktop testing)
- ✅ Visual feedback (scale animation, ring highlight, pulse text)
- ✅ Real-time preview of changes

**Save Budget Button:**
- ✅ Visible only in draft mode
- ✅ Persists budget to database
- ✅ Shows "Saving..." loading state
- ✅ Clears draft after successful save
- ✅ Query cache invalidation

**Bug Fix: Swipe Gesture Not Working**
- ✅ Root cause identified: Missing preventDefault(), low sensitivity, missing touch-none CSS
- ✅ Solution implemented: preventDefault() on all handlers, 400px threshold sensitivity, touch-none/select-none CSS classes
- ✅ Validation: Tested on mobile and desktop
- ✅ Status: Production ready

**Internationalization:**
- ✅ Translation strings for all new UI elements
- ✅ Supports EN, JA, VI languages
- ✅ "Swipe left/right" instructions localized

---

### v0.2.3 - Budget Tracking & Dark Mode (2025-11-26) ✅

**Release Date:** 2025-11-26
**Status:** Complete - Production Deployed
**Build:** TypeScript ✅ | Production build 3.05s

#### Features Shipped

**Budget vs Actual Tracking UI:**
- ✅ Progress bar showing spent vs budgeted amount per category
- ✅ "X% remaining" text with color-coded status
- ✅ Color coding: green (>40%), yellow (20-40%), orange (5-20%), red (<5%)
- ✅ Warning icon (⚠️) when over budget (>100%)
- ✅ Integrated into existing Budget page
- ✅ Uses existing backend endpoint `/api/budgets/tracking/current`

**Dark Mode:**
- ✅ ThemeContext with localStorage persistence
- ✅ System preference auto-detection (prefers-color-scheme)
- ✅ Theme toggle in header (Sun/Moon icons)
- ✅ Mobile and desktop support
- ✅ Core UI components updated (Card, Button, Input, Select)
- ✅ Header with full dark mode styling
- ✅ Landing page excluded (stays light mode)
- ✅ Tailwind `darkMode: 'class'` configuration

**Files Created:**
- `frontend/src/contexts/ThemeContext.tsx`
- `frontend/src/components/layout/ThemeToggle.tsx`

**Files Modified:**
- `frontend/src/services/budget-service.ts` - getBudgetTracking()
- `frontend/src/pages/Budget.tsx` - Fetch tracking data
- `frontend/src/components/budget/budget-allocation-list.tsx` - Tracking progress bars
- `frontend/src/components/layout/Header.tsx` - Dark mode styles + ThemeToggle
- `frontend/src/components/ui/Card.tsx` - Dark mode styles
- `frontend/src/components/ui/Button.tsx` - Dark mode variants
- `frontend/src/components/ui/Input.tsx` - Dark mode styles
- `frontend/src/components/ui/Select.tsx` - Dark mode styles
- `frontend/tailwind.config.js` - darkMode: 'class'
- `frontend/src/index.css` - Dark body styles
- `frontend/src/main.tsx` - ThemeProvider wrapper
- `public/locales/{en,ja,vi}/common.json` - Translations

---

## Short-Term Roadmap (v0.2.0 - v0.5.0)

### v0.2.0 - Production Readiness ✅ COMPLETE

**Timeline:** 1-2 weeks
**Priority:** High
**Dependencies:** None
**Status:** ✅ Deployed to https://money.khanh.page

#### Features

**Deployment Infrastructure:**
- [x] Docker Compose configuration ✅
  - Backend container (FastAPI + Gunicorn)
  - Frontend container (Nginx static serve)
  - PostgreSQL container with volume persistence
  - Network configuration
- [x] Environment variable management ✅
  - .env.example template
  - Secrets handling (database credentials)
  - CORS configuration
- [x] PostgreSQL migration ✅
  - Alembic migration scripts
  - Data migration tool (SQLite → PostgreSQL)
  - Connection pooling configuration
- [ ] Backup automation
  - pg_dump cron job (daily)
  - Backup retention policy (7 days)
  - Remote backup sync (rsync/rclone)

**Production Error Handling:**
- [ ] Error message sanitization (no stack traces in production)
- [ ] Structured logging (JSON format)
- [ ] Health check endpoint (/api/health)
- [ ] Graceful shutdown handling
- [ ] Database connection retry logic

**Documentation:**
- [ ] VPS deployment guide (Hetzner, DigitalOcean)
- [ ] Docker deployment instructions
- [ ] Backup/restore procedures
- [ ] Troubleshooting guide

#### Success Criteria

- [ ] Single command deployment (`docker compose up -d`)
- [ ] Automated daily backups verified
- [ ] Production error logs structured (JSON)
- [ ] Health check returns 200 OK
- [ ] PostgreSQL migration tested with 10k+ transactions

#### Risks

- **High:** PostgreSQL migration data loss → Mitigation: Backup verification
- **Medium:** Docker networking issues → Mitigation: Pre-tested compose file

---

### v0.3.0 - Enhanced Analytics (In Progress)

**Timeline:** 2-3 weeks
**Priority:** High
**Dependencies:** v0.2.0 (database must be stable)

#### Features

**Transaction Management UI:**
- [x] Edit transaction modal ✅
  - Update amount, category, description, notes
  - Validation (amount > 0, required fields)
- [x] Delete transaction with confirmation ✅
- [x] Create new transaction UI ✅
- [ ] Bulk operations
  - Select multiple transactions (checkboxes)
  - Bulk delete, bulk recategorize

**Advanced Filtering:**
- [x] Date range picker (start/end dates) ✅
- [ ] Multiple category selection (multi-select dropdown)
- [ ] Amount range filter (min/max)
- [ ] Search by description (full-text search)
- [ ] Save filter presets

**Export Functionality:**
- [x] Export transactions to CSV ✅ (2025-11-24)
- [ ] Export transactions to JSON
- [ ] Export monthly report (PDF)
  - Summary statistics
  - Category breakdown chart
  - Transaction list
- [ ] Excel format support (.xlsx)

**Budget Tracking:**
- [x] Create monthly budgets by category ✅ (2025-11-25)
- [x] Interactive budget editing (swipe gestures) ✅ (2025-11-25)
- [x] Budget draft mode ✅ (2025-11-25)
- [x] Save budget button ✅ (2025-11-25)
- [x] Budget vs actual comparison ✅ (2025-11-26)
- [x] Budget alerts (when approaching limit) ✅ (backend ready)
- [ ] Budget carry-over (unused → next month)

**Spending Trends:**
- [ ] Year-over-year comparison chart
- [ ] Month-over-month growth rates
- [ ] Spending velocity analysis (daily average)
- [ ] Category trend heatmap

#### Success Criteria

- [ ] Transaction edit saves in <200ms
- [ ] Advanced filters return results <500ms
- [ ] PDF export generates in <3s
- [ ] Budget alerts trigger correctly (95%+ threshold)

#### Technical Improvements

- [ ] Full-text search index on transaction descriptions
- [ ] PDF generation library (ReportLab/WeasyPrint)
- [ ] Excel export library (openpyxl)

---

### v0.4.0 - User Experience Enhancements

**Timeline:** 3-4 weeks
**Priority:** Medium
**Dependencies:** v0.3.0 (requires stable UI)

#### Features

**Dark Mode:**
- [x] System preference detection ✅ (2025-11-26)
- [x] Manual toggle (header button) ✅ (2025-11-26)
- [x] Persistent preference (localStorage) ✅ (2025-11-26)
- [ ] Color palette for dark theme
- [ ] Chart color adjustments

**Mobile Responsive Improvements:**
- [ ] Touch-optimized charts (pinch zoom, swipe)
- [ ] Mobile navigation drawer
- [ ] Simplified mobile dashboard layout
- [ ] Bottom navigation bar (mobile)
- [ ] Gesture controls (swipe to delete transaction)

**Keyboard Shortcuts:**
- [ ] `Ctrl+U` - Upload CSV
- [ ] `Ctrl+N` - New transaction
- [ ] `Ctrl+F` - Focus search
- [ ] `Ctrl+K` - Command palette
- [ ] `Esc` - Close modal
- [ ] `?` - Show shortcuts help

**Bulk Transaction Operations:**
- [ ] Bulk import from multiple CSV files
- [ ] Bulk recategorize by pattern
  - Example: "Amazon" → "Shopping"
- [ ] Bulk tag transactions
- [ ] Undo bulk operations

**Category Customization UI:**
- [ ] Add custom categories
- [ ] Edit category names/colors
- [ ] Category hierarchy (parent/child)
- [ ] Category icons
- [ ] Import/export category mappings

#### Success Criteria

- [ ] Dark mode toggle <100ms
- [ ] Mobile dashboard loads <1s on 4G
- [ ] Keyboard shortcuts 100% functional
- [ ] Bulk recategorize 1000 transactions <2s
- [ ] Custom category saved persistently

#### Technical Improvements

- [ ] CSS-in-JS for theme switching
- [ ] Service worker for offline support
- [ ] Keyboard event handler system
- [ ] Local storage abstraction layer

---

### v0.5.0 - Data Quality & Intelligence

**Timeline:** 4-5 weeks
**Priority:** Medium
**Dependencies:** v0.4.0 (requires mature dataset)

#### Features

**Transaction Categorization Suggestions (ML):**
- [ ] Train classifier on historical data
  - Model: Naive Bayes or logistic regression
  - Features: description keywords, amount range, source
- [ ] Suggest category during CSV import
  - Confidence score (low/medium/high)
- [ ] Learn from user corrections
  - Incremental model updates
- [ ] Manual category mapping rules UI
  - Keyword → category mappings
  - Regex pattern support

**Duplicate Detection Improvements:**
- [ ] Fuzzy matching (Levenshtein distance)
  - Similar descriptions (90% similarity)
- [ ] Amount tolerance (±¥10)
- [ ] Date range tolerance (±2 days)
- [ ] Merge duplicate detection report
- [ ] Auto-merge duplicates (optional)

**Data Import/Export:**
- [ ] Import from JSON
- [ ] Import from custom CSV formats
  - User-defined column mappings UI
- [ ] Export full database backup (JSON)
- [ ] Selective export (date range, categories)

**Category Mapping Rules Engine:**
- [ ] Define rules: "IF description CONTAINS 'Amazon' THEN category = 'Shopping'"
- [ ] Rule priority (order of application)
- [ ] Rule testing/preview
- [ ] Import/export rules (JSON)

#### Success Criteria

- [ ] ML categorization accuracy >80%
- [ ] Duplicate detection recall >95%
- [ ] Custom CSV format import success rate >90%
- [ ] Rules engine applies 1000 rules <1s

#### Technical Improvements

- [ ] scikit-learn integration (ML models)
- [ ] TF-IDF vectorization for descriptions
- [ ] Fuzzy matching library (fuzzywuzzy)
- [ ] Rules engine (Python rules library)

---

## Mid-Term Roadmap (v0.6.0 - v1.0.0)

### v0.6.0 - Multi-Source Support

**Timeline:** Q2 2025 (6-8 weeks)
**Priority:** Medium
**Dependencies:** v0.5.0 (requires flexible CSV parser)

#### Features

**Additional CSV Format Support:**
- [ ] Credit card statements (Visa, Mastercard, Amex)
- [ ] Bank statements (MUFG, Mizuho, Sumitomo)
- [ ] E-wallet exports (PayPay, LINE Pay, Rakuten Pay)
- [ ] Format auto-detection (heuristic analysis)

**API Integrations (if available):**
- [ ] MoneyForward API integration
- [ ] Zaim API integration
- [ ] Bank API connections (plaid.com equivalent)
- [ ] OAuth authentication for third-party services

**Manual Transaction Entry Improvements:**
- [ ] Quick entry form (minimal fields)
- [ ] Transaction templates (recurring expenses)
- [ ] Recently used categories (autocomplete)
- [ ] Voice input (mobile)

**Receipt Scanning (OCR):**
- [ ] Upload receipt image
- [ ] Extract amount, merchant, date (Tesseract OCR)
- [ ] Suggest category based on merchant
- [ ] Attach receipt image to transaction

#### Success Criteria

- [ ] Support 10+ CSV formats
- [ ] OCR accuracy >85% (amount/date/merchant)
- [ ] Manual entry <10s per transaction
- [ ] Receipt image storage <1MB per file

---

### v0.7.0 - Advanced Goals

**Timeline:** Q2-Q3 2025 (6-8 weeks)
**Priority:** Low
**Dependencies:** v0.6.0

#### Features

**Variable Savings Goals:**
- [ ] Milestone-based goals (e.g., 25%, 50%, 75%, 100%)
- [ ] Non-linear goal curves (exponential, logarithmic)
- [ ] Seasonal adjustments (higher spending in December)

**Milestone Tracking:**
- [ ] Define milestones (e.g., "Save ¥1M for emergency fund")
- [ ] Notification when milestone reached
- [ ] Milestone celebration animations

**Goal Templates:**
- [ ] Predefined goals (emergency fund, house down payment, retirement)
- [ ] Community-shared goal templates
- [ ] Import/export goals (JSON)

**Scenario Modeling:**
- [ ] "What if" calculator
  - "What if I save ¥10,000 more per month?"
  - "What if expenses increase by 10%?"
- [ ] Goal achievement probability (Monte Carlo simulation)
- [ ] Risk analysis (volatility in savings rate)

#### Success Criteria

- [ ] Non-linear goal projection accuracy >90%
- [ ] Milestone notifications <1s delay
- [ ] Scenario simulation runs <2s

---

### v0.8.0 - Insights & Predictions

**Timeline:** Q3 2025 (8-10 weeks)
**Priority:** Low
**Dependencies:** v0.7.0 (requires mature analytics)

#### Features

**Spending Pattern Analysis:**
- [ ] Identify recurring expenses (auto-detect subscriptions)
- [ ] Anomaly detection (unusual spending)
- [ ] Category spending trends (increasing/decreasing)
- [ ] Spending by day of week/time of day

**Cashflow Forecasting:**
- [ ] Predict next 3/6/12 months cashflow
- [ ] Seasonal trend analysis (ARIMA/Prophet)
- [ ] Confidence intervals (upper/lower bounds)
- [ ] Alert for predicted cashflow shortfalls

**Anomaly Detection:**
- [ ] Flag unusual transactions (amount outliers)
- [ ] Duplicate transaction warnings (same amount, same day)
- [ ] Potential fraud detection (merchant pattern changes)

**Budget Recommendations:**
- [ ] Suggest optimal budgets based on historical spending
- [ ] Identify categories to reduce (highest variance)
- [ ] Savings rate recommendations

#### Success Criteria

- [ ] Cashflow forecast accuracy (MAPE) <15%
- [ ] Anomaly detection false positive rate <5%
- [ ] Budget recommendations accepted by user >60%

#### Technical Improvements

- [ ] Time series forecasting (Prophet/ARIMA)
- [ ] Anomaly detection (Isolation Forest)
- [ ] Statistical analysis (NumPy/SciPy)

---

### v0.9.0 - Polish & Performance

**Timeline:** Q3-Q4 2025 (6-8 weeks)
**Priority:** High
**Dependencies:** v0.8.0 (requires feature completeness)

#### Features

**Frontend Optimization:**
- [ ] Code splitting by route (lazy loading)
- [ ] Tree shaking (remove unused code)
- [ ] Bundle size reduction (800KB → 500KB)
- [ ] Image optimization (WebP format)
- [ ] Service worker for caching

**Backend Optimization:**
- [ ] Redis caching layer
  - Cache monthly aggregations (5-minute TTL)
  - Cache category breakdowns
- [ ] Database query optimization
  - Analyze slow queries (pg_stat_statements)
  - Add missing indexes
- [ ] API response compression (gzip)

**Progressive Web App (PWA):**
- [ ] Service worker for offline support
- [ ] App manifest (installable)
- [ ] Push notifications (goal milestones)
- [ ] Background sync (upload CSV offline)

**Performance Monitoring:**
- [ ] Frontend performance tracking (Web Vitals)
- [ ] Backend response time monitoring (Prometheus)
- [ ] Error tracking (Sentry)
- [ ] User analytics (self-hosted Plausible)

#### Success Criteria

- [ ] Bundle size <500KB (gzipped)
- [ ] Dashboard loads <300ms (cached)
- [ ] API p95 response time <200ms
- [ ] PWA installable on mobile

#### Technical Improvements

- [ ] Redis integration
- [ ] Prometheus metrics endpoint
- [ ] Lighthouse score >90 (all categories)

---

### v1.0.0 - Production Release

**Timeline:** Q4 2025 (Target: 2025-12-31)
**Priority:** Critical
**Dependencies:** v0.9.0 (all features complete)

#### Features

**Stability & Reliability:**
- [ ] All features stable (no critical bugs)
- [ ] Comprehensive testing (unit, integration, e2e)
- [ ] Load testing (100k+ transactions)
- [ ] Stress testing (concurrent users)

**Complete Documentation:**
- [ ] User guide (screenshots, video tutorials)
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Developer guide (contributing, setup)
- [ ] Architecture decision records (ADRs)

**Migration Guides:**
- [ ] Upgrade guides (v0.x → v1.0)
- [ ] Data migration scripts
- [ ] Breaking changes documentation

**Performance Targets:**
- [ ] Support 100k+ transactions
- [ ] Dashboard loads <500ms (uncached)
- [ ] API response time <100ms (p50)
- [ ] 99.9% uptime (self-hosted)

#### Success Criteria

- [ ] Zero critical bugs in production
- [ ] Test coverage >95% (all modules)
- [ ] Performance benchmarks met
- [ ] Documentation complete (user + developer)
- [ ] Security audit passed

#### Release Checklist

- [ ] All tests passing (100%)
- [ ] Code quality score ≥95
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Documentation reviewed
- [ ] Migration guide tested
- [ ] Production deployment verified
- [ ] Monitoring dashboards configured
- [ ] Backup/restore tested
- [ ] Rollback plan documented

---

## Long-Term Vision (v2.0+)

### Multi-User Support (v2.0)

**Timeline:** 2026+
**Scope:** Transform from single-user to multi-user application

#### Features

- Family accounts (shared transactions, budgets)
- User roles (admin, member, viewer)
- Transaction ownership/privacy
- Shared goals (family vacation fund)
- Activity audit log (who edited what)

#### Technical Changes

- Authentication system (OAuth2, JWT)
- Multi-tenancy database schema
- Row-level security (PostgreSQL RLS)
- User management UI
- Permission system
- Upload history persistence (per-user tracking of CSV imports)

---

### Investment Tracking (v2.1)

**Timeline:** 2026+
**Scope:** Expand beyond cashflow to investment portfolio

#### Features

- Stock/ETF portfolio tracking
- Dividend income tracking
- Asset allocation visualization
- Performance analytics (ROI, CAGR)
- Integration with brokerage APIs

#### Technical Changes

- Financial data APIs (Yahoo Finance, Alpha Vantage)
- Real-time price updates
- Investment calculation engine
- New database models (Portfolio, Asset, Transaction)

---

### Tax Preparation Assistance (v2.2)

**Timeline:** 2027+
**Scope:** Generate tax-ready reports

#### Features

- Categorize transactions by tax deductibility
- Generate income/expense summary (確定申告)
- Medical expense tracking (medical deduction)
- Business expense tracking (self-employed)
- Export tax forms (PDF)

#### Technical Changes

- Tax calculation engine (Japanese tax laws)
- PDF form generation
- Integration with e-Tax system (if API available)

---

### API for Third-Party Integrations (v2.3)

**Timeline:** 2027+
**Scope:** Public API for extensions

#### Features

- RESTful API for read/write access
- API key management
- Rate limiting
- Webhooks (transaction created, goal reached)
- Developer documentation

#### Technical Changes

- API versioning (v1, v2)
- OAuth2 provider
- API gateway (rate limiting, throttling)
- Webhook delivery system

---

### Mobile Apps (v3.0)

**Timeline:** 2027+
**Scope:** Native iOS/Android apps

#### Features

- Native mobile apps (React Native)
- Biometric authentication (Face ID, fingerprint)
- Camera integration (receipt scanning)
- Push notifications (spending alerts)
- Offline mode (sync when online)

#### Technical Changes

- React Native setup (shared codebase)
- Mobile-specific API endpoints
- Background sync workers
- App store deployment

---

## Technical Debt & Improvements

### High Priority (Complete before v0.5.0)

#### Frontend Bundle Size Optimization
- **Current:** ~800KB (gzipped)
- **Target:** <500KB (gzipped)
- **Actions:**
  - Code splitting by route (lazy loading)
  - Tree shaking (remove unused imports)
  - Replace heavy libraries (date-fns → dayjs)
  - Image optimization (WebP format)
- **Impact:** Faster load times, better mobile experience
- **Effort:** Medium (2-3 days)

#### Error Message Sanitization
- **Current:** Stack traces exposed in production
- **Target:** Generic error messages, structured logging
- **Actions:**
  - Environment-based error handling
  - Structured JSON logging (Winston/Pino)
  - Error tracking service (Sentry)
- **Impact:** Better security, easier debugging
- **Effort:** Low (1-2 days)

#### Database Connection Pooling
- **Current:** New connection per request
- **Target:** Connection pool (10-20 connections)
- **Actions:**
  - Configure SQLAlchemy pool size
  - Connection timeout settings
  - Pool monitoring
- **Impact:** Better performance under load
- **Effort:** Low (1 day)

---

### Medium Priority (Complete before v1.0.0)

#### TypeScript Strict Null Checks
- **Current:** Strict null checks disabled in some files
- **Target:** Full strict mode enabled
- **Actions:**
  - Enable `strictNullChecks` in tsconfig.json
  - Fix type errors (optional chaining, nullish coalescing)
  - Update component props (required vs optional)
- **Impact:** Fewer runtime errors, better type safety
- **Effort:** Medium (3-5 days)

#### API Response Caching
- **Current:** No caching, all requests hit database
- **Target:** Redis cache for hot data
- **Actions:**
  - Redis integration
  - Cache monthly aggregations (5-minute TTL)
  - Cache invalidation strategy
- **Impact:** Faster API responses, reduced database load
- **Effort:** Medium (3-5 days)

#### Component Testing Coverage
- **Current:** 95%+ backend coverage, minimal frontend tests
- **Target:** 80%+ frontend component coverage
- **Actions:**
  - React Testing Library setup
  - Test critical components (Dashboard, UploadDropZone)
  - E2E tests (Playwright/Cypress)
- **Impact:** Fewer UI regressions, confidence in refactoring
- **Effort:** High (1-2 weeks)

---

### Low Priority (Post v1.0.0)

#### Internationalization (i18n) ✅ COMPLETE
- **Current:** ~~Japanese only (hardcoded strings)~~ Multi-language support
- **Target:** Multi-language support (Japanese, English)
- **Status:** ✅ Implemented with Japanese, English, Vietnamese
- **Actions:**
  - ✅ i18next integration
  - ✅ Extract all strings to translation files
  - ✅ Language switcher UI
- **Impact:** Broader user base
- **Effort:** High (2-3 weeks)

#### Accessibility Audit (WCAG AA)
- **Current:** Basic accessibility (semantic HTML)
- **Target:** WCAG AA compliance
- **Actions:**
  - Keyboard navigation audit
  - Screen reader testing
  - Color contrast audit
  - ARIA labels
- **Impact:** Inclusive for all users
- **Effort:** Medium (1 week)

#### Performance Monitoring
- **Current:** No monitoring, manual testing
- **Target:** Automated performance tracking
- **Actions:**
  - Prometheus metrics endpoint
  - Grafana dashboards
  - Alerting (slow queries, high error rate)
- **Impact:** Proactive issue detection
- **Effort:** Medium (1 week)

---

## Milestones & Timeline

### 2024 Q4: Foundation ✅

**Status:** Complete
**Duration:** 8-10 weeks
**Key Deliverables:**
- ✅ Research & planning (specs, architecture)
- ✅ Backend API (models, routes, services)
- ✅ Frontend UI (components, pages, charts)
- ✅ CSV parser (Shift-JIS support)
- ✅ Goal tracking algorithm
- ✅ Comprehensive testing (89 tests)
- ✅ Documentation (15+ docs)

**Lessons Learned:**
- Pandas CSV parsing works well for Japanese encodings
- SHA-256 hash effective for duplicate detection
- Linear projection sufficient for MVP goal tracking
- Recharts suitable for interactive charts

---

### 2025 Q1: Production Readiness

**Target Date:** 2025-03-31
**Status:** Pending
**Duration:** 10-12 weeks
**Key Deliverables:**
- [ ] Docker Compose deployment (v0.2.0)
- [ ] PostgreSQL migration
- [ ] Enhanced analytics & filtering (v0.3.0)
- [ ] Transaction editing UI
- [ ] Export functionality (CSV, JSON, PDF)
- [ ] Budget tracking

**Success Metrics:**
- Single command deployment working
- PostgreSQL migration tested with 10k+ transactions
- Budget alerts triggering correctly
- PDF export generates in <3s

**Risks:**
- PostgreSQL migration complexity → Pre-test with sample data
- Docker networking issues → Use proven compose template

---

### 2025 Q2: User Experience

**Target Date:** 2025-06-30
**Status:** Pending
**Duration:** 12-14 weeks
**Key Deliverables:**
- [ ] Dark mode & mobile improvements (v0.4.0)
- [ ] Keyboard shortcuts
- [ ] Category customization UI
- [ ] Data quality enhancements (v0.5.0)
- [ ] ML categorization suggestions
- [ ] Multi-source CSV support (v0.6.0)

**Success Metrics:**
- Dark mode toggle <100ms
- ML categorization accuracy >80%
- Mobile dashboard loads <1s on 4G
- OCR accuracy >85% (receipt scanning)

**Risks:**
- ML model accuracy low → Use rule-based fallback
- OCR quality poor → Manual entry as backup

---

### 2025 Q3: Advanced Features

**Target Date:** 2025-09-30
**Status:** Pending
**Duration:** 12-14 weeks
**Key Deliverables:**
- [ ] Advanced goals & milestones (v0.7.0)
- [ ] Insights & predictions (v0.8.0)
- [ ] Cashflow forecasting
- [ ] Anomaly detection
- [ ] Performance optimization (v0.9.0)
- [ ] PWA support

**Success Metrics:**
- Cashflow forecast accuracy (MAPE) <15%
- Anomaly detection false positive rate <5%
- Bundle size <500KB (gzipped)
- PWA installable on mobile

**Risks:**
- Forecasting accuracy low → Reduce forecast horizon
- Performance optimization insufficient → Profile and optimize queries

---

### 2025 Q4: Production Release

**Target Date:** 2025-12-31
**Status:** Pending
**Duration:** 10-12 weeks
**Key Deliverables:**
- [ ] Stability & bug fixes (v1.0.0)
- [ ] Complete documentation
- [ ] Load testing (100k+ transactions)
- [ ] Security audit
- [ ] Migration guides
- [ ] Monitoring dashboards

**Success Metrics:**
- Zero critical bugs in production
- Test coverage >95%
- Performance benchmarks met
- 99.9% uptime achieved

**Risks:**
- Critical bugs discovered late → Allocate 2 weeks for bug fixing
- Load testing reveals bottlenecks → Optimize before release

---

## Success Metrics

### Version-Specific Targets

#### v0.1.0 (Current) ✅
- ✅ Test coverage: 95%+ (achieved)
- ✅ Code quality: 92/100 (achieved)
- ✅ Dashboard load: <500ms (achieved)
- ✅ All tests passing: 89/89 (achieved)

#### v0.2.0 (Production Readiness)
- [ ] Deployment time: <10 minutes (docker compose up)
- [ ] Backup success rate: 100% (automated daily)
- [ ] Health check uptime: 99.9%
- [ ] PostgreSQL migration success: 100% (no data loss)

#### v0.3.0 (Enhanced Analytics)
- [ ] Transaction edit save time: <200ms
- [ ] Advanced filter response time: <500ms
- [ ] PDF export generation time: <3s
- [ ] Budget alert accuracy: 95%+

#### v0.4.0 (User Experience)
- [ ] Dark mode toggle time: <100ms
- [ ] Mobile dashboard load (4G): <1s
- [ ] Keyboard shortcuts functional: 100%
- [ ] Bulk operation speed (1000 txns): <2s

#### v0.5.0 (Data Quality)
- [ ] ML categorization accuracy: >80%
- [ ] Duplicate detection recall: >95%
- [ ] Custom CSV import success rate: >90%
- [ ] Rules engine speed (1000 rules): <1s

#### v1.0.0 (Production Release)
- [ ] Zero critical bugs in production
- [ ] Test coverage: >95% (all modules)
- [ ] Dashboard load (uncached): <500ms
- [ ] API p50 response time: <100ms
- [ ] Support 100k+ transactions

---

### Product-Wide KPIs

#### Performance
- **Dashboard Load Time:** <500ms (current), target <300ms (v1.0)
- **API Response Time (p50):** <100ms (target v1.0)
- **API Response Time (p95):** <200ms (target v1.0)
- **CSV Upload Speed:** 10k rows in <2s (current)
- **Database Query Time:** <100ms (monthly aggregation)

#### Quality
- **Test Coverage:** 95%+ (current), target >95% (v1.0)
- **Code Quality Score:** 92/100 (current), target ≥95 (v1.0)
- **Bug Escape Rate:** Target <1% (post v1.0)
- **Security Vulnerabilities:** Zero critical (always)

#### User Experience (Post-Launch Metrics)
- **Import Success Rate:** Target 99%+ (CSV parsing)
- **Dashboard Engagement:** Target 5+ page views per session
- **Feature Adoption:** Target 80%+ (goal creation)
- **Error Rate:** Target <0.1% (user-facing errors)

#### Reliability
- **Uptime:** Target 99.9% (v1.0, self-hosted)
- **Data Loss:** Zero (backup verification)
- **Duplicate Detection Accuracy:** 100% (SHA-256 hash)
- **Currency Precision:** Zero errors (BIGINT storage)

---

## Risk Management

### High-Risk Items

#### Risk: PostgreSQL Migration Data Loss
- **Impact:** Critical (user data loss)
- **Probability:** Low (5%)
- **Mitigation:**
  - Pre-migration backup verification
  - Dry-run migration with test data
  - Automated migration script with rollback
  - Post-migration data validation (row counts, checksums)
- **Owner:** Backend Developer
- **Timeline:** v0.2.0

#### Risk: CSV Format Changes (MoneyForward/Zaim)
- **Impact:** High (import failures)
- **Probability:** Medium (30%)
- **Mitigation:**
  - Flexible column mapping (handles variations)
  - Version detection (format fingerprinting)
  - User-defined mapping UI (v0.5.0)
  - Community-contributed format definitions
- **Owner:** CSV Parser Maintainer
- **Timeline:** Ongoing

#### Risk: Performance Degradation at Scale
- **Impact:** High (poor user experience)
- **Probability:** Medium (40%)
- **Mitigation:**
  - Load testing (100k+ transactions)
  - Database indexing strategy
  - Query optimization (EXPLAIN ANALYZE)
  - Caching layer (Redis, v0.9.0)
- **Owner:** Performance Engineer
- **Timeline:** v0.9.0 - v1.0.0

---

### Medium-Risk Items

#### Risk: ML Categorization Accuracy Low
- **Impact:** Medium (reduced feature value)
- **Probability:** Medium (50%)
- **Mitigation:**
  - Rule-based fallback system
  - User feedback loop (learn from corrections)
  - Manual category mapping UI
  - Start with high-confidence suggestions only
- **Owner:** ML Engineer
- **Timeline:** v0.5.0

#### Risk: Docker Deployment Complexity
- **Impact:** Medium (deployment friction)
- **Probability:** Low (20%)
- **Mitigation:**
  - Pre-tested Docker Compose template
  - Clear documentation with screenshots
  - Community support (Discord/forum)
  - Video tutorial
- **Owner:** DevOps Lead
- **Timeline:** v0.2.0

#### Risk: Frontend Bundle Size Too Large
- **Impact:** Medium (slow load times)
- **Probability:** Medium (40%)
- **Mitigation:**
  - Code splitting by route
  - Tree shaking (remove unused code)
  - Replace heavy libraries (date-fns → dayjs)
  - Monitor bundle size in CI
- **Owner:** Frontend Developer
- **Timeline:** v0.9.0

---

### Low-Risk Items

#### Risk: User Adoption Low
- **Impact:** Low (personal project)
- **Probability:** Low (10%)
- **Mitigation:**
  - User-friendly onboarding
  - Quick start guide with examples
  - Video tutorials
- **Owner:** Product Owner
- **Timeline:** Post v1.0.0

---

## Changelog

### v0.1.0 - MVP Complete (2025-11-17)

**Added:**
- CSV import system (MoneyForward, Zaim, Shift-JIS/UTF-8)
- Transaction management (CRUD, filtering, pagination)
- Cashflow analytics (monthly aggregation, category breakdown)
- Goal tracking (1/3/5/10 years, linear projection)
- Dashboard UI (KPI cards, charts, responsive design)
- Backend API (FastAPI, SQLAlchemy, 4 route modules)
- Frontend UI (React 18, TypeScript, 24 components)
- Testing (89 tests, 95%+ coverage)
- Documentation (15+ docs, architecture diagrams)

**Technical Details:**
- Python 3.11+ backend (FastAPI, SQLAlchemy)
- React 18 + TypeScript frontend (Vite, Recharts)
- SQLite database (migration to PostgreSQL planned)
- Duplicate detection (SHA-256 hash)
- Currency storage (BIGINT, no float precision issues)
- Database indexes (date, category, month_key)

**Performance:**
- Dashboard loads <500ms (1000 transactions)
- CSV upload: 10k rows in ~2s
- Monthly aggregation: <100ms
- Test coverage: 95%+

**Known Issues:**
- No transaction editing UI
- No data export functionality
- No Docker deployment
- Frontend bundle size ~800KB (target: <500KB)

---

### v0.2.2 - Budget Swipe Feature (2025-11-25) ✅

**Added:**
- Budget draft mode (AI-generated budgets not auto-saved)
- Interactive budget editing with swipe gestures
- Save budget button (draft → persistent)
- Touch + mouse support for gesture controls
- 2.5x improved swipe sensitivity (400px = 100% change)
- Visual feedback during swipe (scale, ring, pulse)
- "Draft" badge indicator for unsaved budgets
- Regenerate budget with user feedback
- Multi-language support (EN, JA, VI)

**Fixed:**
- Swipe gesture not working (bug: missing preventDefault)
- Low touch sensitivity for mobile devices
- Missing touch-action and select-none CSS properties
- Budget allocation updates now persist correctly in draft mode

**Technical Details:**
- Budget state management in React with local draft state
- Touch event handling with preventDefault()
- CSS classes for touch-none and select-none
- React Query cache invalidation on save
- i18next translations for UI strings

**Performance:**
- Swipe gesture response: <50ms
- Budget save operation: <500ms
- Production build: 3.13s
- All tests passing

**Files Modified:**
- `src/pages/Budget.tsx` - Draft state management
- `src/components/budget/budget-summary-card.tsx` - Save button implementation
- `src/components/budget/budget-allocation-list.tsx` - Swipe gesture handlers
- `public/locales/{en,ja,vi}/common.json` - Translation strings

---

### Future Versions

See [Short-Term Roadmap](#short-term-roadmap-v020---v050) and [Mid-Term Roadmap](#mid-term-roadmap-v060---v100) sections for planned features.

Changelog entries will be added upon release of each version.

---

## Appendix

### Release Naming Convention

- **Major version (v1.0, v2.0):** Breaking changes, major features
- **Minor version (v0.1, v0.2):** New features, backwards compatible
- **Patch version (v0.1.1, v0.1.2):** Bug fixes, security patches

### Versioning Strategy

- **Pre-1.0:** Rapid iteration, breaking changes allowed
- **Post-1.0:** Semantic versioning, backwards compatibility
- **LTS:** v1.0 LTS (long-term support, 2 years)

### Support Policy

- **Current version:** Full support (bug fixes, security patches)
- **Previous minor version:** Security patches only (6 months)
- **Older versions:** No support (upgrade recommended)

### Contributing Guidelines

See [Code Standards](./code-standards.md) and [System Architecture](./system-architecture.md) for technical details.

---

**END OF ROADMAP**
