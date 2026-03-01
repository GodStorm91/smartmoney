# Natural Language Search & Queries

**Demand:** MEDIUM
**Complexity:** HIGH
**Competitive Edge:** HIGH (i18n opportunity)
**Privacy Risk:** MEDIUM

## What's Shipping

- **TalkieMoney:** Voice + text search; "How much did I spend on food last month?" → instant answer
- **Copilot Money:** Natural language search
- **Monarch Money:** Plain English queries
- **Industry:** Early-stage; Plaid experimenting with conversational search

## User Demand

- Nice-to-have, not must-have
- Mobile users prefer voice search
- Desktop users use filters + sorting
- Younger cohort more engaged with conversational interfaces

## Technical Approach

### NLP Pipeline
1. **Intent Classification:** What is user asking? (spending, budget, trend, goal)
2. **Entity Extraction:** Category, timeframe, merchant
3. **Query Construction:** Convert NLP → database query
4. **Aggregation:** Calculate answer
5. **Response Generation:** Natural language response

### Example Implementation

```python
# Input: "How much did I spend on dining last month?"

# 1. Intent: SPENDING_QUERY
intent = classify_intent("How much did I spend on dining last month?")
# → "SPENDING_QUERY"

# 2. Entity Extraction: category, timeframe
entities = extract_entities(query)
# → {"category": "dining", "timeframe": "last_month"}

# 3. Query construction
start_date = datetime.now() - timedelta(days=30)
result = db.spending.filter(
    category="dining",
    date >= start_date
).sum()

# 4. Response
response = f"You spent ${result} on dining last month"
```

## SmartMoney Opportunity: Multilingual NLP

**Competitive edge:** Japanese/Vietnamese NLP is rare in fintech.

### Language-Specific Challenges

**Japanese:**
- Morphological analysis required (no word boundaries)
- Example: "食費" (shokuhi) = "dining expense"
- Tool: MeCab, Janome (Japanese tokenizers)

**Vietnamese:**
- Analyzer: pyvi (Vietnamese word segmentation)
- Tonal language; word order matters
- Example: "Chi tiêu ăn uống tháng trước bao nhiêu?" = "How much dining spending last month?"

**English:**
- Simplest; use NLTK or spaCy

### Phase 1: Rule-Based Intent Matching (Easiest)

```python
# No ML required; just pattern matching
INTENTS = {
    "SPENDING": [
        r"how much (did i spend|do i spend|have i spent) on (\w+)",
        r"(\w+) spending",
        r"total (\w+)",
    ],
    "BUDGET": [
        r"(am i on track|how much left) (for|in) (\w+)",
        r"(\w+) budget (remaining|left|balance)",
    ],
    "TREND": [
        r"(compare|how does) (\w+) (this month|this year) (vs|to|compare to) (\w+)",
        r"(\w+) trend",
    ],
}

def classify_intent(query):
    for intent, patterns in INTENTS.items():
        for pattern in patterns:
            if re.search(pattern, query, re.IGNORECASE):
                return intent
    return "UNKNOWN"
```

**Effort:** 1 week, 1 engineer (pattern library)
**Accuracy:** 75-85% for common queries

### Phase 2: ML-Based NLP (More Sophisticated)

- Train intent classifier on SmartMoney user queries
- Named entity recognition (NER) for entities (category, merchant, date)
- Multi-language support

**Effort:** 4-6 weeks, 2 engineers
**Accuracy:** 90%+

## Supported Queries (MVP)

### Tier 1: Spending
- "How much did I spend on X last month?"
- "Top spending categories this month?"
- "X spending vs last month?"

### Tier 2: Budget
- "How much left in my X budget?"
- "Am I on track for X?"
- "Did I overspend any category?"

### Tier 3: Goal
- "How close to my savings goal?"
- "Monthly savings rate?"
- "When will I hit goal at current pace?"

### Tier 4: Trend
- "YoY spending change?"
- "Biggest spending increase?"
- "Seasonal patterns?"

## Implementation Roadmap (6-8 weeks)

**Week 1-2:** Intent classification patterns (English + Japanese)
**Week 3-4:** Entity extraction, query construction
**Week 5-6:** Response generation, error handling
**Week 7-8:** Testing, multilingual refinement

## Privacy Considerations

⚠️ **Query interpretation requires NLP:**
- On-device NLP + local search = private
- Cloud NLP exposes search intent

✅ **Solution:** Use open-source NLP (spaCy, MeCab, pyvi)

## Competitive Differentiation

1. **Multilingual:** Japanese/Vietnamese search (rare in fintech)
2. **Privacy:** On-device NLP, no intent transmission
3. **Accuracy:** Tuned to SmartMoney's domain (finance-specific entities)

## Unresolved Questions

1. **Japanese tokenizer:** MeCab vs. Janome vs. Fugashi? (accuracy, speed, bundle size)
2. **Timeframe parsing:** How to handle "last month" vs. "March" vs. "Q1"? Timezone-aware?
3. **Fallback:** If NLP fails to extract entities, show guided search UI?

## References

- [NLP in Fintech](https://www.zendesk.com/blog/fintech-chatbot/)
- [TalkieMoney Natural Language](https://talkiemoney.com/en/)
- [spaCy NLP Library](https://spacy.io/)
- [MeCab Japanese Tokenizer](https://taku910.github.io/mecab/)
- [pyvi Vietnamese NLP](https://github.com/undertheseanlp/pyvi)
