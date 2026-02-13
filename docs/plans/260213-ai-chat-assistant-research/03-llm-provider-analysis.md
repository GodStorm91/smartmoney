# LLM Provider Analysis
**Date:** 2026-02-13

---

## Anthropic Claude (Recommended)

### Why Claude

**Existing Integration:**
- API key already configured (`ANTHROPIC_API_KEY`)
- SDK installed (`anthropic` Python package)
- Working budget generation endpoint

**Advantages:**
- Best-in-class tool calling (2026 features)
- Built-in token-efficient tool use
- Excellent multilingual support (Japanese, Vietnamese, English)
- Strict schema validation (`strict: true` flag)
- Managed programmatic tool calling (sandboxed execution)

### Model Comparison

| Model | Context Window | Cost (per 1M tokens) | Tool Calling | Use Case |
|-------|----------------|----------------------|--------------|----------|
| **Claude Opus 4.6** | 200k | $15/$75 (in/out) | Excellent | Complex multi-tool queries |
| **Claude Sonnet 3.5** | 200k | $3/$15 (in/out) | Very Good | Production balance ✅ |
| **Claude Haiku 3.5** | 200k | $0.80/$4 (in/out) | Basic | Simple queries (current) |

**Recommendation:** Upgrade to **Claude Sonnet 3.5**
- 5x more capability than Haiku
- Still affordable (~$0.05 per chat message)
- Production-grade tool calling support

### 2026 Feature Highlights

**1. Tool Search Tool**
- Access thousands of tools without consuming context
- Tool definitions stored externally
- Only loads required tools dynamically

**2. Programmatic Tool Calling**
- Managed sandboxed Python execution environment
- Anthropic handles container management
- Reduces context window impact
- Secure tool invocation communication

**3. Parallel Tool Calling**
- Execute multiple independent tools simultaneously
- Reduces latency for multi-step operations

**4. Example-Based Learning**
- Include concrete tool call examples in prompts
- Shows when to use optional parameters
- Demonstrates correct formats for complex inputs

**5. Strict Schema Validation**
- Set `strict: true` in tool definitions
- Enforces exact schema matches
- Eliminates type mismatches and missing fields
- Perfect for production agents

### Best Practices (from Anthropic Docs)

1. **Include Examples:** Add concrete patterns alongside schemas
2. **Use Strict Mode:** Prevent invalid tool parameters
3. **Sequential Dependencies:** Claude calls one tool at a time when output of one feeds another
4. **Build Evaluations:** Systematic performance measurement
5. **Optimize with Claude Code:** Automated tool optimization

### Cost Analysis

**Typical Chat Scenario (Sonnet 3.5):**

**Input tokens:**
- System prompt: ~2,000 tokens
- Financial context: ~11,000 tokens (30-day transactions + budget + goals)
- User message: ~50 tokens
- **Total input:** 13,050 tokens → **$0.039**

**Output tokens:**
- AI response: ~500 tokens → **$0.0075**

**Total cost per message:** ~$0.05

**Credit pricing:**
- Current: 1 credit = 1 message
- Recommended: 1 credit = $0.10 (2x margin)
- Heavy users (long context): Consider tiered pricing

---

## Alternative Providers (Not Recommended)

### OpenAI GPT-4o

**Advantages:**
- Strong function calling
- Fast response times
- Good developer documentation

**Disadvantages:**
- ❌ No existing integration (new setup required)
- ❌ Higher cost than Claude Sonnet
- ❌ Weaker multilingual (Japanese quality concerns)
- ❌ Function calling less mature than Claude tools

**Verdict:** Not worth migration effort.

### Google Gemini 1.5 Pro

**Advantages:**
- Massive context window (1M tokens)
- Multimodal capabilities
- Competitive pricing

**Disadvantages:**
- ❌ No existing integration
- ❌ Function calling less mature
- ❌ Fewer production case studies
- ❌ Japanese quality unproven

**Verdict:** Consider only if context window becomes critical bottleneck (unlikely with sliding window strategy).

### Open Source Models (Llama 3, Mixtral)

**Advantages:**
- Zero API costs (after hosting)
- Full control over infrastructure
- Privacy (no data leaves server)

**Disadvantages:**
- ❌ Hosting costs (GPU required)
- ❌ Maintenance overhead
- ❌ Weaker tool calling than Claude
- ❌ Slower iteration speed

**Verdict:** Premature optimization (YAGNI).

---

## Decision Matrix

| Criteria | Claude Sonnet | GPT-4o | Gemini | Open Source |
|----------|---------------|--------|--------|-------------|
| **Integration Effort** | Low (existing) | High | High | Very High |
| **Tool Calling Quality** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Cost** | Medium | Medium-High | Low | High (hosting) |
| **Japanese Quality** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Context Window** | 200k | 128k | 1M | 32-128k |
| **Streaming** | ✅ SSE | ✅ SSE | ✅ SSE | ✅ Custom |
| **Production Ready** | ✅ | ✅ | ⚠️ | ❌ |

**Winner:** Claude Sonnet 3.5

---

## Implementation Notes

### Model Upgrade Path

**Current:**
```python
self.model = "claude-3-5-haiku-20241022"
```

**Recommended:**
```python
self.model = "claude-3-5-sonnet-20241022"
```

**Rollback Plan:**
- Keep Haiku as fallback for simple queries
- Route complex queries (tool calling) to Sonnet
- Route simple queries (explanations) to Haiku
- Implement model selection logic based on query complexity

### API Configuration

**Required settings:**
```python
# config.py
ANTHROPIC_API_KEY = settings.anthropic_api_key  # Already exists
ANTHROPIC_MODEL = "claude-3-5-sonnet-20241022"
ANTHROPIC_MAX_TOKENS = 2048
ANTHROPIC_TEMPERATURE = 0.7  # Balance creativity and consistency
```

### Token Tracking

**Monitor usage:**
- Input tokens: Track context size growth
- Output tokens: Detect verbose responses
- Total tokens per session: Identify heavy users
- Cost per user: Inform pricing strategy

**Alert thresholds:**
- Single message >20k input tokens: Context optimization needed
- Single message >2k output tokens: Response too verbose
- User session >100k total tokens/day: Potential abuse

---

## References

- [Advanced Tool Use (Anthropic)](https://www.anthropic.com/engineering/advanced-tool-use)
- [Claude API Tool Use Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [Programmatic Tool Calling](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling)
- [Claude Function Calling Guide (Composio)](https://composio.dev/blog/claude-function-calling-tools)
