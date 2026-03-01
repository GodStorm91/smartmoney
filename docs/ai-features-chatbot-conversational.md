# Conversational AI & Chatbot Features

**Demand:** VERY HIGH
**Complexity:** HIGH
**Competitive Edge:** MEDIUM
**Privacy Risk:** HIGH (without mitigation)

## What's Shipping in 2025-2026

- **TalkieMoney**: Voice + text NLP; "How much did I spend on groceries last month?" → instant answer
- **Copilot Money**: Chat interface, natural language search, financial goal suggestions
- **Monarch Money**: Plain English queries, smart recommendations
- **Cleo**: AI assistant for behavioral coaching, day-to-day money management
- **Industry trends**: 43% of US banking customers prefer chatbots over branches; 50%+ of fintech users experimenting with GenAI
- **Integration pattern**: Major payment platforms partnering with LLM providers (OpenAI, etc.)

## User Demand

- **Very high engagement:** Chatbot-enabled apps show higher daily/weekly active usage
- **Mobile preference:** Younger users prefer conversational interface (text/voice) over forms
- **24/7 availability:** Unlike human support, chatbots are always available
- **Perceived intelligence:** Users engage more with natural-sounding, contextual responses

## Privacy Risk (Critical for SmartMoney)

⚠️ **Cloud LLM APIs expose sensitive data:**
- OpenAI, Claude, Gemini APIs transmit transaction data to third parties
- No legal guarantee of data deletion (retention in fine-tuning pools)
- Competitor advantage to LLM providers (e.g., OpenAI sees your spending patterns)
- Regulatory risk: GDPR, APPI violations (data transfers to US)

✅ **On-device LLMs protect privacy:**
- TinyLlama (1.1B params), Mistral 7B, Llama 2 can run locally
- No data transmission, full user control
- Compliance with GDPR, APPI (no cross-border transfer)

## Technical Approaches

### Option A: Cloud LLM (Easy, High Privacy Risk)
**Stack:** OpenAI API + RAG (retrieval-augmented generation)

```python
# Pseudo-code
user_query = "How much did I spend on dining last month?"
context = retrieve_user_transactions(query, limit=100)
prompt = f"User financial data: {context}\n\nQuestion: {user_query}"
response = openai.ChatCompletion.create(
    model="gpt-4",
    messages=[{"role": "user", "content": prompt}]
)
```

**Pros:** Sophisticated responses, handles follow-up context, no training
**Cons:** Every query transmits transaction data to OpenAI, privacy disaster for SmartMoney, cost scales with usage

### Option B: On-Device LLM (Hard, Privacy-First)
**Stack:** TinyLlama (1.1B) or Mistral 7B running locally

```python
# Pseudo-code (web-based, using ONNX.js)
import * as ort from "onnxruntime-web";

// Load quantized model (~2-4GB, loads once)
const model = await ort.InferenceSession.create("tinyllama-q4.onnx");

// Local prompt construction
const context = getLocalTransactionContext(userQuery);
const prompt = `You are a helpful financial assistant.
User data (transactions):
${context}

User: ${userQuery}
Assistant: `;

// Run inference locally (5-30s depending on response length)
const tokens = await tokenizer.encode(prompt);
const output = await runInference(model, tokens);
const response = await tokenizer.decode(output);
```

**Pros:** Zero data transmission, GDPR/APPI compliant, competitive edge
**Cons:** Slower (latency 5-30s), lower accuracy than GPT-4, requires device resources, limited context window

### Option C: Hybrid (Recommended for SmartMoney)
**Stack:** On-device LLM + optional cloud fallback

```python
# Try on-device first
try:
    response = llm_local.chat(user_query, transaction_context)
except Exception as e:  # Timeout or unsupported query
    # Fallback to cloud with explicit consent
    if user.has_opted_in_to_cloud_chat:
        response = openai.ChatCompletion.create(...)
    else:
        response = "This query is complex; please contact support"
```

**Pros:** Privacy-first by default, fallback for edge cases, user control
**Cons:** Complexity, versioning (on-device vs. cloud model drift)

## SmartMoney Recommendation: Hybrid On-Device + Optional Cloud

### Phase 1: On-Device Chat (Weeks 1-8)

**Model Selection:**
- **TinyLlama (1.1B):** Smallest, runs in browser + mobile, ~2GB quantized
- **Mistral 7B:** Better quality, ~4GB quantized, still manageable
- **Recommendation:** Start TinyLlama, upgrade to Mistral if quality insufficient

**Supported Queries:**
1. **Spending questions:** "How much did I spend on X?" → Retrieve + aggregate locally
2. **Budget status:** "Am I on track for dining budget?" → Query budget balance
3. **Goal progress:** "How close am I to my savings goal?" → Calculate progress
4. **Trend analysis:** "How does this month compare to last?" → YoY comparison
5. **Basic recommendations:** "What categories can I cut?" → Suggest discretionary spending

**Out of Scope (Require Cloud or Human):**
- Financial advice ("Should I invest in X?")
- Tax implications ("How do I file?")
- Complex calculations ("Calculate tax-loss harvesting")
- Account-related issues ("Why did my transaction fail?")

### Phase 2: Cloud Integration + On-Device Fine-Tuning (Weeks 9-16)

1. **Optional cloud chat** — User can opt-in for more sophisticated responses
2. **Explicit consent flow** — "Share this conversation with OpenAI for better answers?"
3. **Privacy dashboard** — Show what data was sent, allow deletion
4. **Fine-tuning data collection** — If user opts in, use chats to fine-tune local model

### Implementation Roadmap (8-12 weeks, 2-3 engineers)

