# Streaming Implementation Guide
**Date:** 2026-02-13

---

## Why Streaming Matters

### User Expectations (2026 Standard)

ChatGPT normalized token-by-token streaming. Users now expect:
- **Instant feedback:** See response start within 300-700ms
- **Perceived speed:** Even if total time is same, streaming feels faster
- **Liveness:** Progressive text feels more interactive than batch delivery

### Non-Streaming Problems

**Current behavior:**
1. User sends message
2. 3-5 second wait (full response generation)
3. Entire paragraph appears at once
4. **Feels:** Broken, static, robotic

**With streaming:**
1. User sends message
2. 300-500ms wait
3. Text appears word-by-word
4. **Feels:** Responsive, alive, modern

---

## Server-Sent Events (SSE) vs WebSockets

### Comparison

| Feature | SSE | WebSockets |
|---------|-----|------------|
| **Direction** | Server → Client (one-way) | Bidirectional |
| **Protocol** | HTTP/1.1, HTTP/2 | Custom (WS protocol) |
| **Complexity** | Simple | Complex (connection management) |
| **LLM Standard** | ✅ OpenAI, Anthropic, Cohere | ❌ Uncommon |
| **Auto-Reconnect** | ✅ Built-in | Manual implementation |
| **Browser Support** | ✅ All modern browsers | ✅ All modern browsers |

### Recommendation: **Server-Sent Events (SSE)**

**Rationale:**
- One-directional streaming (exactly what LLM chat needs)
- Simpler than WebSockets (no connection lifecycle management)
- Industry standard for LLM streaming
- Built-in reconnection handling
- Works with existing HTTP infrastructure

**When to use WebSockets:**
- True bidirectional real-time (e.g., collaborative editing)
- Need to interrupt LLM mid-generation
- Custom real-time features

For SmartMoney chat: **SSE is sufficient**.

---

## Implementation Architecture

### Backend (FastAPI)

```python
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from anthropic import AsyncAnthropic
import json

router = APIRouter()

@router.post("/chat/stream")
async def chat_stream(
    request: ChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Stream chat response using SSE."""

    async def event_stream():
        try:
            # Build context
            context = build_financial_context(db, user.id)

            # Initialize Claude streaming
            client = AsyncAnthropic(api_key=settings.anthropic_api_key)

            async with client.messages.stream(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2048,
                temperature=0.7,
                system=context,
                messages=[{"role": m.role, "content": m.content} for m in request.messages],
            ) as stream:
                # Stream text deltas
                async for text in stream.text_stream:
                    yield f"data: {json.dumps({'type': 'delta', 'content': text})}\n\n"

            # Get final usage stats
            final_message = await stream.get_final_message()
            usage = {
                "input_tokens": final_message.usage.input_tokens,
                "output_tokens": final_message.usage.output_tokens
            }

            # Send completion event
            yield f"data: {json.dumps({'type': 'done', 'usage': usage})}\n\n"

        except Exception as e:
            # Send error event
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
```

### Frontend (React + EventSource)

```typescript
// services/chat-service.ts
export async function streamChatMessage(
  messages: ChatMessage[],
  language: string,
  onDelta: (text: string) => void,
  onDone: (usage: Usage) => void,
  onError: (error: string) => void
): Promise<void> {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify({ messages, language })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  // Read stream
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));

        if (data.type === 'delta') {
          onDelta(data.content);
        } else if (data.type === 'done') {
          onDone(data.usage);
        } else if (data.type === 'error') {
          onError(data.message);
        }
      }
    }
  }
}
```

### Component Integration

```typescript
// components/chat/ChatPanel.tsx
const [streamingMessage, setStreamingMessage] = useState<string>('');

const handleSendMessage = useCallback(async (content: string) => {
  const userMessage: ChatMessage = { role: 'user', content };
  const newMessages = [...messages, userMessage];
  setMessages(newMessages);
  setIsLoading(true);

  // Add placeholder for assistant message
  setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

  try {
    await streamChatMessage(
      newMessages,
      i18n.language,
      // On delta: append to last message
      (delta) => {
        setMessages(prev => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          lastMsg.content += delta;
          return updated;
        });
      },
      // On done: update credits
      (usage) => {
        setCredits(prev => prev - 1);
        setIsLoading(false);
      },
      // On error: show error message
      (error) => {
        setMessages(prev => [...prev.slice(0, -1), {
          role: 'assistant',
          content: t('chat.error')
        }]);
        setIsLoading(false);
      }
    );
  } catch (error) {
    console.error('Streaming error:', error);
    setIsLoading(false);
  }
}, [messages, i18n.language]);
```

---

## Performance Targets

### Time-to-First-Token (TTFT)

**Industry Standard (2026):** <300-700ms

**Factors affecting TTFT:**
- Model size (Sonnet: ~400ms, Opus: ~800ms)
- Context size (more tokens = slower)
- Server location (latency)

**Optimization:**
- Use Claude Sonnet (not Opus) for balance
- Minimize context size (sliding window)
- Server close to Anthropic API (AWS us-east-1)

