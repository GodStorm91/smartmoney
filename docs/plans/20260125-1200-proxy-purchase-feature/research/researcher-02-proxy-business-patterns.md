# Proxy Purchase Business Tracking: Best Practices Research

**Date:** 2026-01-25 | **Status:** Complete | **Lines:** 142

## Executive Summary

Proxy purchase (代行購入) businesses require hybrid accounting treating them as service + resale operations. Core challenge: tracking customer advances, cost basis, and profit separately from personal expenses. Leading solutions integrate receivables management with inventory tracking.

---

## 1. Proxy Purchase Business Model (代行購入)

### Core Operations
- Act as intermediary between foreign buyers and Japanese retailers (Mercari, Amazon JP, Rakuten)
- Receive advance payment → purchase → inspect → ship internationally
- Handling fees + markup on cost basis = revenue
- Warehouse staging required before export

### Accounting Impact
- **Advance Payment:** Received deposit = Accounts Receivable (liability until delivery complete)
- **Cost Basis:** Purchase price trackable to specific customer orders (not shared inventory)
- **Fee Recognition:** Service fees recognized on delivery/shipment confirmation
- **Currency Risk:** Multi-currency transactions must normalize to reporting currency (JPY)

---

## 2. Receivables Management Patterns

### Best Practice Structure (per Quicken, Wave, QuickBooks)

**1. Customer Invoicing**
- Pre-delivery invoice with itemized costs + service fee
- Track invoice due dates and payment status
- Automatic reminder system essential (7/14/30 day intervals)

**2. Payment Reconciliation**
- Match received payment to advance deposit
- Mark invoice paid when funds received
- Track partial/deferred payments separately

**3. Aging Analysis**
- Report 0-30, 30-60, 60+ day outstanding invoices
- Flag overdue payments for follow-up
- Monthly aging report identifies cash flow risks

### Software Implementation
- **Wave** (free): Basic invoicing, payment tracking, reconciliation
- **Quicken Business & Personal:** Handles mixed business/personal, up to 10 business entities
- **Bill.com:** Advanced receivables with automated payment reminders
- **Expensify:** Integrates personal & business receipt scanning

---

## 3. Profit Tracking & Side Business Reporting

### Cost Basis Tracking (Critical for Resellers)

**FIFO Method (Recommended for proxy purchases):**
- Track purchase date, supplier, unit cost for each order
- Earliest costs applied first → lower COGS when prices rise
- Results in higher reported profit (attractive for growth metrics)

**Inventory Accounting Methods:**
| Method | When to Apply | Tax Impact |
|--------|---------------|-----------|
| Cash Inventory | When inventory sold | Expense recognized at purchase |
| Accrual Inventory | Per accounting standards | Expense recognized at sale |
| Cost Basis (FIFO) | Standard for resellers | More accurate profit tracking |

### Profit Calculation
```
Revenue = (Advance Payment - Cost) + Service Fee
Cost = Item Purchase Price + Shipping + Handling
Gross Profit Margin = (Revenue - Cost) / Revenue × 100%
```

### Tracking Key Metrics
- Per-customer profitability (identify high/low margin buyers)
- Supplier cost benchmarking (optimize sourcing)
- Service fee adequacy (adjust for market rates)
- Payment collection rate (track vs. benchmark)

---

## 4. Separating Business vs. Personal Transactions

### Database Schema Requirements

**Transaction Tags:**
- `category_type`: "business" | "personal" | "mixed"
- `business_entity_id`: Link to specific side business
- `customer_id` (business only): Accounts receivable tracking
- `cost_basis_price` (business only): Original purchase price
- `business_purpose`: "purchase_fulfillment" | "service_fee" | "overhead"

**Budget Segregation:**
- **Personal Budget:** Ignore business-tagged transactions
- **Business Dashboard:** Filter by `business_entity_id`
- **Tax Report:** Aggregate by category_type + tax classification

### Implementation Patterns

**Option 1: Dual Account Approach** (Recommended)
- Business checking account → all proxy purchases flow through
- Personal account → personal expenses
- API auto-categorization based on account source
- Simpler reconciliation, clear audit trail

