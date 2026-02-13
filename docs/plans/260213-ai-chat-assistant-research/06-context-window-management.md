# Context Window Management Strategies
**Date:** 2026-02-13

---

## Challenge

Financial apps generate large data volumes. Challenge is fitting transaction history + budget + goals into LLM context without hitting limits or incurring excessive costs.

## Token Budget Estimation

### Typical SmartMoney Context

| Data Type | Size | Token Estimate |
|-----------|------|----------------|
| System prompt | 500 words | ~2,000 tokens |
| 90-day transactions (270 records) | ~40KB | ~10,000 tokens |
| Budget allocations (20 categories) | ~2KB | ~500 tokens |
| Goals (4 goals) | ~800 bytes | ~200 tokens |
| User message history (10 messages) | ~2KB | ~500 tokens |
| **Total** | **~45KB** | **~13,200 tokens** |

### Claude Sonnet 3.5 Capacity

- **Context window:** 200,000 tokens
- **SmartMoney usage:** ~13,200 tokens (6.6% of capacity)
- **Verdict:** Plenty of headroom for MVP

---

## Strategy 1: Sliding Window (Recommended)

### Pattern

Keep recent data only, discard old:

```python
def build_context_sliding_window(db: Session, user_id: int) -> dict:
    """Build context with sliding window strategy."""

    # Last 30 days only (not 90) → ~3,000 tokens
    transactions = get_recent_transactions(db, user_id, days=30)

    # Summarize instead of full details
    summary = {
        "total_income": sum(t.amount for t in transactions if t.is_income),
        "total_expenses": sum(abs(t.amount) for t in transactions if not t.is_income),
        "net_cashflow": sum(t.amount for t in transactions),
        "transaction_count": len(transactions),
        "top_categories": get_top_spending_categories(transactions, limit=5)
    }

    # Keep last 10 messages only
    recent_messages = messages[-10:]

    return {
        "transactions_summary": summary,
        "budget": get_budget(db, user_id),
        "goals": get_goals(db, user_id),
        "messages": recent_messages
    }
```

### Pros
- Simple to implement
- Predictable token usage (always ~3k tokens)
- Fast (no vector search)
- No external dependencies

### Cons
- Loses context beyond 30 days
- Can't answer "Show expenses from 2 months ago"

### When to Use
- MVP phase (Phase 1)
- Most users only care about recent data
- Acceptable tradeoff for simplicity

---

## Strategy 2: Summarization

### Pattern

Compress old data into summaries:

```python
def summarize_old_transactions(db: Session, user_id: int) -> str:
    """Summarize transactions older than 30 days."""

    old_txs = get_transactions(db, user_id, start_date=90_days_ago, end_date=30_days_ago)

    summary = f"""HISTORICAL SUMMARY (31-90 days ago):
- Total transactions: {len(old_txs)}
- Average monthly income: ¥{calculate_avg_monthly_income(old_txs):,}
- Average monthly expenses: ¥{calculate_avg_monthly_expenses(old_txs):,}
- Top category: {get_top_category(old_txs)}
"""
    return summary
```

### Pros
- Retains historical insights
- Fixed token budget
- Balanced detail vs context length

### Cons
- Loses granular detail
- Summary may miss important patterns
- Requires custom summarization logic

### When to Use
- Phase 2 enhancement
- Users frequently ask about trends
- Need more than 30-day window

---

## Strategy 3: RAG (Retrieval-Augmented Generation)

### Pattern

Store all transactions in vector DB, retrieve relevant subset:

```python
from chromadb import Client

# Setup vector store
vectorstore = Client()
collection = vectorstore.create_collection("transactions")

# Store transaction embeddings
for tx in all_transactions:
    embedding = embed_transaction(tx)  # OpenAI embedding API
    collection.add(
        ids=[str(tx.id)],
        embeddings=[embedding],
        metadatas=[{"description": tx.description, "category": tx.category, "amount": tx.amount}]
    )

# Retrieve relevant transactions
def get_relevant_transactions(query: str, k: int = 20) -> list:
    """Fetch transactions semantically similar to query."""
    query_embedding = embed_text(query)
    results = collection.query(query_embeddings=[query_embedding], n_results=k)
    return results["metadatas"][0]
```

### Pros
- Scales to unlimited transaction history
- Only fetches relevant context
- Semantic search (better than keyword)

### Cons
- Adds complexity (vector DB setup)
- Embedding API costs ($0.13 per 1M tokens for OpenAI)
- Latency overhead (embedding + search)
- Infrastructure dependency (ChromaDB, Pinecone, etc.)

