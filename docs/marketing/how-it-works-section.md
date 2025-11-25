# How It Works Section - Landing Page Copy

## Section Header
```
How SmartMoney Works
From CSV upload to AI budget in 5 minutes
```

## Step 1: Self-Host (One-Time Setup)
**Deploy with Docker Compose in 30 minutes**

Run on your VPS (Hetzner, DigitalOcean) or Raspberry Pi at home. One-command deployment. No technical expertise required—just follow our guided setup.

<!-- Designer Note: Terminal screenshot showing docker compose up -d with success checkmarks -->
[Screenshot: Docker deployment terminal output]

---

## Step 2: Import Your Data
**Upload Monthly CSVs from MoneyForward/Zaim**

Drag-and-drop your CSV exports. SmartMoney auto-detects Japanese encoding (Shift-JIS), maps categories (食費→Food), and prevents duplicates with SHA-256 hashing. Process 10,000 rows in 2 seconds.

<!-- Designer Note: CSV upload interface showing file preview + success modal -->
[Screenshot: CSV upload with "342 imported, 5 duplicates skipped" confirmation]

---

## Step 3: Analyze & Track
**Visualize Cashflow, Category Breakdown, Multi-Year Goals**

Dashboard shows current month income/expenses/net, 12-month trends, category pie charts, and goal progress (1/3/5/10 years). Real-time achievability analysis tells you if goals are realistic based on your savings rate.

**Key Metrics at a Glance:**
- Current Month Net: +¥234,567
- Savings Rate: 23.4% of income
- Top Category: Food (¥89,234 / 18%)
- Goal Status: 3 Ahead, 1 On Track

<!-- Designer Note: Dashboard with KPI cards, trend chart, category pie chart -->
[Screenshot: Full dashboard view with masked amounts]

---

## Step 4: Generate AI Budget (Pay-Per-Use)
**Purchase Credits → Get Claude AI Budget in Seconds**

Buy credit packs (119k-1.2M VND). AI analyzes your 3-6 month spending history and generates personalized budgets. Pay only when you use it—average 0.36 credits per generation (~862 VND). Cheaper than a Starbucks coffee.

<!-- Designer Note: Budget generation interface with swipe controls -->
[Screenshot: AI-generated budget with category allocations and swipe-to-adjust UI]

---

## Why This Matters
> Unlike MoneyForward's ¥500/month forever subscription, SmartMoney charges ONLY when you generate budgets. Analyze your data unlimited—for free.
