# SmartMoney Implementation Roadmap: Q2-Q4 2026

**Strategic Goal:** Close gaps with Tier 1 competitors (YNAB, Monarch, Copilot)
**Key Metric:** +30-40% engagement, 5-8% premium willingness-to-pay

---

## Phase 1: Foundation (Q2 2026, Weeks 1-4)

### Goal: Enable core automation + collaboration patterns

#### Week 1: Net Worth Dashboard + Recurring Detection Engine
**Sprint 1A:** Net Worth Dashboard (3-4 days)
- Create `NetWorthSnapshot` model (total assets, liabilities, date)
- Dashboard tile: show current net worth + month-over-month change
- Historical graph: 12-month trend of net worth
- Effort: Low | Dependencies: Account data (already exists)
- Test coverage: Unit tests for calculations, E2E for dashboard display

**Sprint 1B:** Recurring Transaction Detection (4-5 days)
- Analyze transaction history for patterns (same amount, similar dates, same merchant)
- Suggest recurring transactions to user
- ML model input: amount, merchant, frequency (simple heuristics first)
- UI: "We found X recurring expenses" + confirmation flow
- Effort: Medium | Dependencies: 2+ months historical data
- Test coverage: Unit tests for pattern detection, fuzzy matching

#### Week 2: Subscription Tracking & Sharing Foundation
**Sprint 2A:** Subscription Auto-Detection (3-4 days)
- Categorize recurring transactions as "subscriptions"
- Create subscription view: list with next renewal date, annual cost
- Alert system: 3 days before renewal
- Effort: Low-Medium | Dependencies: Recurring detection from Sprint 1B
- Database: Add `subscriptions` table with `renewal_date`, `annual_cost`, `merchant`

**Sprint 2B:** Shared Budgets Foundation (4-5 days)
- Create share link mechanism (JWT-based, read-only first)
- Auth: Partner login with shared link
- Partner view: read-only transaction list, budget overview, goals (no editing)
- Effort: Medium | Dependencies: Permission system design
- Database: Add `shares` table, `user_permissions` enum (viewer/editor)
- Security: IP rate limiting, expiring share links (30-day default)

#### Week 3: Basic Spending Insights
**Sprint 3:** Spending Trends + Anomalies (4-5 days)
- Month-over-month category spending comparison
- Top categories this month vs last month
- Anomaly detection: "You spent 50% more on [category] than usual"
- Alert UI: "Heads up: Restaurants spending is up this month"
- Effort: Medium | Dependencies: Historical category data
- Algorithm: Simple std-dev based outlier detection first

#### Week 4: Polish + Testing
**Sprint 4:** Integration testing, bug fixes, performance optimization
- Load testing: Net worth queries with 10k+ transactions
- E2E tests: Full sharing flow, recurring detection accuracy
- Mobile responsiveness: Dashboard on iOS/Android
- Documentation: Feature documentation, user guides

---

## Phase 2: Enrichment (Q3 2026, Weeks 5-12)

### Goal: Advanced automation + AI-driven insights

#### Week 5-6: Rules Engine & Advanced Automation
**Sprint 5:** Smart Rules Engine (8-10 days)
- Rule builder: IF [condition] THEN [action]
  - Conditions: amount > X, merchant contains Y, category = Z
  - Actions: auto-categorize, add tag, notify, split transaction
- UI: Drag-drop rule builder, enable/disable toggle
- Execution: Background job processes new transactions against rules
- Effort: High | Dependencies: Transaction model refactor
- Database: `rules` table with JSON condition/action storage
- Testing: Unit tests for rule evaluation, E2E for automation flow

**Sprint 6:** ML-Based Categorization (8-10 days)
- Model training: Use historical user transactions + categories
- Inference: Suggest category for new transactions (with confidence)
- User feedback: "Correct" predictions to improve model
- Integration: Replace manual categorization with suggestions
- Effort: High | Dependencies: Pre-trained model library (use Plaid/open-source)
- Options:
  - Local: Scikit-learn logistic regression on transaction text/amount
  - Cloud: AWS SageMaker, GCP Vertex AI, Hugging Face inference API
  - Open-source: Use pre-trained Lunch Money model (if available) or fine-tune

