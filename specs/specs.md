Cashflow Tracker Webapp – Requirements Spec
1. Overview

A personal finance webapp that allows a user to:

Upload monthly CSV files exported from finance/banking apps (e.g. Zaim, MoneyForward, card statements).

Normalize and store all transactions in a unified format.

Analyze cashflow (income, expenses, net) across months and years.

Track progress against long-term financial targets over 1, 3, 5, and 10 years (e.g. total savings goal or net cash accumulation goal).

Assume single-user, self-hosted (local or VPS) for the first version.

2. High-Level Functional Requirements

CSV Import

User can upload one or more CSV files per month.

System parses and normalizes them into a standard transaction schema.

Duplicate handling (e.g. re-upload of same month) is addressed.

Transaction Storage

All transactions stored in a database (e.g. SQLite/Postgres).

Support basic fields: date, description, amount, category, source, flags.

Cashflow Analytics

Show monthly income, expenses, and net cashflow.

Show category breakdown (Food, Housing, Baby, Shopping, Transport, etc.).

Show trends over time (e.g. line chart of net cashflow per month).

Goals & Progress Tracking

User defines targets for 1, 3, 5, and 10 years (e.g. “total cumulative savings” or “net cash position”).

App computes:

How much has been saved so far.

How much is needed per month to hit the goal.

Whether user is ahead / on track / behind.

Dashboard

Home screen with:

Current month summary.

Last 12 months trend.

Goal progress widgets for 1, 3, 5, 10 years.

Visualizations (charts) for quick understanding.

Filtering & Drilldown

Filter by:

Date range (month, quarter, year, custom).

Category / Subcategory.

Source (card/bank/app).

Drill into a category to see underlying transactions.

Basic Settings

Configure:

Currency (default: JPY).

Categories (custom add/edit).

Goal amounts for 1/3/5/10 years.

Persist settings in DB or config file.

3. User Stories
CSV Import

As a user, I want to upload a CSV export from my finance app each month so that the app can analyze my spending.

As a user, I want the system to recognize columns from Japanese CSV (e.g. 日付, 金額, 大項目, 中項目) and map them automatically to internal English fields.

As a user, if I accidentally re-upload the same file, I want the app to avoid creating duplicate transactions.

Dashboard & Analytics

As a user, I want to see my total income, total expenses, and net cashflow per month.

As a user, I want to see which categories consume the most money each month.

As a user, I want to see a chart of my net cashflow by month.

Goals

As a user, I want to set target savings amounts for 1, 3, 5, and 10 years.

As a user, I want to see how much I have already saved compared to those goals.

As a user, I want to know how much I need to save per month from now on to be on track.

Drilldown

As a user, I want to filter my transactions by category and timeframe to understand my spending behavior.

As a user, I want to quickly see all “Baby” or “Housing” expenses.

4. Data Model
4.1 Transaction

Minimum fields:

id (int, primary key)

date (date)

description (string)

amount (float, JPY; positive = income, negative = expense)

category (string, e.g. "Food")

subcategory (string, e.g. "Groceries")

source (string, e.g. "Rakuten Card", "PayPay", "SMBC")

payment_method (string, optional)

notes (string, optional)

is_income (boolean)

is_transfer (boolean) – internal transfers you want to ignore in analysis

month_key (string YYYY-MM for grouping)

4.2 Goal

id (int, primary key)

years (int; one of [1, 3, 5, 10])

target_amount (float; total amount you want to have “saved” over that horizon)

Optional: start_date (date; default = first transaction date or manual)

4.3 Settings (optional initial version)

id (int)

currency (string, default "JPY")

starting_net_worth (float, initial balance; optional)

base_date (date; when tracking begins)

5. CSV Import Requirements
5.1 Input Format(s)

Support at least one initial format (your current CSVs), for example:

Columns (Japanese app style):

日付 (date)

内容 (description)

金額（円） (amount, integer; negative = expense, positive = income)

大項目 (main category)

中項目 (sub-category)

保有金融機関 (account/bank)

振替 (0/1 for transfer)

メモ (notes)

5.2 Normalization Rules

Date → date

Parse as YYYY/MM/DD or similar.

Compute month_key = date.strftime("%Y-%m").

Amount → amount

Convert to float.

Keep sign as-is if CSV already uses negative for expenses.

Category / Subcategory

