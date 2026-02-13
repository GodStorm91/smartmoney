# State Management Patterns for AI Chat
**Date:** 2026-02-13

---

## Current Implementation

**Location:** `ChatPanel.tsx` component local state

```typescript
const [messages, setMessages] = useState<ChatMessage[]>([]);
const [isLoading, setIsLoading] = useState(false);
const [credits, setCredits] = useState<number | null>(null);
```

**Issue:** Messages lost on panel close (no persistence).

---

## Option 1: localStorage + React State (Recommended)

### Pattern

Persist to browser localStorage, sync with component state.

### Implementation

```typescript
// components/chat/ChatPanel.tsx
const STORAGE_KEY = 'smartmoney_chat_history';
const MAX_STORED_MESSAGES = 20;

const [messages, setMessages] = useState<ChatMessage[]>(() => {
  // Load from localStorage on mount
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse chat history:', e);
      return [];
    }
  }
  return [];
});

// Persist to localStorage on change
useEffect(() => {
  // Keep last 20 messages only (prevent storage bloat)
  const toStore = messages.slice(-MAX_STORED_MESSAGES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
}, [messages]);

// Clear history helper
const clearHistory = useCallback(() => {
  setMessages([]);
  localStorage.removeItem(STORAGE_KEY);
}, []);
```

### Pros
- Simple implementation (no new dependencies)
- Survives page refresh, panel close
- Fast (synchronous access)
- Works offline

### Cons
- Limited to single browser/device
- 5MB storage limit (20 messages ≈ 50KB, well under limit)
- Not synced across tabs

### When to Use
- Phase 1 (MVP)
- Most users access from single device
- No cross-tab sync needed

---

## Option 2: Zustand Global State

### Pattern

Global state store accessible from any component.

### Implementation

```typescript
// stores/chat-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ChatStore {
  messages: ChatMessage[];
  isOpen: boolean;
  credits: number | null;
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  setOpen: (open: boolean) => void;
  setCredits: (credits: number) => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      messages: [],
      isOpen: false,
      credits: null,
      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages.slice(-19), message]  // Keep last 20
        })),
      clearMessages: () => set({ messages: [] }),
      setOpen: (open) => set({ isOpen: open }),
      setCredits: (credits) => set({ credits })
    }),
    {
      name: 'smartmoney-chat-storage',  // localStorage key
      partialize: (state) => ({ messages: state.messages })  // Only persist messages
    }
  )
);

// components/chat/ChatPanel.tsx
const { messages, addMessage, clearMessages, credits, setCredits } = useChatStore();
```

### Pros
- Accessible from anywhere (dashboard, settings, etc.)
- Automatic persistence (via middleware)
- Cleaner code (no useEffect for sync)
- Built-in dev tools

### Cons
- New dependency (zustand)
- Slight complexity increase
- Overkill if only used in ChatPanel

### When to Use
- Phase 2+
- Need chat access from multiple pages
- Want centralized state management

---

## Option 3: React Query (Server State)

### Pattern

Store chat history on backend, sync with React Query cache.

### Implementation

```typescript
// services/chat-service.ts
export async function getChatHistory(userId: number): Promise<ChatMessage[]> {
  const response = await apiClient.get(`/api/chat/history/${userId}`);
  return response.data;
}

export async function saveChatHistory(userId: number, messages: ChatMessage[]): Promise<void> {
  await apiClient.post(`/api/chat/history/${userId}`, { messages });
}

// components/chat/ChatPanel.tsx
const { data: messages = [], refetch } = useQuery({
  queryKey: ['chatHistory', userId],
  queryFn: () => getChatHistory(userId)
});

const saveMutation = useMutation({
  mutationFn: (messages: ChatMessage[]) => saveChatHistory(userId, messages),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['chatHistory', userId] });
  }
});

// Save after each message
useEffect(() => {
  if (messages.length > 0) {
    saveMutation.mutate(messages);
  }
}, [messages]);
```

### Pros
- Synced across devices
- Backed up on server
- No localStorage limits
- Can implement server-side features (search, export)

### Cons
- Backend changes required (new endpoint + DB table)
- Network latency for load/save
- More complex
- Requires auth

### When to Use
- Multi-device sync critical
- Long-term history retention needed
- Phase 3+

---

## Comparison Matrix