### When to Use
- Power users with 10k+ transactions
- Hitting context limits with sliding window
- Budget for embedding costs
- Phase 3 or later

---

## Strategy 4: Conversation Summarization

### Pattern

Compress old conversation history:

```python
async def summarize_conversation(messages: list[ChatMessage]) -> str:
    """Summarize old messages to save tokens."""

    if len(messages) <= 10:
        return messages  # No summarization needed

    # Summarize messages 0-5
    old_messages = messages[:6]
    old_text = "\n".join([f"{m.role}: {m.content}" for m in old_messages])

    summary_response = await client.messages.create(
        model="claude-3-5-haiku-20241022",  # Use cheaper model
        max_tokens=200,
        messages=[{
            "role": "user",
            "content": f"Summarize this conversation in 2-3 sentences:\n\n{old_text}"
        }]
    )

    summary = summary_response.content[0].text

    # Replace old messages with summary
    return [
        {"role": "system", "content": f"Previous conversation summary: {summary}"},
        *messages[6:]  # Keep recent messages verbatim
    ]
```

### Pros
- Maintains conversation continuity
- Reduces token usage for long sessions
- Uses cheap model for summarization

### Cons
- Extra API call (cost + latency)
- Summary may lose important details
- Complexity

### When to Use
- Long conversations (>20 messages)
- Users chatting for extended sessions
- Phase 2-3 enhancement

---

## Cost-Benefit Analysis

### Token Costs (Claude Sonnet 3.5)

| Context Size | Input Cost | Total Chat Cost | Strategy |
|--------------|------------|-----------------|----------|
| 3,000 tokens | $0.009 | $0.016/message | Sliding window |
| 13,000 tokens | $0.039 | $0.046/message | Full context |
| 30,000 tokens | $0.090 | $0.097/message | No optimization |

**Savings:** Sliding window saves ~$0.03 per message (65% cost reduction)

### RAG Additional Costs

- **Embedding:** OpenAI text-embedding-3-small at $0.02 per 1M tokens
- **Per transaction:** ~100 tokens × $0.00000002 = $0.000002
- **1000 transactions:** $0.002 (one-time embedding cost)
- **Query embedding:** ~50 tokens = $0.000001 per query

**Verdict:** RAG embedding costs negligible compared to LLM inference.

---

## Recommended Approach (Phased)

### Phase 1: Sliding Window
- 30-day transaction window
- Last 10 messages
- **Target:** ~5,000 total tokens
- **Cost:** ~$0.02 per message

### Phase 2: Summarization
- 30-day full detail + 60-day summary
- Conversation summarization for long sessions
- **Target:** ~8,000 total tokens
- **Cost:** ~$0.03 per message

### Phase 3: RAG
- Unlimited transaction history
- Semantic search for relevant context
- **Target:** ~10,000 total tokens (always top-k relevant)
- **Cost:** ~$0.04 per message + embedding overhead

---

## Implementation Example

```python
class ContextManager:
    """Manage financial context for chat."""

    def __init__(self, db: Session, user_id: int, strategy: str = "sliding_window"):
        self.db = db
        self.user_id = user_id
        self.strategy = strategy

    def build_context(self, messages: list[ChatMessage]) -> str:
        """Build context based on strategy."""

        if self.strategy == "sliding_window":
            return self._sliding_window_context(messages)
        elif self.strategy == "summarization":
            return self._summarization_context(messages)
        elif self.strategy == "rag":
            return self._rag_context(messages)
        else:
            raise ValueError(f"Unknown strategy: {self.strategy}")

    def _sliding_window_context(self, messages: list[ChatMessage]) -> str:
        """30-day window, last 10 messages."""
        transactions = get_recent_transactions(self.db, self.user_id, days=30)
        budget = get_budget(self.db, self.user_id)
        goals = get_goals(self.db, self.user_id)

        return format_context(
            transactions=summarize_transactions(transactions),
            budget=budget,
            goals=goals,
            messages=messages[-10:]
        )

    # Other strategies...
```

---

## References

- [Context Window Management Strategies](https://www.getmaxim.ai/articles/context-window-management-strategies-for-long-context-ai-agents-and-chatbots/)
- [LLM Context Management Guide](https://eval.16x.engineer/blog/llm-context-management-guide)
- [Best LLMs for Extended Context Windows](https://aimultiple.com/ai-context-window)