**Option 2: Transaction Tagging**
- Single account with business/personal tagging on each transaction
- Requires disciplined data entry
- More flexible but audit-prone

**Option 3: Sub-ledger Tracking**
- Main ledger shows net
- Sub-ledger maintains detailed business transaction log
- SmartMoney approach: extend existing transaction model

---

## 5. SmartMoney Implementation Roadmap

### Phase 1: Core Tracking (MVP)
- Add `business_entity_id` to Transaction model
- Create BusinessEntity type: `{ id, name, type: "proxy_purchase" | "freelance" | "resale" }`
- Add category_type enum to distinguish business/personal
- UI: Toggle to show/hide business transactions in budget view

### Phase 2: Receivables (P1 Feature)
- Create `CustomerInvoice` model tracking advances + payment status
- Link Invoice → Customer → Business Entity
- Payment reconciliation workflow
- Aging report (30/60/90 day buckets)

### Phase 3: Profit Analytics (P2 Feature)
- Cost basis tracking for inventory
- FIFO calculation for multiple purchases of same item
- Profit dashboard by customer/time period
- Monthly side-business P&L report

### Schema Extensions
```
CustomerInvoice {
  id, business_entity_id, customer_name, customer_email
  invoice_date, due_date, amount_due
  payment_received_date, amount_received
  status: "draft" | "sent" | "paid" | "overdue"
  items: [{ description, cost, service_fee, quantity }]
}

Transaction {
  ...existing fields...
  business_entity_id: Optional[UUID]
  category_type: "business" | "personal" | "mixed"
  invoice_id: Optional[UUID]  # Link to CustomerInvoice
  cost_basis_price: Optional[Decimal]  # For resales
}
```

---

## 6. Key Insights & Actionable Recommendations

### Critical Success Factors
1. **Advance Payment Tracking:** Without separate receivables model, cash flow is opaque
2. **Cost Basis Discipline:** One missing purchase record breaks profit calculations
3. **Multi-Currency Normalization:** Convert all transactions to JPY at entry time
4. **Business/Personal Boundary:** Unclear segregation invalidates both budgets and tax filing

### Metrics to Track
- Days Sales Outstanding (DSO): Payment collection efficiency
- Gross Profit Margin by Customer: Identify underpriced services
- Inventory Turnover: How quickly orders ship after purchase
- Business Expense Ratio: Overhead as % of revenue

### Regulatory Considerations (Japan)
- 代行購入 services likely require business registration if exceeding ¥1M annually
- Consumption tax implications when reselling to Japanese domestic buyers
- Income tax requirements for side business ≥¥20K profit
- Customer advance payments = deferred income liability

---

## Unresolved Questions

1. **Multi-payment Orders:** How to handle partial/installment payments on single invoice?
2. **Shipping Delays:** When to recognize revenue - purchase, shipment, or delivery?
3. **Refunds/Disputes:** Reverse accounting for cancelled/disputed orders?
4. **Tax Classification:** Does SmartMoney need to support multiple tax methods (FIFO/LIFO/weighted-avg)?
5. **CSV Import:** How to preserve cost_basis_price data from external accounting exports?

---

## Sources

- [Quicken Business & Personal](https://www.quicken.com/products/business-personal/)
- [Wave Accounting](https://www.waveapps.com)
- [QuickBooks Separation Guide](https://quickbooks.intuit.com/r/bookkeeping/separate-business-personal-finances/)
- [NetSuite Inventory Accounting Guide](https://www.netsuite.com/portal/resource/articles/accounting/retail-accounting-cost-accounting.shtml)
- [MyResellerGenie Bookkeeping Guide](https://www.myresellergenie.com/blog/ultimate-guide-to-bookkeeping-for-resellers)
- [Ambrook Business/Personal Finance Separation](https://ambrook.com/education/chart-of-accounts/separating-business-and-personal-checklist)
- [ZenMarket Japan Proxy Service](https://zenmarket.jp/en/)
- [Bill.com Receivables Management](https://www.bill.com/blog/invoices-for-freelancers)
- [Stripe Freelance Invoicing Guide](https://stripe.com/resources/more/how-to-invoice-as-a-freelancer)