#### Week 7-8: Investment Portfolio Tracking
**Sprint 7:** Stock/ETF API Integration (8-10 days)
- API selection: Finnhub (free tier: 60 calls/min, stocks/ETFs/crypto)
- Model: `Investment` with ticker, quantity, purchase_price, current_price
- Dashboard: Portfolio overview, allocation pie chart, gain/loss
- Effort: Medium | Dependencies: Stock data refresh job
- Data sync: Daily update job (7 AM user's timezone), user-triggered refresh
- Database: `investments` table with daily price snapshots for charts

**Sprint 8:** Net Worth Integration + Alerts (8-10 days)
- Include investments in net worth calculation
- Alert: "Portfolio is up/down X% this month"
- Goal tracking: "On track" indicator for investment goals
- Effort: Medium | Dependencies: Sprint 7 investment data

#### Week 9-10: AI Insights & Recommendations
**Sprint 9:** Advanced Trend Analysis (8-10 days)
- Time-series decomposition: trend, seasonality, noise
- Forecasting: "Based on your patterns, you'll spend $X on rent in April"
- Insights: "Eating out spending decreased 15% year-over-year"
- Effort: High | Dependencies: Historical category spending data
- Tech: Statsmodels (Python), visualization with Recharts

**Sprint 10:** AI Recommendations Engine (8-10 days)
- Recommendation engine: "You could save $X/month by canceling unused subscriptions"
- Behavioral recommendations: "Your food spending spiked. Try meal planning?"
- Goal recommendations: "You're on track for your Q3 savings goal"
- Effort: High | Dependencies: Rules database, goal tracking
- Implementation: Simple rule-based first (if X, recommend Y), expand to ML

#### Week 11-12: Polish + Testing
**Sprint 11-12:** Integration, optimization, security hardening
- Load testing: Rules engine with 1000+ rules
- Performance: Investment price sync with large portfolios
- Security: API key rotation, rate limiting for stock API calls
- Documentation: API changes, feature release notes

---

## Phase 3: Market Differentiation (Q4 2026)

### Goal: Implement remaining features, position for monetization

#### Weeks 13-14: Receipt Scanning (OCR)
**Sprint 13:** Receipt Capture + OCR (8-10 days)
- UI: Camera capture modal, gallery upload
- OCR: Local (Tesseract) or cloud (AWS Textract)
- Extraction: amount, date, merchant, items
- Categorization: Apply rules engine to OCR results
- Effort: High | Dependencies: Image storage, OCR service setup
- Architecture:
  - Local: Tesseract.js (browser-side OCR, slow but private)
  - Cloud: AWS Textract (fast, costs ~$1.50/1000 documents)
  - Hybrid: Try Tesseract first, fall back to AWS if confidence < 70%

**Sprint 14:** Receipt Organization + Tagging (6-8 days)
- Receipt storage: Organize by date, searchability
- Tagging: Tax category, receipt type (food, utilities, entertainment)
- Export: Receipt bundle for tax filing
- Effort: Medium | Dependencies: Sprint 13

#### Weeks 15-16: Expense Splitting (for Q1 2027 launch)
**Sprint 15:** Group Expense Tracking (8-10 days)
- Group creation: Add friends/family, set payment method
- Split logic: Equal split, custom amounts, percentage split
- Settlement: Calculate who owes whom, suggest payment order
- Effort: Medium-High | Dependencies: User management, notifications
- Database: `groups`, `group_members`, `split_transactions`

**Sprint 16:** Payment Integration + Notifications (8-10 days)
- Payment integration: Venmo, PayPal, Square Cash API
- Notifications: SMS/email when settlement due
- Effort: High | Dependencies: Payment processor setup, compliance

#### Weeks 17-20: Premium Features + Monetization
**Sprint 17:** Premium Tier Design (4 days)
- Tier 1 (Free): Basic tracking, dashboard, bill reminders
- Tier 2 ($5/mo): Automation rules, receipts, investment tracking
- Tier 3 ($15/mo): AI insights, expense splitting, API access
- Paywall: Feature gating, upgrade prompts, trial periods
- Effort: Medium | Dependencies: Billing system integration

**Sprint 18:** Billing System (6-8 days)
- Stripe/Paddle integration: Subscriptions, invoicing, VAT handling
- User dashboard: Manage subscription, billing history, usage stats
- Effort: Medium | Dependencies: Stripe API setup, compliance
- Testing: PCI compliance, subscription lifecycle testing

**Sprint 19:** Japan Market Localization (8-10 days)
- Language: Full Japanese UI polish (already have i18n)
- Tax categories: Align with Japanese tax year (March-April fiscal)
- Category defaults: MoneyForward-compatible categories
- Payment: Support Japanese payment methods (Stripe, PayPay)
- Effort: Medium | Dependencies: Localization testing
- Testing: Native Japanese speakers for UX review

**Sprint 20:** Marketing + Launch Prep (4 days)
- Feature release documentation
- Comparison table vs. MoneyForward, Zaim, YNAB
- Launch blog post: "SmartMoney 1.0: Automation Meets Privacy"
- Social media: Feature announcement, demo videos

---

## Feature Prioritization Matrix

### Must Have (MVP for Premium Tier)
- [x] Net Worth Dashboard
- [x] Recurring Detection
- [x] Subscription Tracking
- [x] Rules Engine
- [x] Basic Insights
- [ ] Investment Tracking (high priority)
- [ ] Shared Budgets (partner version)

### Nice to Have (Q4 2026+)
- [ ] Advanced AI Insights
- [ ] Receipt Scanning
- [ ] Expense Splitting
- [ ] Payment Integration
- [ ] Japan Market Features

### Defer (Q1 2027+)
- [ ] Custom reporting API
- [ ] Business finance tracking
- [ ] Tax optimization engine
- [ ] International market expansion

---

## Technical Debt & Architecture Decisions

### Backend Changes Required
1. **Transaction Model:** Add `is_recurring` flag, `recurring_rule_id`
2. **User Model:** Add `premium_tier` enum (free/pro/plus)
3. **Recurring Detection:** New service `RecurringDetectionService`
4. **Rules Engine:** New service `RulesEngineService`, background job execution
5. **Investments:** New model `Investment`, sync job for daily updates
6. **Database:** Schema migrations for new tables (recurring, subscriptions, shares, rules)

### Frontend Components to Build
1. `NetWorthChart` - Historical net worth visualization
2. `SubscriptionTracker` - List view, renewal alerts
3. `RulesBuilder` - Drag-drop rule creation
4. `InsightsCard` - Spending trends, anomalies
5. `PortfolioOverview` - Investment dashboard
6. `SharedBudgetView` - Partner read-only view
7. `PaywallModal` - Feature upgrade prompts

### Performance Optimization
1. **Caching:** Redis cache for recurring detection results, investment prices
2. **Indexing:** Database indexes on (user_id, date) for transaction queries
3. **Background Jobs:** Celery for async jobs (recurring detection, investment sync, rules execution)
4. **Frontend:** Code splitting for premium features, lazy load investment dashboard

---

## Risk & Mitigation

### Risk: Low API Coverage (Stock Data)
- **Impact:** Portfolio tracking incomplete for some tickers
- **Mitigation:** Start with top 1000 US stocks, expand gradually
- **Alternative:** Partner with Plaid for financial data aggregation

### Risk: OCR Quality
- **Impact:** Misread receipts, wrong categorization
- **Mitigation:** User review before commit, confidence threshold (>85%)
- **Alternative:** Start with manual camera capture, add OCR in Phase 2

### Risk: Churn on Paywall Introduction
- **Impact:** Free users leave when premium features are gated
- **Mitigation:** Grandfather free users (permanent free tier), 30-day trial before charge
- **Messaging:** "Premium helps fund development and new features"

### Risk: Japan Market Underestimation
- **Impact:** Localization insufficient, MoneyForward/Zaim maintain dominance
- **Mitigation:** User research with 20-30 Japanese users, iterate on UX
- **Alternative:** Position as "privacy alternative" rather than direct competitor

---

## Success Metrics (End of Q4 2026)

### Engagement
- D30 Retention: 8-12% (target: 3x industry avg)
- Daily Active Users: +40% vs. start of Q2
- Average Session Duration: +50% (from automation friction reduction)

### Monetization
- Premium Adoption: 5-8% (target: $X MRR)
- Churn Rate: <5% monthly
- ARPU: $X (target by Dec 2026)

### Product Quality
- Feature Completion: 80%+ (prioritized feature set)
- Bug Escape Rate: <2% (P1 bugs)
- Performance: Dashboard load <400ms, API 99% uptime

### Market Position
- Japan Market Share: 2-3% (if pursuing Japan strategy)
- Competitive Positioning: #1 on privacy + DeFi + automation for tech-savvy users
- Customer NPS: 40+ (target: 50+)

---

## Resource Requirements

### Team Composition (Estimate)
- Backend Engineers: 1.5 FTE (3/4 on features, 1/4 on infrastructure)
- Frontend Engineers: 1.5 FTE (same split)
- DevOps/QA: 0.5 FTE (shared with other projects)
- Product/Design: 0.5 FTE (shared)
- **Total:** 4 FTE

### External Services (Monthly Cost Estimate)
- AWS (Textract, Lambda, RDS): $500-800
- Stripe (2.2% + $0.30 per transaction): ~$200/mo at 5% adoption
- Stock API (Finnhub): Free-$100/mo depending on scale
- **Total:** ~$700-1100/mo

---

**Last Updated:** March 2026
**Next Review:** April 1, 2026 (Q2 Phase 1 kickoff)
**Approval:** [Awaiting stakeholder sign-off]
