# Feature Research Summary - Quick Reference

## Top 15 Features Ranked by User Demand

| Rank | Feature | Demand | Japan | Vietnam | Self-Hosted | Evidence |
|------|---------|--------|-------|---------|------------|----------|
| 1 | Auto-Categorization (AI) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Lums, Lunch Money, Monarch all feature-lead |
| 2 | Bank/Payment Integration | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | #1 complaint across all communities |
| 3 | Receipt OCR Scanning | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | 85% accuracy limit; users want 99% |
| 4 | Cash Flow Forecasting | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | PocketSmith, Cash Predict, Quicken Simplifi |
| 5 | Collaborative Budgeting | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | Shareroo 1M+ users; Honeydue popular |
| 6 | Tax Reporting | ⭐⭐⭐ | ⭐⭐ | ⭐ | ⭐⭐⭐⭐ | Keeper, Hurdlr, Everlance lead |
| 7 | Multi-Asset Portfolio | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | Kubera, Crate Ledger, AllInvestView |
| 8 | Automation Rules | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | Actual Budget #508 feature request |
| 9 | Offline + E2E Encryption | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | Actual Budget, Firefly III, BudgetVault |
| 10 | Data Import/Export | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | YNAB community tools; vendor lock-in fear |
| 11 | Bill Splitting | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | Splitwise 1M+ users |
| 12 | Rewards/Cashback Tracking | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | MaxRewards, AwardWallet 700k+ users |
| 13 | Mobile Feature Parity | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | Actual Budget 2026 roadmap; Lums |
| 14 | Goal Planning & Tracking | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | Actual Budget 2026 roadmap; YNAB core |
| 15 | Behavioral Alerts/Insights | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ | Monarch Money; Academy Bank survey |

## Quick Wins for SmartMoney (Next Sprint)

### High Impact, Low Effort
1. **CSV/JSON Export API** — Data portability differentiator; attracts self-hosted users
2. **Spending Threshold Alerts** — Simple notification rules; behavior change enabler
3. **Bill Splitting Module** — Template-based simple splitting; group expenses
4. **Rewards Category Tags** — Let users track credit card earning/redemption manually
5. **Goal Templates** — Emergency fund, vacation, home; tie to budget categories

### High Impact, Medium Effort
1. **Receipt OCR Integration** — Partner with Google Vision or Tesseract; Japanese/Vietnamese models
2. **Multi-User Shared Budgets** — Role-based access (viewer, editor, admin); offline sync handling
3. **Automation Rules Engine** — Trigger-based rules (if category > limit, then notify)
4. **Portfolio Tracking** — Manual input for stocks/bonds; unify with DeFi tracking
5. **Cash Flow Forecasting** — Linear model; recurring transaction patterns

### High Impact, High Effort
1. **Bank API Integrations** — Japan (Rakuten, MUFG, SBI) + Vietnam (Vietcombank, BIDV)
2. **Advanced OCR Model** — Train on Japanese receipts + Vietnamese transaction data
3. **Behavioral ML** — Anomaly detection; spending pattern analysis; habit tracking

## Regional Expansion Priorities

### Japan Market (High Monetization)
**Top 5 Must-Haves:**
1. Bank integration (Rakuten, MUFG, SBI)
2. Kanji-capable auto-categorization
3. Rewards/cashback tracking (complex JP card programs)
4. Japanese OCR for receipts
5. Mobile-first experience

**Market Context:** Tech-savvy users; strong privacy concerns; reward shopping culture; salary-based income; couple finances management

### Vietnam Market (High Growth)
**Top 5 Must-Haves:**
1. Mobile payment integration (MoMo, ZaloPay, VietQR)
2. Vietnamese auto-categorization (diacritics handling)
3. Bank sync (15+ major banks)
4. Offline capability (connectivity gaps)
5. Low data usage (mobile plan constraints)

**Market Context:** Mobile-only users; irregular income; group expense sharing; limited credit card adoption; QR code payment growth

## Key Competitive Differentiators for SmartMoney

✅ **Already Built:**
- Multi-currency transaction tracking
- DeFi wallet tracking
- Multi-language (EN/JA/VI)
- Privacy-first (self-hosted)
- Recurring transactions

🎯 **Immediate Opportunities:**
- Bill splitting (differentiator vs. YNAB)
- Data portability (differentiator vs. Monarch Money)
- Offline-first + E2E encryption (differentiator vs. cloud apps)
- Japan/Vietnam localization focus
- Collaborative budgeting (better than YNAB free tier)

⚠️ **Competitive Threats:**
- Monarch Money's integration breadth
- YNAB's brand + community
- Firefly III's feature-richness (open source)
- Actual Budget's performance + privacy

## Sources Consulted

- **Reddit:** r/personalfinance, r/YNAB, r/MonarchMoney, r/selfhosted
- **App Reviews:** NerdWallet, App Store (Monarch, YNAB, Lunch Money, Lums)
- **Product Hunt:** Budgeting & Personal Finance categories
- **Self-Hosted Communities:** Firefly III GitHub, Actual Budget GitHub, GnuCash forums
- **Industry Research:** Academy Bank survey, WildNetEdge (2025), SaaS Hub comparisons
- **Company Resources:** SmartBank (Japan), Money Lover (Vietnam), Moneytree (Japan)

---

**Full details:** See `/docs/TOP_15_MOST_REQUESTED_FEATURES_RESEARCH.md`
