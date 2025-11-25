# Feature Showcase - Landing Page Copy

## Section Header
```
Everything You Need for Financial Clarity
Built for privacy-conscious families who want control
```

---

## Feature 1: CSV Import from Japanese Apps
**Auto-Detect Shift-JIS Encoding**

MoneyForward and Zaim export CSVs in Shift-JIS encoding (not UTF-8). Most apps display garbled characters (文字化け). SmartMoney automatically detects and converts, so your transactions always display correctly.

**Technical Details:**
- Supported: MoneyForward, Zaim (extensible to bank statements)
- Encoding: Shift-JIS, UTF-8, UTF-8-BOM auto-detection
- Duplicate Prevention: SHA-256 hash (date+amount+description+source)
- Performance: Processes 10,000 rows in 2 seconds

[Screenshot: CSV upload showing "119 imported, 5 duplicates skipped"]

---

## Feature 2: AI-Powered Budget Generation
**Personalized Budgets from Claude AI**

Don't guess your budget—generate it from actual spending. Claude AI analyzes your transaction history and suggests realistic allocations for food, housing, transport, savings, and more. Swipe to adjust any category in seconds.

**How It Works:**
1. AI reviews last 3-6 months of spending patterns
2. Identifies category averages and trends (seasonal adjustments)
3. Generates budget aligned with your income
4. Swipe gestures to adjust allocations (mobile-friendly)

**Cost Transparency:**
- Average: 0.36 credits per generation (~862 VND)
- Varies by complexity (300-1000 tokens)
- Pay-per-use (no monthly fees)

[Screenshot: Budget allocation breakdown with swipe-to-adjust interface]

---

## Feature 3: Credit-Based Payment System
**Pay Only When You Generate Budgets**

No monthly subscriptions. Buy credit packs once, use them forever. 50-1000 credits (119k-1.2M VND). Credits never expire.

**Package Comparison:**

| Package  | Credits | Price VND  | Generations | Price/Gen | Use Case                        |
|----------|---------|------------|-------------|-----------|--------------------------------|
| Starter  | 50      | 119,000    | ~138        | 862 VND   | Individuals trying SmartMoney  |
| Basic    | 120     | 249,000    | ~333        | 748 VND   | Families (Most Popular)        |
| Standard | 300     | 549,000    | ~833        | 659 VND   | Power users                    |
| Premium  | 1000    | 1,199,000  | ~2777       | 432 VND   | Financial advisors             |

**Value Proposition:**
> At 862 VND per budget, even the Starter pack lasts 11+ years of monthly budgets. Compare to MoneyForward's ¥500/month (188k VND/year) with NO AI budgets.

[Screenshot: Credit purchase page with "Most Popular" badge on Basic]

---

## Feature 4: Multi-Horizon Goal Tracking
**Track 1, 3, 5, and 10-Year Financial Goals**

Emergency fund in 1 year? House down payment in 5? Retirement in 10? Set targets for each horizon. SmartMoney calculates needed monthly savings and shows real-time achievability.

**Goal Status System:**
- 🟢 **Ahead:** Savings >5% above projection (celebrate!)
- 🟡 **On Track:** Within ±5% of target (stay consistent)
- 🔴 **Behind:** Savings <5% below projection (get actionable advice)

**Actionable Recommendations:**
> Goal Behind? SmartMoney suggests specific actions: "Cut food budget by ¥8,000/month to get back on track for your 3-year house goal. This 10% reduction is achievable based on your spending patterns."

[Screenshot: 4 goal cards showing Ahead/On Track/Behind status badges]

---

## Feature 5: Cashflow Analytics
**Monthly Breakdown with Category Insights**

See exactly where your money goes. Interactive charts show:
- Monthly income vs expenses vs net cashflow
- Category breakdown (食費, 住宅, 交通費)
- 12-month trend lines (spot seasonal patterns)
- Source analysis (which accounts spend most?)

**Dashboard Metrics:**
- Current Month Net: +¥234,567 (green if positive, red if negative)
- Savings Rate: 23.4% of income
- Top Expense Category: Food (¥89,234, 18% of total)
- Average Monthly Net: +¥187,342 (trailing 6 months)

[Screenshot: Trend chart + category pie chart + KPI cards]

---

## Feature 6: Self-Hosted Privacy
**Your Data Never Leaves Your Server**

No cloud sync. No third-party access. No data breaches. SmartMoney runs on YOUR infrastructure (VPS, home server, Raspberry Pi). You control who sees your transactions.

**Privacy Guarantees:**
- 100% local SQLite/PostgreSQL database
- No external API calls (except AI budget generation when YOU choose)
- No tracking, no analytics, no ads
- Open-source code (transparency)

**Security Features:**
- JWT authentication (single-user MVP, multi-user v2.0)
- HTTPS/SSL via Let's Encrypt
- Database encryption at rest (optional)
- Automated backups (pg_dump cron job)

[Screenshot: System architecture diagram with "No Cloud ❌" label]

---

## Feature 7: Multi-Currency Support
**JPY, USD, VND with Manual Exchange Rates**

Work in Japan but have savings in USD? Track investments in multiple currencies. SmartMoney displays equivalent values and aggregates net worth across currencies using your specified exchange rates.

**Supported Currencies:**
- JPY (¥) - Primary for Japanese users
- USD ($) - International savings
- VND (₫) - Vietnamese expats

**Exchange Rate Updates:**
- Manual entry (user-controlled, privacy-first)
- Optional API integration (future feature)

[Screenshot: Account list showing balances in mixed currencies with aggregated net worth]

---

## Feature 8: Budget Tracking (Real-Time Progress)
**Budget vs Actual with Visual Alerts**

Set monthly budgets per category. See real-time progress bars showing how much you've spent vs your limit. Know immediately if you're overspending before the month ends.

**Visual Alerts:**
- 80% threshold: Orange badge "You've spent ¥72,000 of ¥90,000 food budget (80%)"
- 100% threshold: Red badge "Food budget exceeded! ¥95,000 / ¥90,000 (105%)"

**Interactive Editing:**
- Swipe gestures to adjust allocations (mobile)
- Draft mode (regenerate without saving)
- Save button to persist changes

[Screenshot: Budget summary with progress bars and alert badges]
