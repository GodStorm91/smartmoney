# SmartMoney Feature Prioritization Roadmap

## Scoring Methodology

Each feature scored on:
- **Impact:** User satisfaction + retention gain (1-5)
- **Effort:** Dev time + complexity (1-5, where 5 = hardest)
- **Alignment:** Strategic fit with SmartMoney positioning (1-5)
- **Market:** Japan/Vietnam demand signals (1-5)
- **Score:** (Impact × Alignment × Market) / Effort

---

## Phase 1: Foundation (Next 4-6 Weeks)
**Goal:** Build trust with early users; establish data portability; enable basic sharing

### P1.1: CSV Export & Data Portability
| Metric | Value |
|--------|-------|
| Impact | 4 |
| Effort | 2 |
| Alignment | 5 |
| Market | 4 |
| **Score** | **40** |

**Why:** Self-hosted users demand data ownership; differentiates from SaaS apps; vendor lock-in fear explicit in surveys

**Scope:**
- Export all transactions (CSV/JSON)
- Export accounts + budgets (CSV/JSON)
- Export goals + recurring transactions
- Importer for YNAB format
- Importer for Firefly III format
- API documentation (OpenAPI/Swagger)

**Evidence:** YNAB community built 3 tools (bank2ynab, ynab-buddy, ynab-csv) for CSV; users explicitly value portability

**Owner:** Backend API lead
**Estimate:** 60 hours
**Dependencies:** None

---

### P1.2: Spending Threshold Alerts & Notifications
| Metric | Value |
|--------|-------|
| Impact | 4 |
| Effort | 2 |
| Alignment | 4 |
| Market | 4 |
| **Score** | **32** |

**Why:** Behavioral change enabler; prevents overspending; low friction implementation

**Scope:**
- Alert when category spending > threshold (%)
- Alert for unusual transactions (amount > 2σ)
- Notification channels: email + in-app
- Time-based rules (daily/weekly/monthly)
- User preference toggles

**Evidence:** Monarch Money, Keeper Tax, alerts requested across communities; Academy Bank: "Users want alerts to prevent overspending"

**Owner:** Backend + Frontend
**Estimate:** 40 hours
**Dependencies:** Backend notification system

---

### P1.3: Goal Templates & Savings Goal Tracking
| Metric | Value |
|--------|-------|
| Impact | 4 |
| Effort | 2 |
| Alignment | 4 |
| Market | 4 |
| **Score** | **32** |

**Why:** Actual Budget 2026 roadmap lists Goals UI as #1 priority; behavior change + engagement

**Scope:**
- Goal templates: Emergency Fund, Vacation, Home, Debt Payoff, Education
- Link goals to budget categories
- Progress visualization (% complete, $ remaining)
- Target date + auto-calculate monthly savings needed
- Goal sharing (for collaborative budgets)

**Evidence:** Actual Budget "Goal templates already heavily used by many users"; YNAB core feature

**Owner:** Frontend + Backend
**Estimate:** 50 hours
**Dependencies:** Budget category system

---

## Phase 2: Engagement (6-12 Weeks)
**Goal:** Increase retention; enable household/team use; add sharing capabilities

### P2.1: Collaborative Budgeting (Multi-User + Shared Budgets)
| Metric | Value |
|--------|-------|
| Impact | 5 |
| Effort | 4 |
| Alignment | 5 |
| Market | 4 |
| **Score** | **50** |

**Why:** Shareroo 1M+ users; major use case; differentiates from YNAB free tier

**Scope:**
- Multi-user accounts (invite via email)
- Role-based access: Admin (full), Editor (view+edit), Viewer (read-only)
- Shared budgets (view reconciled state)
- Shared goals + progress tracking
- User activity log
- Offline sync conflict handling (merge strategy)
- Remove user from budget

**Evidence:** Shareroo 1M+ users; Honeydue partner alerts; Monarch Money shared goals feature

**Owner:** Full-stack team
**Estimate:** 120 hours
**Dependencies:** User authentication system; offline sync architecture

---

### P2.2: Simple Bill Splitting Module
| Metric | Value |
|--------|-------|
| Impact | 4 |
| Effort | 2 |
| Alignment | 4 |
| Market | 3 |
| **Score** | **24** |

**Why:** Vietnam high demand; Vietnam roommate culture growing; low effort, high engagement

**Scope:**
- Mark transaction as "split"
- Define split participants + percentages
- Auto-calculate who owes whom
- Suggest settlements (minimize transactions)
- Settlement history
- Integration with shared budgets