#### Week 1-2: Setup & Integration
- [ ] Evaluate TinyLlama vs. Mistral (accuracy, latency, size)
- [ ] Set up ONNX.js for web + TFLite for mobile
- [ ] Build transaction retrieval API (filters, aggregations)
- [ ] Design chat UI (mobile-first, toast notifications for long responses)

#### Week 3-4: Basic Queries
- [ ] "How much did I spend on X last month?" → Category aggregation
- [ ] "What was my budget for X?" → Budget query
- [ ] "Am I on track?" → Budget utilization calculation

#### Week 5-6: Context & Memory
- [ ] Store conversation history (local, encrypted)
- [ ] Multi-turn context (follow-up questions: "What about the month before?")
- [ ] Session management (clear chat on logout)

#### Week 7-8: Refinement & Testing
- [ ] Prompt engineering (instruction tuning for finance domain)
- [ ] Latency optimization (streaming responses, caching)
- [ ] Error handling (fallback messages when confused)
- [ ] User acceptance testing

#### Week 9-12: Cloud Fallback (Phase 2)
- [ ] Optional cloud chat toggle in settings
- [ ] Consent flow with data handling disclosure
- [ ] Send only anonymized transaction summaries (not raw data) to OpenAI
- [ ] Privacy dashboard showing what was sent

## Prompt Engineering (Domain-Specific)

### System Prompt for Finance Assistant
```
You are a helpful personal finance assistant. You help users understand their spending, budgets, and financial goals.

CONSTRAINTS:
- Only answer questions about the user's own financial data
- Do NOT provide investment, tax, or legal advice
- If unsure, say "I'm not sure about that. Please contact support"
- Be concise; most answers should be 1-2 sentences
- Use the user's local currency (JPY, VND, USD)

USER DATA CONTEXT:
- Spending this month: {total_spending} {currency}
- Budget: {budget_amount}
- Top categories: {top_categories}
- Active goals: {goals_list}

AVAILABLE COMMANDS (you can use these):
- BALANCE: Get budget/goal balance
- SPENDING: Get spending for category/timeframe
- TREND: Compare YoY trends
- GOAL_PROGRESS: Show goal progress
```

## Key Technical Challenges

### 1. Latency
- On-device LLM: 5-30s per response (not instant like cloud)
- **Mitigation:** Stream tokens as they generate, show spinner, cache common queries

### 2. Model Accuracy
- Smaller models (1-7B) make mistakes (hallucinations, wrong numbers)
- **Mitigation:** Validate responses against actual data before showing, show confidence scores

### 3. Context Window
- TinyLlama: 2,048 tokens (~1500 words)
- Mistral 7B: 4,096-8,192 tokens (~3000 words)
- **Mitigation:** Summarize old transactions, keep context relevant (last 90 days)

### 4. Device Compatibility
- Browser: WebGL required, 4GB+ RAM recommended
- Mobile: iOS 14+, Android 8+, 2GB+ available RAM
- **Mitigation:** Offer fallback web version, detect device capabilities

## Privacy Safeguards

### Default (Privacy-First)
- ✅ All chat on-device, no transmission
- ✅ Conversation history stored locally, encrypted
- ✅ Model quantized (no float32 precision), reduced model size
- ✅ No telemetry (don't track what users ask)

### Optional (User Consent Required)
- ⚠️ Cloud chat (explicit opt-in)
- ⚠️ Chat history transmission (show data → download → send)
- ⚠️ Fine-tuning contribution (anonymous chats used to improve model)

### Privacy Dashboard
```
Chat Privacy Status:
✅ All conversations are stored locally on your device
✅ No data is sent to servers

To enable cloud chat for more sophisticated answers:
[Toggle Cloud Chat] - Off

If enabled, you will be asked for consent before sending each query.
View Data [Shows what would be sent]
```

## Competitive Differentiation

1. **Privacy-first stance** — "Your chats never leave your device" vs. Copilot/Cleo (cloud-based)
2. **Transparent fallback** — Clear when using cloud, explicit consent
3. **Multilingual** — Japanese/Vietnamese LLM fine-tuning (rare in fintech chat)
4. **Offline capability** — Works without internet (on-device model)

## Metrics to Track

1. **Engagement:** Daily/weekly active chat users, avg queries/session
2. **Accuracy:** % of responses that correctly answer the question (human review + automated checks)
3. **Latency:** P50/P95 response time
4. **Privacy:** % of users who trust the chat feature, survey sentiment
5. **Error rate:** % of hallucinations (wrong numbers, made-up facts)

## Unresolved Questions

1. **Which model to ship first?** TinyLlama (smaller, less capable) vs. Mistral 7B (better, bigger)?
2. **On-device LLM licensing:** TinyLlama is MIT-licensed; Mistral 7B can be used commercially?
3. **Streaming responses:** Can ONNX.js stream tokens, or only full inference?
4. **Device compatibility:** What % of SmartMoney users have 4GB+ RAM?
5. **Cloud fallback implementation:** Use OpenAI, Claude, or open-source self-hosted?

## References

- [Finance AI Chatbots 2025](https://kaopiz.com/en/articles/finance-ai-chatbots/)
- [Conversational AI in Fintech](https://www.zendesk.com/blog/fintech-chatbot/)
- [TalkieMoney App](https://talkiemoney.com/en/)
- [Privacy-First AI Architecture](https://theuxda.com/blog/apples-device-ai-vs-cloud-ai-who-will-start-age-personalized-banking-ux/)
- [On-Device AI Innovation](https://aicompetence.org/air-gapped-ai-and-privacy-first-innovation/)
- [TinyLlama Documentation](https://github.com/jzhang38/TinyLlama)
- [Mistral 7B Model Card](https://huggingface.co/mistralai/Mistral-7B)
