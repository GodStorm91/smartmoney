# Anomaly Detection & Unusual Spending Alerts

**Demand:** MEDIUM-HIGH
**Complexity:** MEDIUM
**Competitive Edge:** MEDIUM-HIGH
**Privacy Risk:** LOW (if on-device)

## What's Shipping

- **Feedzai:** Fraud detection + behavioral analytics, detects credential theft + impersonation
- **Industry standard:** 30% of Nordic banks using AI for transaction monitoring (late 2025)
- **Approaches:** Z-score, isolation forests, autoencoders, Graph Neural Networks

## User Demand

- "Alert me if unusual spending" (explicit request)
- "Flag suspicious activity" (fraud prevention)
- "Warn if I'm overspending a category" (behavioral nudge)
- "Show if transaction looks like a mistake" (user validation)

## Implementation Approach

### Option A: Statistical Baseline (Easiest)
```python
# Per-category, per-merchant baseline + variance
baseline = mean(historical_spending['groceries'])
volatility = std(historical_spending['groceries'])

if current_transaction > baseline + 2*volatility:
    severity = (current_transaction - baseline) / volatility
    alert = f"Unusual: ${current_transaction} on groceries (usually ${baseline})"
```

**Effort:** 1 week, 1 engineer
**Accuracy:** 70-80% for obvious outliers

### Option B: Isolation Forest (ML)
```python
from sklearn.ensemble import IsolationForest

# Train on historical transactions
X = transactions[['amount', 'hour_of_day', 'day_of_week', 'merchant_id']].values
model = IsolationForest(contamination=0.05)  # 5% anomalies
predictions = model.fit_predict(X)

if predictions[-1] == -1:
    alert = "Unusual spending pattern detected"
```

**Effort:** 2 weeks, 1 engineer
**Accuracy:** 85-90%

### Option C: Temporal Anomalies (Advanced)
- Detect velocity changes ("$100/day → $500/day over 3 days")
- Geographic anomalies ("Usually JP, suddenly US spending")
- Merchant category mixing ("Always groceries, suddenly liquor store")

**Effort:** 3-4 weeks, 2 engineers
**Accuracy:** 90%+

## SmartMoney Recommendation: Statistical + Rule-Based

**Phase 1 (Weeks 1-3):** Statistical baseline
- Per-category mean ± 2σ alerts
- Simple rules (velocity, geography)
- Configuration UI (adjust sensitivity)

**Phase 2 (Weeks 4-6):** Isolation forest
- Train on user's 6-month history
- Weekly retraining
- Multi-feature detection (amount, time, merchant, category)

## Anomaly Types to Detect

| Type | Detection | Action |
|------|-----------|--------|
| **Amount spike** | Amount > mean + 2σ | "Unusual amount; confirm?" |
| **Velocity** | $X/day → $5X/day | "High spending pace; slow down?" |
| **Merchant new** | First transaction at merchant | "New merchant; mark safe?" |
| **Geographic** | Usually JP, now US | "Spending abroad detected" |
| **Category shift** | Usually dining, now liquor | "Behavior change detected?" |
| **Time anomaly** | 3 AM transaction (usually daytime) | "Late transaction; confirm?" |

## Privacy Implications

✅ **On-device only:** Baselines computed locally, no transmission
✅ **User feedback training:** Corrections retrain local model
⚠️ **Manage false positives:** Don't cry wolf; calibrate sensitivity

## Metrics to Track

1. **True Positive Rate:** Correctly flagged anomalies
2. **False Positive Rate:** False alarms (tuning tradeoff)
3. **User engagement:** % of users dismissing/confirming alerts
4. **Calibration:** User feedback used to retrain model

## References

- [Error and Anomaly Detection in Finance 2026](https://www.gartner.com/reviews/market/error-and-anomaly-detection-in-finance)
- [Anomaly Detection in Banking](https://emerj.com/anomaly-detection-in-banking/)
- [AI Anomaly Detection Use Cases](https://www.lucid.now/blog/ai-anomaly-detection-use-cases-finance/)
- [Graph Neural Networks for Anomaly Detection](https://www.techscience.com/cmc/v86n1/64431/html)