### Token Latency

**Target:** 50-100ms between tokens

**Measurement:**
```python
import time

last_time = time.time()
async for text in stream.text_stream:
    now = time.time()
    latency = (now - last_time) * 1000  # ms
    logger.debug(f"Token latency: {latency:.2f}ms")
    last_time = now
```

---

## Tool Calling with Streaming (Hybrid Approach)

### Challenge

Tool calls require complete JSON (can't stream partial tool calls).

### Solution: 2-Phase Approach

**Phase 1: Non-Streaming Tool Discovery**
```python
# First API call: Detect if tools needed
response = await client.messages.create(
    model="claude-3-5-sonnet-20241022",
    messages=messages,
    tools=tool_definitions,
    max_tokens=2048
)

if has_tool_calls(response):
    # Execute tools, get results
    tool_results = await execute_tools(response.content)

    # Add tool results to conversation
    messages.append({"role": "assistant", "content": response.content})
    messages.append({"role": "user", "content": tool_results})

    # Phase 2: Stream final answer
    async with client.messages.stream(
        model="claude-3-5-sonnet-20241022",
        messages=messages
    ) as stream:
        async for text in stream.text_stream:
            yield text
else:
    # No tools needed, stream directly
    async with client.messages.stream(...) as stream:
        async for text in stream.text_stream:
            yield text
```

**UX Flow:**
1. User: "Show my budget and add ¥5000 expense"
2. *Phase 1 (non-streaming, 1-2s):* Detect tools needed
3. Frontend shows: "Fetching budget..." (loading state)
4. Tools execute (get_budget, create_transaction)
5. *Phase 2 (streaming, 2-3s):* Stream final response
6. User sees: "Your budget shows..." (token-by-token)

**Total time:** ~4-5s (similar to non-streaming, but better perceived latency for text response)

---

## Error Handling

### Connection Interruptions

**SSE auto-reconnects**, but handle gracefully:

```typescript
const eventSource = new EventSource('/api/chat/stream');

eventSource.onerror = (error) => {
  console.error('SSE error:', error);

  if (eventSource.readyState === EventSource.CLOSED) {
    // Connection permanently closed
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: t('chat.connectionLost')
    }]);
  } else {
    // Temporary error, will auto-reconnect
    console.log('SSE reconnecting...');
  }
};
```

### Partial Response Recovery

```typescript
// Store last complete message
let lastCompleteContent = '';

onDelta((delta) => {
  try {
    lastCompleteContent += delta;
    setMessages(prev => {
      // Update last message
      const updated = [...prev];
      updated[updated.length - 1].content = lastCompleteContent;
      return updated;
    });
  } catch (error) {
    // If error, keep last good state
    console.error('Delta update failed:', error);
  }
});
```

---

## Testing Streaming

### Manual Testing

```bash
# Test SSE endpoint with curl
curl -N -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}],"language":"en"}' \
  http://localhost:8000/api/chat/stream
```

Expected output:
```
data: {"type":"delta","content":"Hello"}

data: {"type":"delta","content":"!"}

data: {"type":"delta","content":" How"}

data: {"type":"done","usage":{"input_tokens":120,"output_tokens":45}}
```

### Automated Testing

```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_streaming_response(client: AsyncClient):
    async with client.stream(
        "POST",
        "/api/chat/stream",
        json={"messages": [{"role": "user", "content": "Test"}], "language": "en"}
    ) as response:
        assert response.status_code == 200

        chunks = []
        async for line in response.aiter_lines():
            if line.startswith("data: "):
                chunks.append(json.loads(line[6:]))

        # Verify received deltas and done event
        assert any(c["type"] == "delta" for c in chunks)
        assert chunks[-1]["type"] == "done"
```

---

## Rollout Strategy

### Phase 1: Non-Streaming (Current)

- Implement tool calling
- Test user satisfaction
- Collect latency metrics

### Phase 2: Streaming for Read-Only

- Enable streaming for queries (no tool calls)
- A/B test: 50% streaming, 50% non-streaming
- Measure: TTFT, user satisfaction, completion rate

### Phase 3: Hybrid Streaming (Tool Calling)

- Implement 2-phase approach
- Tool execution: Show loading state
- Final response: Stream text

### Metrics to Track

- **TTFT:** Time to first token (<500ms target)
- **Completion rate:** % of streams that complete successfully
- **User satisfaction:** Rating after conversation
- **Abandonment rate:** % users who close panel mid-stream

---

## References

- [Building Real-Time AI Chat Infrastructure](https://render.com/articles/real-time-ai-chat-websockets-infrastructure)
- [Why SSE Still Wins in 2026](https://procedure.tech/blogs/the-streaming-backbone-of-llms-why-server-sent-events-(sse)-still-wins-in-2025)
- [Streaming LLM Responses Guide](https://langtail.com/blog/llm-chat-streaming)
- [Importance of Streaming for LLM Chat](https://techcommunity.microsoft.com/blog/azuredevcommunityblog/the-importance-of-streaming-for-llm-powered-chat-applications/4459574)
