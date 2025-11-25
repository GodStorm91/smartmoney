# AI Budget Generation Deep Dive - Landing Page Copy

## Section Header
```
AI That Understands YOUR Spending
Claude 3.5 Haiku analyzes your transaction history, not generic templates
```

---

## The Problem with Template Budgets

Most finance apps give you generic budgets: "Spend 30% on housing, 20% on food." But what if you live in Tokyo where housing is 45%? What if you have kids who eat a lot? Template budgets ignore YOUR reality.

**Generic Budget vs Your Reality:**
```
Generic Budget App:          Your Actual Spending:
Housing:  30% (¥150k)        Housing:  45% (¥225k) ❌ Unrealistic
Food:     20% (¥100k)        Food:     15% (¥75k)  ❌ Too high

Result: Targets you'll never hit. Demotivating. Useless.
```

---

## How SmartMoney's AI Works

**Process (10 seconds):**
```
Step 1: Analyze Last 3-6 Months
   ↓
Identify category averages, trends, seasonal patterns
   ↓
Step 2: Calculate Realistic Allocations
   ↓
Housing: ¥225k (based on YOUR 6-month average: ¥228,450)
Food:    ¥82k  (adjusted for YOUR family size)
   ↓
Step 3: Adjust for Income Changes
   ↓
Income increased 10%? AI suggests where to allocate extra ¥50k
   ↓
Step 4: Generate Budget Draft
   ↓
You review, swipe to adjust, save when satisfied
```

**Technical Transparency:**
- **Model:** Claude 3.5 Haiku (fast, cost-effective)
- **Input:** Transaction history (3-6 months), monthly income, language preference
- **Output:** Category-wise allocation with rationale
- **Token Usage:** ~500 input + ~800 output tokens (varies)
- **Cost:** $0.0036 per generation → 0.36 credits (100× markup) → ~862 VND

**Value Statement:**
> One AI budget costs 862 VND. A Starbucks coffee costs 5,000 VND. For less than 1/5 the price of coffee, get a personalized financial roadmap.

---

## Example AI-Generated Budget

**Scenario:** Family in Tokyo, Monthly Income ¥500,000

```
=== AI-Generated Budget ===

Monthly Income: ¥500,000

Category Allocations:
1. Housing (45%) .................. ¥225,000
   [Based on your 6-month average: ¥228,450]

2. Food (16%) ..................... ¥80,000
   [Slightly above average to account for family size]

3. Transportation (8%) ............ ¥40,000
   [Includes train passes + occasional taxi]

4. Utilities (5%) ................. ¥25,000
   [Electric, gas, water, internet average: ¥24,300]

5. Savings (15%) .................. ¥75,000
   [To reach 3-year goal: ¥2.7M house down payment]

6. Entertainment (5%) ............. ¥25,000
   [Dining out, movies, hobbies]

7. Other (6%) ..................... ¥30,000
   [Healthcare, clothing, misc]

Total: ¥500,000 (100%)

=== AI Rationale ===
"Your housing costs are higher than typical (45% vs 30% guideline) because
you live in central Tokyo. This is sustainable given your income. I've
allocated 15% to savings to ensure you hit your 3-year house down payment
goal of ¥2.7M. Consider reducing entertainment by ¥5,000/month to accelerate
this goal by 3 months."
```

[Screenshot: Full AI budget generation interface with rationale text]

---

## Swipe-to-Adjust Interface

Don't like the AI's suggestion? Adjust in seconds. Swipe left to decrease, swipe right to increase. Total always balances to 100%. Save when satisfied.

**Interactive Features:**
- Draft Mode: Regenerate unlimited times before saving
- Touch + Mouse Support: Works on desktop and mobile
- 2.5× Sensitivity: 400px swipe = 100% allocation change
- Visual Feedback: Scale animation, ring highlight, pulsing text

[GIF: Swipe gesture showing Food decreasing from ¥80k to ¥75k, Savings auto-adjusting to ¥80k]

---

## Cost Comparison: SmartMoney vs Competitors

| Feature                  | SmartMoney AI   | MoneyForward Premium | Zaim Premium    |
|--------------------------|-----------------|----------------------|-----------------|
| Monthly Subscription     | ¥0              | ¥500 (~188k VND/yr)  | ¥480/month      |
| AI Budget Generation     | 862 VND/use     | ❌ Not available     | ❌ Generic only |
| Self-Hosted (Privacy)    | ✅ Yes          | ❌ Cloud only        | ❌ Cloud only   |
| Multi-Year Goal Tracking | ✅ 1/3/5/10yr   | ⚠️ 1 year only       | ⚠️ Limited      |
| Credits Never Expire     | ✅ Yes          | N/A                  | N/A             |

**ROI Calculation:**
> Generate 12 budgets/year for ¥10,344 (12 × 862 VND). MoneyForward charges ¥6,000/year with NO AI budgets. You get more value for less—94% cheaper annually.