**Evidence:** Splitwise 1M+ users; Shareroo "handle split bills and settlements in one flow"; Vietnam roommate culture

**Owner:** Frontend + Backend
**Estimate:** 60 hours
**Dependencies:** Multi-user system; transaction model

---

### P2.3: Rewards/Cashback Category Tracking
| Metric | Value |
|--------|-------|
| Impact | 3 |
| Effort | 2 |
| Alignment | 4 |
| Market | 4 |
| **Score** | **24** |

**Why:** Japan high demand; credit card rewards complex; credit card users engaged

**Scope:**
- Rewards category tag system
- Annual rewards estimate (sum rewards category)
- Credit card reward metadata (% cashback, cap)
- Reward expiration tracking
- Report: rewards earned this year + projected
- Import rewards from card APIs (if available)

**Evidence:** MaxRewards, AwardWallet 700k+; Japan reward shopping culture; credit card programs complex

**Owner:** Frontend + Backend
**Estimate:** 40 hours
**Dependencies:** Category system; transaction tagging

---

### P2.4: Automation Rules Engine (Advanced)
| Metric | Value |
|--------|-------|
| Impact | 4 |
| Effort | 3 |
| Alignment | 4 |
| Market | 4 |
| **Score** | **21** |

**Why:** Actual Budget GitHub issue #508; power user feature; Japan recurring bills culture

**Scope:**
- Rule builder UI (if-then templates)
- Triggers: category overspending, unusual transaction, date-based
- Actions: notify, adjust budget, tag transaction, auto-move funds
- Rule priority + order
- Rule testing (simulate on past transactions)
- Rule disable/enable

**Evidence:** Actual Budget feature request; Monarch Money "Setting up rules"; Reddit power users

**Owner:** Frontend + Backend
**Estimate:** 80 hours
**Dependencies:** Transaction model; notification system

---

## Phase 3: Localization & Integration (12-24 Weeks)
**Goal:** Expand Japan/Vietnam markets; deepen financial integrations

### P3.1: Receipt OCR Integration (Japanese/Vietnamese)
| Metric | Value |
|--------|-------|
| Impact | 4 |
| Effort | 4 |
| Alignment | 4 |
| Market | 4 |
| **Score** | **16** |

**Why:** 3.8 hours/month time savings; high friction capture point

**Scope:**
- Integration with Google Vision API (multi-language)
- Fallback: Self-hosted Tesseract with Japanese/Vietnamese models
- Fields extracted: merchant, date, amount, category, tax
- User correction + feedback loop
- Batch upload (multiple receipts)
- Cost analysis (Google Cloud vs. Tesseract trade-offs)

**Evidence:** Real user feedback 50-60% OCR accuracy; Expensify 99%; DocuClipper 97%; Japanese text recognition critical

**Owner:** Backend + Mobile
**Effort:** 100 hours (+ ML training if self-hosted)
**Dependencies:** Cloud/API budgets; ML expertise

---

### P3.2: Cash Flow Forecasting (Linear Model)
| Metric | Value |
|--------|-------|
| Impact | 4 |
| Effort | 3 |
| Alignment | 4 |
| Market | 4 |
| **Score** | **21** |

**Why:** PocketSmith, Cash Predict, Quicken Simplifi popular; enables proactive planning

**Scope:**
- Analyze recurring transactions (identify patterns)
- Project future account balances (30 days, 90 days, 1 year)
- Include recurring expenses + income
- Handle irregular income (manual override)
- Bonus seasons (Japan salary bonus cycles)
- Visualization: line graph account balance over time
- What-if scenarios (adjust recurring amounts)

**Evidence:** PocketSmith "forecast daily balances up to 30 years"; Academy Bank "irregular income frustration"

**Owner:** Backend + Frontend
**Estimate:** 80 hours
**Dependencies:** Recurring transaction model; analytics engine

---

### P3.3: Bank Integration (Japan Focus)
| Metric | Value |
|--------|-------|
| Impact | 5 |
| Effort | 5 |
| Alignment | 5 |
| Market | 5 |
| **Score** | **25** |

**Why:** #1 complaint globally; Japan market unlock; real-time sync differentiator

**Scope:**
- Partnership with Rakuten API (Japan largest fintech)
- Integration with MUFG, SBI bank APIs
- Real-time transaction sync
- Account balance sync
- Credit card integration
- Error handling + re-auth flows
- User permission management (OAuth)

**Evidence:** SmartBank valued for "deep API integrations"; Moneytree 2500+ financial services; Monarch Money #1 complaint = sync failures

