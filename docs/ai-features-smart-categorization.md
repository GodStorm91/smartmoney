# Smart Transaction Categorization

**Demand:** HIGH
**Complexity:** MEDIUM
**Competitive Edge:** MEDIUM
**Privacy Risk:** LOW (if on-device)

## What's Shipping in 2025-2026

- **Plaid**: 10% higher accuracy on primary categories, 20% on subcategories. 15+ new subcategories (income, repayments, bank fees, transfers)
- **Copilot Money**: Auto-categorizes within 2 weeks; learns merchant patterns rivals miss
- **Monarch Money**: Real-time categorization via temporal graph neural networks (t-GNN), identifies latent relationships across fiscal years
- **YNAB**: Rule-based; less AI-driven than competitors
- **QuickBooks/Xero**: ML learns from transaction patterns + merchant details + historical data

## Why Users Care

Categorization is friction point #1. Manual tagging kills engagement. Users expect:
- 95%+ accuracy for common merchants
- Fast learning curve (2-4 weeks)
- Category suggestions, not just auto-assign
- Ability to correct + retrain

## Implementation for SmartMoney

### Option A: Heuristic + Rule-Based (Low Effort)
- Regex patterns on merchant names
- Amount-based heuristics (groceries typically <$100 vs. utilities)
- Merchant category mappings (hardcoded database)
- **Effort:** 1 engineer, 1-2 weeks
- **Accuracy:** 70-80% for common cases
- **Limitation:** No learning from user corrections

### Option B: Lightweight ML (Medium Effort)
- Collect user corrections (feedback loop)
- Train logistic regression or naive Bayes on merchant + amount + category
- Deploy as on-device ONNX model (React Native, web)
- Monthly retraining with user feedback
- **Effort:** 2 engineers, 3-4 weeks
- **Accuracy:** 85-90%
- **Advantage:** Learns from user corrections

### Option C: Plaid Integration (Easy, but Privacy Trade-off)
- Use Plaid's Predictor API
- **Pros:** 95%+ accuracy, instant, no maintenance
- **Cons:** Transaction data transmitted to Plaid, vendor lock-in, privacy concern for Japanese market
- **Cost:** ~$0.01/transaction

## SmartMoney Recommendation

**Start with Option B.** SmartMoney's privacy-first positioning requires on-device solution. Lightweight ML is achievable + differentiates against Copilot/Monarch (cloud-dependent).

### Roadmap
1. **Week 1-2:** Collect heuristics for top 50 categories (groceries, utilities, dining, subscription, transfer)
2. **Week 3-4:** Build feedback loop UI + ML training pipeline (scikit-learn backend)
3. **Week 5-6:** Deploy ONNX model to frontend + mobile apps
4. **Week 7+:** Monthly retraining, monitor accuracy, add new categories

## Competitive Differentiation

SmartMoney can offer:
- "Your categorization never leaves your device" (vs. Copilot/Monarch)
- Multi-currency categorization (JPY, USD, VND edge)
- Category customization (user-defined categories)
- Merchant aliases ("Starbucks" = "Coffee", user-configurable)

## Privacy Implications

✅ **On-device only:** No PII transmission, GDPR/APPI compliant
✅ **User feedback stays local:** Model updates don't require cloud
⚠️ **Manage scope:** If using Plaid for initial categorization, disclose + get explicit consent

## References

- [Plaid Transaction Categories 2025](https://www.pymnts.com/artificial-intelligence-2/2025/plaid-launches-transaction-categories-designed-to-support-ai-powered-financial-services/)
- [Top AI Expense Categorization Tools](https://www.lucid.now/blog/top-7-ai-tools-for-expense-categorization-2025/)
- [Building AI Fintech Apps](https://geekyants.com/blog/building-ai-driven-personal-finance-app-a-step-by-step-guide)