Map Japanese 大項目 to English internal categories (configurable).

Example mapping:

食費 → Food

住宅 → Housing

交通 → Transportation

こども・教育 → Baby/Education

Use a simple mapping JSON or DB table later.

Income / Transfer flags

is_income = True if category is something like “収入” or amount > 0 and not flagged as transfer.

is_transfer = True if 振替 column = 1 (or similar).

Source

From 保有金融機関 (bank/card/wallet name).

5.3 Duplicate Detection (MVP)

At import time, treat transaction as duplicate if:

Same date

Same amount

Same description

Same source

And ignore new row if already in DB.

6. Core Features (Screens / Endpoints)

You can structure this as classic server-rendered pages or API + frontend SPA. Here’s a simple view-based version.

6.1 Home / Dashboard

Route: /

Shows:

Current month summary:

Income

Expenses

Net

Last N months line chart:

Net per month

Biggest 3 categories this month (pie/bar)

Goal status cards:

1-year goal: % completed, ahead/on track/behind

3-year, 5-year, 10-year similarly

6.2 CSV Upload Page

Route: /upload

Features:

File input (one or multiple CSVs).

On submit:

Backend parses CSV(s).

Normalizes to Transaction format.

Inserts into DB with duplicate checking.

Output:

Summary of rows imported, skipped duplicates, errors.

6.3 Transactions List / Filter

Route: /transactions

Features:

Filter controls:

Start date, end date.

Category, subcategory.

Source.

Paginated list of transactions.

Aggregate summary (total income, total expenses, net for the filtered period).

6.4 Analytics Page

Route: /analytics

Features:

Choose date range: last 3 months, YTD, custom.

Show:

Income vs Expenses chart.

Category breakdown (stacked bar or pie).

Monthly trend of net cashflow.

6.5 Goals Page

Route: /goals

Features:

Form to set target amounts for:

1 year

3 years

5 years

10 years

Display:

For each horizon:

Start date (or auto from earliest transaction)

Target date = start + N years

Total net savings so far (sum of net cashflow in that horizon window)

Required average monthly savings to reach target

Status: ahead / on_track / behind

7. Calculations & Logic
7.1 Monthly Cashflow

For each month (by month_key):

income = sum(amount where is_income=true and not is_transfer)

expenses = -sum(amount where is_income=false and not is_transfer and amount < 0)

net = income - expenses

(Optionally include non-transfer positive amounts that are not flagged as income.)

7.2 Category Breakdown

For selected date range:

For each category:

category_expense = -sum(amount where category=<cat> and is_income=false and not is_transfer)

Sort descending to show top categories.

7.3 Goals / Progress

Let:

start_date = earliest transaction date or user-set base date.

now = current date.

For each goal with years = N:

target_date = start_date + relativedelta(years=N)

Total net cashflow so far (from start_date to now):

Option 1: net_so_far = sum(all income) - sum(all expenses)

Option 2 (more precise): sum of monthly net.

Implied required monthly savings:

total_target = goal.target_amount

months_total = N * 12

months_elapsed = months between start_date and now

months_remaining = max(months_total - months_elapsed, 1)

needed_total_remaining = max(total_target - net_so_far, 0)

needed_per_month = needed_total_remaining / months_remaining

Status:

Compute projected_total = net_so_far + (months_remaining * current_avg_monthly_net)

where current_avg_monthly_net = net_so_far / max(months_elapsed, 1)

If projected_total > total_target * 1.05 → ahead

If within ±5% → on_track

Else → behind

8. Non-Functional Requirements (MVP-level)

Performance:

Optimized for personal use, up to ~100k transactions.

Security:

No multi-user for v1; single-user local deployment.

No password auth necessary if used locally; optional admin password if deployed remotely.

Portability:

Should run via:

pip install -r requirements.txt

flask run (or similar)

Extensibility:

CSV mapping logic should be in one place so adding new formats is easy.

Categories mapping externalized (JSON/YAML or DB table).

9. Nice-to-Have Future Features

Not required for MVP, but good to design for:

Multiple users / family accounts.

Tagging transactions (e.g. “vacation”, “business”).

Integration with APIs (Rakuten, banks, etc.) instead of manual CSV import.

Trend-based alerts:
“Your Baby expenses are 20% higher than last month.”

Mortgage-specific analysis:
model rate hikes and required buffers.
