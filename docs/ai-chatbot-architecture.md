# Chatbot Architecture: On-Device vs. Cloud

**Context:** Technical decision framework for SmartMoney's conversational AI

## Privacy Risk Analysis

⚠️ **Cloud LLM APIs expose sensitive data:**
- OpenAI, Claude, Gemini APIs transmit transaction data to third parties
- No legal guarantee of data deletion (retention in fine-tuning pools)
- Competitor advantage to LLM providers
- Regulatory risk: GDPR, APPI violations (cross-border data transfer)

✅ **On-device LLMs protect privacy:**
- TinyLlama (1.1B params), Mistral 7B run locally
- Zero data transmission, full user control
- GDPR, APPI compliant (no cross-border transfer)

## Technical Approaches

### Option A: Cloud LLM (Easy, High Privacy Risk)
```python
# OpenAI API + RAG
user_query = "How much did I spend on dining last month?"
context = retrieve_user_transactions(query, limit=100)
prompt = f"User financial data: {context}\n\nQuestion: {user_query}"
response = openai.ChatCompletion.create(
    model="gpt-4",
    messages=[{"role": "user", "content": prompt}]
)
```
**Pros:** Sophisticated, instant, no training
**Cons:** Every query transmits transaction data; privacy disaster

### Option B: On-Device LLM (Hard, Privacy-First)
```javascript
// TinyLlama via ONNX.js
import * as ort from "onnxruntime-web";

const model = await ort.InferenceSession.create("tinyllama-q4.onnx");
const context = getLocalTransactionContext(userQuery);
const prompt = `You are a helpful financial assistant...
${context}
User: ${userQuery}
Assistant: `;

const output = await runInference(model, tokens);  // 5-30s
```
**Pros:** Zero transmission, GDPR/APPI compliant, competitive edge
**Cons:** 5-30s latency, lower accuracy, higher device requirements

### Option C: Hybrid (Recommended)
- Default: on-device for privacy
- Fallback: optional cloud with explicit consent
- User-configurable, privacy dashboard

## Model Selection

| Model | Size (Quantized) | Accuracy | Latency | License | Recommendation |
|-------|------------------|----------|---------|---------|-----------------|
| **TinyLlama 1.1B** | 2GB | Fair | 5-10s | MIT ✓ | Phase 1 (start here) |
| **Mistral 7B** | 4-5GB | Good | 15-30s | Apache 2.0 ✓ | Phase 2 (upgrade) |
| **Llama 2 7B** | 4GB | Good | 15-30s | Llama 2 License ⚠️ | Commercial use unclear |
| **OpenAI GPT-4** | N/A (cloud) | Excellent | <1s | Proprietary ✗ | Privacy risk |

**Recommendation:** Start with TinyLlama (MIT license, smallest), upgrade to Mistral if accuracy insufficient.

## Supported Query Types

### Tier 1: Spend Queries (Easiest)
- "How much did I spend on X?" → Category aggregation
- "Top merchants last month?" → Ranking query
- "Dining spending trend?" → YoY comparison

### Tier 2: Budget Queries (Medium)
- "Am I on track for my budget?" → Budget utilization
- "How much left in X?" → Remaining balance
- "Where did I overspend?" → Category analysis

### Tier 3: Goal Queries (Medium)
- "How close to savings goal?" → Goal progress
- "How much per month to hit goal?" → Math calculation
- "Which category to cut to hit goal?" → Recommendation

### Tier 4: Financial Advice (Hard, Cloud-Only or Human)
- "Should I invest in X?" → Do NOT answer (regulatory)
- "How do I file taxes?" → Do NOT answer (legal)
- "What's my net worth?" → Calculate locally if possible

## Implementation Phases

**Phase 1 (Weeks 1-8): On-Device Foundation**
- TinyLlama model + ONNX.js integration
- Tier 1-3 query support
- Local transaction context retrieval
- Error handling + graceful fallbacks

**Phase 2 (Weeks 9-16): Cloud Fallback + Privacy**
- Optional cloud chat (user consent)
- Privacy dashboard
- Data anonymization (send summaries, not raw transactions)
- Fine-tuning data collection (opt-in)

## Key Challenges

1. **Latency:** 5-30s (mitigate with streaming, spinners)
2. **Accuracy:** Smaller models hallucinate (validate responses against data)
3. **Context Window:** TinyLlama 2K tokens (Mistral 4-8K)
4. **Device Compatibility:** Requires 4GB+ RAM, WebGL

## Privacy Safeguards (Default)

✅ All chat on-device, no transmission
✅ Local conversation history, encrypted
✅ No telemetry, no tracking what users ask
✅ Model quantized, reduced size

**Optional (Explicit Consent):**
⚠️ Cloud chat (show consent flow before each query)
⚠️ Chat history transmission (user downloads → sends)
⚠️ Fine-tuning contribution (anonymous chats improve model)

## References

- [On-Device AI Architecture](https://theuxda.com/blog/apples-device-ai-vs-cloud-ai-who-will-start-age-personalized-banking-ux/)
- [TinyLlama GitHub](https://github.com/jzhang38/TinyLlama)
- [Mistral 7B Model Card](https://huggingface.co/mistralai/Mistral-7B)
- [ONNX.js Documentation](https://onnx.ai/onnx-web/)
- [Privacy-First AI Innovation](https://aicompetence.org/air-gapped-ai-and-privacy-first-innovation/)
