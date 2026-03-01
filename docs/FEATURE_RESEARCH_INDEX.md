# Feature Research & Prioritization Index

## Overview

Comprehensive research on the top 15 most-requested personal finance app features across Reddit communities, app store reviews, Product Hunt, and self-hosted tool communities (Firefly III, Actual Budget, GnuCash).

**Research Date:** 2026-03-01
**Target Markets:** Global + Japan (high monetization) + Vietnam (high growth)
**SmartMoney Context:** Self-hosted, multi-currency, DeFi-enabled PWA

---

## Document Guide

### Core Research Documents

1. **[TOP_15_MOST_REQUESTED_FEATURES_RESEARCH.md](./TOP_15_MOST_REQUESTED_FEATURES_RESEARCH.md)** (351 LOC)
   - Full research breakdown by feature
   - Detailed evidence + user quotes
   - Regional relevance analysis (Japan/Vietnam)
   - Competitive landscape for each feature
   - **Use Case:** Strategic planning, market analysis, competitive positioning

2. **[FEATURE_RESEARCH_SUMMARY.md](./FEATURE_RESEARCH_SUMMARY.md)** (Quick Reference)
   - Table: Top 15 features ranked by demand
   - Regional priority matrices
   - Key competitive differentiators
   - Quick wins checklist
   - **Use Case:** Executive summary, roadmap planning, quick decision-making

3. **[FEATURE_PRIORITIZATION_ROADMAP.md](./FEATURE_PRIORITIZATION_ROADMAP.md)** (421 LOC)
   - Scoring methodology (Impact/Effort/Alignment/Market)
   - Phased implementation plan (4 phases)
   - Resource estimates + timelines
   - Success metrics
   - Key decisions needed
   - **Use Case:** Development sprint planning, resource allocation, execution roadmap

---

## Top 15 Features At-A-Glance

### Tier 1: Must-Have (Top 5)
1. **Auto-Categorization (AI)** — Saves 3.8 hrs/month; 95%+ accuracy needed
2. **Bank/Payment Integration** — #1 complaint; real-time sync critical
3. **Receipt OCR Scanning** — 85% ceiling; users want 99%
4. **Cash Flow Forecasting** — Users want "future view" not past-only
5. **Collaborative Budgeting** — 1M+ users in Shareroo; household demand

### Tier 2: Important (Next 5)
6. **Tax Reporting** — Self-employed/gig worker feature
7. **Multi-Asset Portfolio Tracking** — Crypto + stocks + bonds + real estate
8. **Automation Rules** — Trigger-based actions; power user feature
9. **Offline + E2E Encryption** — Privacy-first differentiation
10. **Data Import/Export** — Vendor lock-in fear; portability demanded

### Tier 3: Differentiators (Final 5)
11. **Bill Splitting** — Splitwise 1M+ users; Vietnam growth
12. **Rewards/Cashback Tracking** — Japan credit card culture; complex programs
13. **Mobile Feature Parity** — Japan/Vietnam mobile-first markets
14. **Goal Planning** — Behavior change enabler; Actual Budget #1 priority
15. **Behavioral Alerts** — Prevent overspending; engagement lever

---

## Regional Priorities

### Japan Market (High Monetization)
**Critical:** Bank integration (Rakuten, MUFG, SBI) + Auto-categorization (Kanji) + Rewards + OCR (Japanese text) + Mobile-first
**Secondary:** Forecasting (bonus cycles) + Collaborative budgeting (couples) + Goal tracking (savings culture)

### Vietnam Market (High Growth)
**Critical:** Mobile payments (MoMo, ZaloPay) + Bank sync + Auto-categorization (Vietnamese diacritics) + Offline capability
**Secondary:** Bill splitting (roommates) + Low data usage + QR code tracking + Irregular income handling

### Self-Hosted/Privacy Users (High Retention)
**Critical:** Data portability (CSV/JSON) + Offline-first + Privacy (E2E encryption) + Customizable rules
**Secondary:** Open-source roadmap + API documentation + No vendor lock-in

---

## SmartMoney Strategic Fit

### Already Differentiated ✅
- Multi-currency transaction tracking
- DeFi wallet tracking
- Privacy-first (self-hosted)
- Multi-language (EN/JA/VI)
- Recurring transactions
- Japan/Vietnam market focus

### Quick Wins (4-6 weeks) 🎯
1. **CSV Export** — Data portability; self-hosted users demand
2. **Spending Alerts** — Behavioral change; low friction
3. **Goal Templates** — Engagement; Actual Budget's #1 feature
4. **Bill Splitting** — Vietnam growth; roommate culture
5. **Rewards Tags** — Japan credit card engagement

