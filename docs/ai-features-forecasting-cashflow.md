# Predictive Analytics & Cashflow Forecasting

**Demand:** HIGH
**Complexity:** MEDIUM-HIGH
**Competitive Edge:** MEDIUM-HIGH
**Privacy Risk:** LOW (if on-device)

## What's Shipping in 2025-2026

- **Mint**: End-of-month cash position forecast
- **Copilot Money**: Advanced forecasting + benchmarking
- **Monarch Money**: Temporal graph neural networks (t-GNN); predicts irregular income better than YNAB
- **Monzo**: AI budgeting advisor anticipates shortfalls, real-time saving strategies
- **Cleo, Simplifi**: Cash flow prediction, spending trends, anomaly detection
- **Enterprise**: Treasury forecasting tools achieve 95% accuracy with ML algorithms

## Why Users Care

From Reddit sentiment analysis:
- "I want to know if I'll have enough cash at end of month"
- "Dynamic budgets that adjust for irregular income"
- "Warn me about upcoming cash shortfalls"
- "Show me trends over 12 months"

## Technical Approaches

### Approach A: Statistical Time-Series (Low Complexity, Good Accuracy)
**Algorithm:** ARIMA, Prophet (Facebook's open-source)
- Decomposes seasonality, trend, irregular components
- Handles missing data + outliers
- 3-month ahead forecast is accurate, 6+ months less reliable
- **Pros:** Lightweight, explainable, fast
- **Cons:** Assumes stationarity; struggles with regime changes (job change, relocation)

### Approach B: Neural Network (Medium Complexity, High Accuracy)
**Algorithm:** LSTM, GRU, or attention-based (Transformer)
- Learns complex patterns from historical transactions
- Can incorporate external signals (day-of-week, holiday, weather)
- Handles irregular transactions better
- **Pros:** High accuracy, learns complex patterns
- **Cons:** Requires more training data (6-12 months), needs GPU for training, black-box

### Approach C: Monarch's t-GNN (High Complexity, State-of-the-Art)
**Algorithm:** Temporal Graph Neural Networks
- Models entities (merchants, categories, accounts) as graph nodes
- Captures relationships + temporal dynamics
- Retains state across fiscal years (unlike YNAB)
- **Pros:** Best-in-class accuracy for irregular patterns
- **Cons:** Complex to implement, requires ML expertise, GPU training

### Approach D: Hybrid Ensemble (Recommended for SmartMoney)
- Use Prophet for baseline (seasonality + trend)
- Add LSTM for anomaly-adjusted residuals
- Incorporate category-level forecasts (dining, utilities, subscriptions separately)
- Ensemble predictions for robustness
- **Pros:** Balanced accuracy/complexity, handles multiple scenarios
- **Cons:** Requires validation, monitoring

## SmartMoney Recommendation

**Start with Prophet + Category-Level Forecasts.**

### Phase 1 Implementation (4-6 weeks, 2 engineers)

1. **Data Preparation**
   - Aggregate user transactions by category + time (daily/weekly/monthly)
   - Exclude outliers (one-time large purchases)
   - Separate recurring (subscriptions) from non-recurring

2. **Prophet Model**
   - Train per-category forecast (groceries, utilities, subscriptions, discretionary)
   - Total forecast = sum of category forecasts
   - Confidence intervals for uncertainty bounds

3. **UI Integration**
   - "Predicted cash next month: $X (±Y)"
   - Category-level breakdown ("Groceries: $300 ± $50")
   - Visual chart: historical + forecast

4. **Validation**
   - Compare forecast vs. actuals after 30 days
   - Track MAPE (mean absolute percentage error)
   - Retrain monthly with new data

### Phase 2: Enhanced (Months 3-4)
- Add LSTM for non-stationary patterns
- Incorporate recurring transaction calendar (subscriptions, rent due dates)
- Multi-currency forecasting (handle FX volatility)

### Phase 3: Insights (Months 5-6)
- "If you cut dining by 20%, hit savings goal by X"
- "Forecast shows shortfall in Q3; suggest reducing discretionary"
- Benchmark against goal: "On track to save $X this year"

## Competitive Differentiation

SmartMoney's edges:
- **Multi-currency forecasting** — Forecast in JPY/USD/VND, handle exchange rate shifts
- **Subscription-aware** — Already shipping subscription detection; use to anchor recurring expenses
- **Category-level forecasts** — Not just total; show dining vs. utilities separately
- **Privacy-first** — All forecasting on-device; no cloud transmission
- **Regional benchmarks** — "Your food spending is 30% above Tokyo average" (Phase 2)

## Implementation Complexity

### Option A: Prophet (Easiest)
```python
from fbprophet import Prophet
import pandas as pd

# Aggregate transactions by category + date
df = user_transactions.groupby(['date', 'category'])['amount'].sum().reset_index()
df = df.rename(columns={'date': 'ds', 'amount': 'y'})

# Train forecast
model = Prophet(yearly_seasonality=True, interval_width=0.95)
model.fit(df)

# Predict 3 months ahead
future = model.make_future_dataframe(periods=90)
forecast = model.predict(future)
```

**Effort:** 2 weeks + ongoing maintenance

### Option B: LSTM (More Sophisticated)
```python
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense

# Prepare sequences (30-day history → 30-day forecast)
X_train, y_train = create_sequences(transaction_history)

model = Sequential([
    LSTM(64, return_sequences=True, input_shape=(30, n_features)),
    LSTM(32),
    Dense(30)  # Forecast 30 days
])
model.compile(optimizer='adam', loss='mse')
model.fit(X_train, y_train, epochs=100, validation_split=0.2)
```

**Effort:** 4-6 weeks + GPU infrastructure

## Privacy Implications

✅ **On-device training & inference:** No PII transmission, GDPR/APPI compliant
✅ **No external data required:** Pure historical transaction analysis
⚠️ **Model size:** Prophet (~50MB), LSTM (~100-300MB) — acceptable for modern devices

## Metrics to Track

1. **Accuracy:** MAPE, RMSE (vs. actual spending next month)
2. **Calibration:** Do 95% confidence intervals contain 95% of actuals?
3. **Timeliness:** Can forecast month N by day 20 of month N-1?
4. **User engagement:** Do users view forecasts? Click to explore scenarios?

## Unresolved Questions

- Multi-currency volatility: How to handle when user spends in both JPY + USD?
- Anomalies: Should forecast exclude one-time large purchases? User-configurable?
- Subscriptions: Use calendar (date-based) or historical (pattern-based) for recurring?
- Retrain frequency: Monthly? Weekly? Real-time?

## References

- [Cash Flow Forecasting Tools 2026](https://www.meniga.com/guides/cashflow-forecasting-tools/)
- [AI Financial Tools 2026](https://www.analyticsinsight.net/artificial-intelligence/top-ai-tools-for-personal-finance-management-in-2026/)
- [Facebook Prophet Documentation](https://facebook.github.io/prophet/)
- [YNAB vs Monarch Comparison](https://aicashcaptain.com/ynab-vs-monarch-vs-copilot/)
