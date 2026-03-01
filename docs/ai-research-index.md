# AI Features Research 2025-2026: Index

**Research Date:** March 1, 2026
**Context:** SmartMoney (privacy-first personal finance webapp, Japanese market + EN/VI support)

## Key Finding
Personal finance apps are converging on **smart categorization + forecasting + behavioral insights** as table-stakes. Privacy-first on-device AI is emerging as a 2.4× user retention differentiator.

## Topic Files

### 1. Core Feature Areas
- **[ai-features-smart-categorization.md](./ai-features-smart-categorization.md)** — Transaction categorization: what's shipping, demand, complexity, privacy
- **[ai-features-forecasting-cashflow.md](./ai-features-forecasting-cashflow.md)** — Cashflow forecasting: predictions, spending trends, detection
- **[ai-features-personalized-insights.md](./ai-features-personalized-insights.md)** — Behavioral coaching, nudges, recommendations
- **[ai-features-chatbot-conversational.md](./ai-features-chatbot-conversational.md)** — Conversational AI, chatbots, voice interface
- **[ai-features-anomaly-detection.md](./ai-features-anomaly-detection.md)** — Fraud detection, unusual spending alerts
- **[ai-features-natural-language-search.md](./ai-features-natural-language-search.md)** — NLP queries, voice search, intent classification

### 2. Advanced Topics
- **[ai-chatbot-architecture.md](./ai-chatbot-architecture.md)** — On-device vs. cloud, model selection, technical tradeoffs

### 3. Strategy & Architecture
- **[ai-privacy-first-architecture.md](./ai-privacy-first-architecture.md)** — On-device vs. cloud, regulatory, compliance, three-tier approach
- **[ai-competitive-landscape.md](./ai-competitive-landscape.md)** — Competitor analysis (Copilot, Monarch, YNAB, Cleo), SmartMoney gaps & opportunities
- **[ai-user-research-sentiment.md](./ai-user-research-sentiment.md)** — Reddit, app store reviews, user sentiment, post-Mint insights

### 4. SmartMoney Roadmap
- **[ai-implementation-roadmap.md](./ai-implementation-roadmap.md)** — Phase 1-3 (Q2-Q4 2026), effort, budget, success criteria

---

## Priority Matrix (Quick Reference)

| Feature | Demand | Complexity | Edge | Priority |
|---------|--------|------------|------|----------|
| Smart categorization | HIGH | MEDIUM | MEDIUM | **P1** |
| Forecasting | HIGH | MEDIUM-HIGH | MEDIUM-HIGH | **P1** |
| Insights + nudges | VERY HIGH | MEDIUM | HIGH | **P1** |
| Chatbot | VERY HIGH | HIGH | MEDIUM | **P2** |
| Anomaly detection | MEDIUM-HIGH | MEDIUM | MEDIUM-HIGH | **P2** |
| Natural language search | MEDIUM | HIGH | HIGH (i18n) | **P3** |
| Savings goal AI | MEDIUM | LOW-MEDIUM | MEDIUM | **P3** |

---

## Next Steps

1. **Read:** Start with [ai-privacy-first-architecture.md](./ai-privacy-first-architecture.md) — this is the strategic differentiator for SmartMoney
2. **Review:** [ai-competitive-landscape.md](./ai-competitive-landscape.md) — see where SmartMoney stands vs. Tier 1 competitors
3. **Plan:** [ai-implementation-roadmap.md](./ai-implementation-roadmap.md) — Q2-Q4 2026 phasing for small team

---

## Key Insights

✅ **On-device AI is a 2.4× user retention advantage** — Cognito Money, privacy-first apps are outperforming cloud-heavy competitors
✅ **Japanese market opportunity** — High demand for privacy (APPI regs), but English fintech dominates
✅ **Smart categorization is entry point** — Highest user demand, medium complexity, enables all downstream features
✅ **Chatbot is expected** — 50%+ of fintech users want conversational AI, but cloud-based approach creates privacy risk
✅ **Forecasting is differentiator** — Monarch's t-GNN beats YNAB's rule-based forecasting; SmartMoney can compete with category-level + multi-currency forecasting

---

## Sources & References

All sources cited in individual topic files. Key references:
- [Plaid: Predictive Categories](https://www.pymnts.com/artificial-intelligence-2/2025/plaid-launches-transaction-categories-designed-to-support-ai-powered-financial-services/)
- [YNAB vs Monarch vs Copilot](https://aicashcaptain.com/ynab-vs-monarch-vs-copilot/)
- [Privacy-First Architecture](https://theuxda.com/blog/apples-device-ai-vs-cloud-ai-who-will-start-age-personalized-banking-ux/)
- [Japan Fintech Trends 2025](https://japan-dev.com/blog/fintech-companies-in-japan)
- [Personal Finance User Sentiment](https://www.wildnetedge.com/blogs/personal-finance-apps-what-users-expect-in-2025/)