### Medium Wins (2-3 months) 📈
1. **Multi-User Budgets** — Household finance; 1M+ demand signal
2. **Automation Rules** — Power users; recurring bills culture
3. **Cash Flow Forecasting** — "Future view" demand
4. **Portfolio Tracking** — DeFi expansion + stocks/bonds

### Major Investment (6+ months) 💰
1. **Bank Integration** — Japan market unlock; real-time sync
2. **Receipt OCR** — Japanese/Vietnamese language models needed
3. **Tax Reporting** — Regional compliance

---

## Competitive Landscape

| Competitor | Strength | Weakness | SmartMoney Edge |
|-----------|----------|----------|-----------------|
| **YNAB** | Brand + community | Expensive; US-centric | Open-source; multi-currency |
| **Monarch Money** | Broad integrations | Sync failures; pricey | Privacy-first; offline |
| **Firefly III** | Open-source; privacy | Limited integrations | DeFi tracking; multi-language |
| **Actual Budget** | Performance; privacy | No collaborations | Multi-user support roadmap |
| **Lunch Money** | API-first; flexibility | No bank sync | Self-hosted alternative |

---

## Implementation Roadmap Summary

### Phase 1 (4-6 weeks) — Foundation
- CSV Export & Data Portability
- Spending Alerts & Notifications
- Goal Templates & Tracking

### Phase 2 (6-12 weeks) — Engagement
- Multi-User Collaborative Budgets
- Bill Splitting Module
- Rewards/Cashback Tracking
- Automation Rules Engine

### Phase 3 (12-24 weeks) — Localization
- Receipt OCR (Japanese/Vietnamese)
- Cash Flow Forecasting
- Bank Integration (Japan)
- Portfolio Tracking Expansion

### Phase 4 (24+ weeks) — Advanced
- Tax Reporting & Compliance
- Behavioral ML & Anomaly Detection

**Estimated Total:** 1,200-1,500 development hours over 12-18 months

---

## Key Metrics to Track

- **Adoption Rate:** % of users enabling each feature
- **Retention Lift:** 30/90-day retention improvement per feature
- **Engagement:** Daily/weekly active users by feature
- **Regional Usage:** Feature adoption by locale (EN/JA/VI)
- **CSAT:** User satisfaction scores by feature
- **Market Share:** SmartMoney vs. YNAB/Monarch in Japan/Vietnam

---

## Unresolved Questions

1. **Bank Integration Strategy:** Which Japan/Vietnam banks offer public APIs? Cost/benefit vs. CSV importer?
2. **OCR Infrastructure:** Google Cloud Vision (cost + privacy) vs. self-hosted Tesseract (complexity)?
3. **Multi-User Sync:** Server-side resolution (requires backend) vs. client-side merge (complexity)?
4. **Monetization Model:** Freemium tier (free base, paid advanced) vs. open-source with sponsorship?
5. **Mobile App Priority:** Web PWA vs. native iOS/Android build?

---

## Data Sources & Methodology

**Primary Sources:**
- Reddit: r/personalfinance, r/YNAB, r/MonarchMoney, r/selfhosted discussions
- App Reviews: NerdWallet, Apple App Store (Monarch, YNAB, Lunch Money)
- Product Hunt: Budgeting & Personal Finance categories
- GitHub: Firefly III, Actual Budget issue trackers + roadmaps
- Industry Research: Academy Bank survey, WildNetEdge, SaaS Hub

**Secondary Sources:**
- Company data: SmartBank (Japan), Money Lover (Vietnam), Moneytree (Japan)
- Tool analysis: MaxRewards, AwardWallet, Splitwise, Keeper Tax

**Limitations:**
- Reddit data skews tech-savvy; casual users underrepresented
- Japan/Vietnam data less comprehensive than US data
- Recency: Most data 2024-2026; some older references included

---

## Next Steps

1. **Review & Validate:** Share with product team; confirm regional priorities
2. **Prioritize:** Locked Phase 1 (4-6 weeks) + Phase 2 (6-12 weeks) roadmap
3. **Resource Planning:** Allocate engineering + design capacity per phase
4. **Market Research:** Validate Japan/Vietnam assumptions with user interviews
5. **Competitive Monitoring:** Track Actual Budget, Firefly III roadmaps for feature overlaps

---

## Related Documentation

- `/docs/code-standards.md` — Development practices
- `/CLAUDE.md` — SmartMoney project guidelines
- `./.claude/workflows/` — Development workflows
- `/README.md` — Project overview

---

**Document Last Updated:** 2026-03-01
**Next Review:** 2026-06-01 (post Phase 1 completion)
**Maintained By:** Product & Engineering teams