| Feature | localStorage | Zustand | React Query |
|---------|--------------|---------|-------------|
| **Persistence** | ✅ Browser only | ✅ Browser only | ✅ Cross-device |
| **Implementation** | Simple | Medium | Complex |
| **Dependencies** | None | zustand | Backend + DB |
| **Cross-tab sync** | ❌ No | ❌ No | ✅ Yes |
| **Offline support** | ✅ Full | ✅ Full | ⚠️ Cached only |
| **Storage limit** | 5MB | 5MB | Unlimited |
| **Recommended phase** | Phase 1 | Phase 2 | Phase 3 |

---

## Recommended Approach

### Phase 1: localStorage
- Fastest to implement
- Meets MVP requirements
- No backend changes

### Phase 2: Zustand (Optional)
- If need chat access from dashboard
- Cleaner state management
- Easy migration from localStorage

### Phase 3: React Query (Optional)
- If users request multi-device sync
- Requires backend work (new DB table)
- Best for long-term history

---

## Migration Path

### From localStorage to Zustand

```typescript
// 1. Install zustand
npm install zustand

// 2. Create store (copies localStorage pattern)
export const useChatStore = create(
  persist(
    (set) => ({ /* store definition */ }),
    { name: 'smartmoney_chat_history' }  // Same key as localStorage
  )
);

// 3. Replace useState with useChatStore
- const [messages, setMessages] = useState([]);
+ const { messages, addMessage } = useChatStore();

// Done! Zustand automatically migrates existing localStorage data
```

### From Zustand to React Query

```typescript
// 1. Add backend endpoint
@router.get("/chat/history/{user_id}")
async def get_chat_history(user_id: int):
    # Fetch from DB

@router.post("/chat/history/{user_id}")
async def save_chat_history(user_id: int, messages: list[ChatMessage]):
    # Save to DB

// 2. One-time migration: Upload localStorage to backend
const migrateToServer = async () => {
  const localMessages = useChatStore.getState().messages;
  await saveChatHistory(userId, localMessages);
  useChatStore.getState().clearMessages();  // Clear local
};

// 3. Replace Zustand with React Query
- const { messages } = useChatStore();
+ const { data: messages } = useQuery(['chatHistory', userId], getChatHistory);
```

---

## Storage Schema

### localStorage Format

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Show my budget",
      "timestamp": "2026-02-13T10:30:00Z"
    },
    {
      "role": "assistant",
      "content": "Your budget shows...",
      "timestamp": "2026-02-13T10:30:02Z",
      "action": null
    }
  ]
}
```

### Backend DB Schema (Phase 3)

```sql
CREATE TABLE chat_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    role VARCHAR(10) NOT NULL,  -- 'user' or 'assistant'
    content TEXT NOT NULL,
    action JSONB,  -- Suggested action if any
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_chat_user_created ON chat_history(user_id, created_at DESC);
```

---

## Cleanup Strategy

### Automatic Cleanup

```typescript
// Keep only last 20 messages
const MAX_MESSAGES = 20;

const addMessage = (message: ChatMessage) => {
  setMessages(prev => [...prev.slice(-MAX_MESSAGES + 1), message]);
};
```

### Manual Cleanup

```typescript
// Add "Clear history" button in ChatHeader
<button onClick={clearHistory}>Clear History</button>

const clearHistory = () => {
  if (confirm('Clear all chat history?')) {
    setMessages([]);
    localStorage.removeItem('smartmoney_chat_history');
  }
};
```

### Expiry-Based Cleanup

```typescript
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;  // ISO date
  action?: SuggestedAction;
}

// Remove messages older than 7 days
const cleanOldMessages = (messages: ChatMessage[]) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  return messages.filter(m => new Date(m.timestamp) > sevenDaysAgo);
};

// Run on load
useEffect(() => {
  setMessages(prev => cleanOldMessages(prev));
}, []);
```

---

## Testing

### localStorage Tests

```typescript
describe('ChatPanel persistence', () => {
  it('loads messages from localStorage on mount', () => {
    localStorage.setItem('smartmoney_chat_history', JSON.stringify([
      { role: 'user', content: 'Test message' }
    ]));

    render(<ChatPanel isOpen={true} onClose={() => {}} />);

    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('persists messages to localStorage on change', () => {
    const { rerender } = render(<ChatPanel isOpen={true} onClose={() => {}} />);

    // Send message (triggers state update)
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    const stored = JSON.parse(localStorage.getItem('smartmoney_chat_history'));
    expect(stored).toHaveLength(1);
  });
});
```

---

## References

- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [React Query Persistence](https://tanstack.com/query/latest/docs/react/plugins/persistQueryClient)
- [localStorage Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