**Owner:** Full-stack team + partnerships
**Estimate:** 200+ hours (partnership negotiation not included)
**Dependencies:** Bank API agreements; OAuth implementation

---

### P3.4: Multi-Asset Portfolio Tracking (Stocks/Bonds/ETFs)
| Metric | Value |
|--------|-------|
| Impact | 4 |
| Effort | 3 |
| Alignment | 4 |
| Market | 3 |
| **Score** | **16** |

**Why:** Unify with DeFi tracking; net worth holistic view; Japan growing retail investing

**Scope:**
- Manual input: stocks, ETFs, bonds, mutual funds
- Hold quantity + cost basis
- Market price sync (Alpha Vantage, Yahoo Finance APIs)
- Gain/loss calculation + visualization
- Dividend tracking + reinvestment
- Unify with DeFi assets (total net worth dashboard)
- Tax report: capital gains/losses

**Evidence:** Kubera, Crate Ledger, AllInvestView; SmartMoney DeFi tracking existing

**Owner:** Backend + Frontend
**Estimate:** 100 hours
**Dependencies:** Existing DeFi tracking; market data API

---

## Phase 4: Advanced Features (24+ Weeks)
**Goal:** Establish premium positioning; deepen engagement; enterprise features

### P4.1: Tax Reporting & Export
| Metric | Value |
|--------|-------|
| Impact | 4 |
| Effort | 3 |
| Alignment | 3 |
| Market | 2 |
| **Score** | **9** |

**Why:** Self-employed + gig workers; freelancer positioning; recurring customer need

**Scope:**
- Tax category tagging system
- Report export formats: PDF, CSV
- Japan format (何日付の書類?, 領収書?)
- US format (Schedule C support)
- Vietnam format (Tờ khai thuế)
- Accountant export (structured JSON)

**Evidence:** Keeper Tax, Everlance, Hurdlr popular; users need "calculate total for home office, travel, supplies"

**Owner:** Backend + Frontend
**Estimate:** 80 hours
**Dependencies:** Localization team; tax expert input

---

### P4.2: Behavioral ML & Anomaly Detection
| Metric | Value |
|--------|-------|
| Impact | 3 |
| Effort | 4 |
| Alignment | 3 |
| Market | 2 |
| **Score** | **9** |

**Why:** Engagement differentiator; behavior change enabler; competitive moat

**Scope:**
- Train ML model on user spending patterns
- Detect anomalies (unusual merchants, high amounts)
- Spending habit insights (e.g., "you spent 20% more on dining last month")
- Personalized recommendations (budgets, goals)
- Privacy: on-device ML where possible

**Evidence:** Academy Bank "Apps don't solve behavioral change"; Monarch Money "Personalized reports"

**Owner:** Data science team
**Estimate:** 120+ hours
**Dependencies:** ML infrastructure; sufficient user data

---

## Roadmap Timeline

```
Q2 2026 (6 weeks)
├─ CSV Export & Data Portability (P1.1)
├─ Spending Alerts (P1.2)
└─ Goal Templates (P1.3)

Q3 2026 (12 weeks)
├─ Multi-User Budgets (P2.1)
├─ Bill Splitting (P2.2)
├─ Rewards Tracking (P2.3)
└─ Automation Rules (P2.4)

Q4 2026 - Q1 2027 (12 weeks)
├─ Receipt OCR (P3.1)
├─ Cash Flow Forecasting (P3.2)
├─ Bank Integration Japan (P3.3)
└─ Portfolio Tracking (P3.4)

Q2 2027+ (Advanced)
├─ Tax Reporting (P4.1)
└─ Behavioral ML (P4.2)
```

## Key Decisions Needed

1. **Bank Integration Priority:** Japan (Rakuten, MUFG) vs. Vietnam (Vietcombank, BIDV) vs. generic CSV importer?
2. **OCR Strategy:** Google Vision (cloud cost) vs. Tesseract (self-hosted, training)?
3. **Multi-User Sync:** Client-side merge (complex) vs. server-side conflict resolution (requires server)?
4. **Premium Tier:** Freemium (basic) vs. open-source (free with sponsorship)?

## Success Metrics

- **Feature adoption:** % of users using each feature
- **Retention:** 30-day/90-day retention by feature
- **Engagement:** Features used per active user
- **Churn:** Feature-specific cancellation analysis
- **CSAT:** User satisfaction by feature

---

**Next Step:** Schedule prioritization review with product + engineering teams to confirm Phase 1 & 2 sequencing.
