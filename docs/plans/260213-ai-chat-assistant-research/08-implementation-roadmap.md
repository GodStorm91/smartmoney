# Implementation Roadmap
**Date:** 2026-02-13

---

## Phase 1: Core Functionality (Week 1)

### Goal
Functional chat assistant with basic tool calling.

### Tasks

**1. Implement `chat_with_context()` method**
- File: `backend/app/services/claude_ai_service.py`
- Add method to fetch financial context and call Claude
- Return message + optional suggested action
- Track token usage

**2. Add `get_transactions` tool**
- Fetch last 30 days transactions
- Return summary (not full list)
- No confirmation needed (read-only)

**3. Add `create_transaction` tool**
- Parse description, amount, category, date
- Return tool call (don't execute)
- Frontend shows confirmation card

**4. Add localStorage persistence**
- File: `frontend/src/components/chat/ChatPanel.tsx`
- Save last 20 messages on change
- Load on mount
- Clear on logout

**5. Write tests**
- Unit tests for tool execution
- Integration test for chat flow
- Security tests for unauthorized access

**6. Update documentation**
- Update API docs with new endpoint behavior
- Add tool catalog documentation

### Definition of Done

- [ ] User can ask "Show my expenses this month" → receives summary
- [ ] User can say "Add ¥5800 Starbucks" → confirmation card appears
- [ ] Clicking "Apply" creates transaction in DB
- [ ] Chat history survives panel close
- [ ] All tests passing
- [ ] Documentation updated

### Effort Estimate
**2-3 days** (16-24 hours)

---

## Phase 2: Enhanced UX (Week 2)

### Goal
Production-ready assistant with streaming and security.

### Tasks

**1. Upgrade to Claude Sonnet 3.5**
- Change model in config
- Update cost estimates
- Monitor token usage

**2. Implement SSE streaming**
- File: `backend/app/routes/chat.py`
- Add `/chat/stream` endpoint
- Stream text deltas
- Frontend: Update to use EventSource

**3. Add 5 more tools**
- `get_budget` - Fetch current budget
- `update_budget` - Modify category limits (confirmation)
- `get_goals` - Fetch goals with progress
- `create_goal` - Add new goal (confirmation)
- `analyze_spending` - Category breakdown

**4. Add prompt injection defense**
- Input sanitization in route
- Separate system/user channels
- Output validation for tools

**5. Performance monitoring**
- Log TTFT (time-to-first-token)
- Track token usage per user
- Monitor tool execution success rate

### Definition of Done

- [ ] Responses stream token-by-token
- [ ] TTFT <500ms (p95)
- [ ] User can manage budget via chat
- [ ] User can create/view goals
- [ ] Security tests pass (injection attempts blocked)
- [ ] Monitoring dashboard shows key metrics

### Effort Estimate
**1-2 weeks** (40-80 hours)

---

## Phase 3: Polish & Scale (Weeks 3-4)

### Goal
Best-in-class UX with advanced features.

### Tasks

**1. RAG for unlimited transaction history**
- Setup ChromaDB or Pinecone
- Generate embeddings for all transactions
- Semantic search for relevant context
- Fallback to sliding window if RAG fails

**2. Conversation summarization**
- Compress old messages (>10) using Claude Haiku
- Keep last 5 messages verbatim
- Store summary as system message

**3. Proactive suggestions**
- Background job: Analyze spending patterns
- Inject suggestions into chat: "You're $5000 over budget this month"
- Smart alerts based on financial health

**4. Multi-language quality improvements**
- Test Japanese financial term accuracy
- Add Vietnamese-specific number formatting
- Locale-aware date parsing

**5. A/B testing framework**
- Split users: streaming vs non-streaming
- Measure: satisfaction, completion rate, TTFT
- Choose winning variant

### Definition of Done

- [ ] Handles 10k+ transactions without context limits
- [ ] Conversation summarization working
- [ ] Proactive alerts appear in chat
- [ ] Japanese/Vietnamese quality verified
- [ ] A/B test results analyzed
- [ ] User satisfaction score ≥4.5/5

### Effort Estimate
**2-4 weeks** (80-160 hours)

---

## Success Metrics

### Phase 1 Targets
- **Tool call success rate:** ≥90%
- **User engagement:** ≥5 messages per session
- **Crash rate:** <1%

### Phase 2 Targets
- **TTFT:** <500ms (p95)
- **Tool call success rate:** ≥95%
- **User satisfaction:** ≥4.0/5
- **Security:** 0 successful prompt injections

### Phase 3 Targets
- **User satisfaction:** ≥4.5/5
- **Retention:** ≥60% return within 7 days
- **Proactive alert engagement:** ≥30% click-through

---

## Risk Mitigation

### Technical Risks

**Risk:** Streaming implementation complex, delays launch
**Mitigation:** Phase 1 ships without streaming (acceptable UX), add in Phase 2

**Risk:** RAG setup takes longer than expected
**Mitigation:** Sliding window works for 95% of users, RAG is enhancement not blocker

**Risk:** Claude API rate limits hit during peak usage
**Mitigation:** Implement request queuing, upgrade to higher tier if needed

### User Experience Risks

**Risk:** Users don't trust AI-suggested actions
**Mitigation:** Clear confirmation dialogs, show parameter preview, allow skip

**Risk:** Japanese/Vietnamese responses have quality issues
**Mitigation:** Extensive testing with native speakers, fallback to English if needed

### Security Risks

**Risk:** Prompt injection bypasses defenses
**Mitigation:** Defense-in-depth (sanitization + separate channels + output validation)

**Risk:** Tool execution bugs cause data loss
**Mitigation:** Comprehensive test coverage, audit logging, rollback capability

---

## Rollout Plan

### Phase 1: Internal Testing (Week 1)
- Deploy to staging
- Internal team testing (5-10 users)
- Fix critical bugs
- Collect feedback

### Phase 2: Beta Release (Week 2)
- Deploy to production with feature flag
- Enable for 10% of users
- Monitor metrics closely
- Gradual rollout to 50% if stable

### Phase 3: General Availability (Week 3)
- Full rollout to 100% of users
- Announce feature in changelog
- Monitor support tickets
- Iterate based on feedback

---

## Maintenance Plan

### Daily
- Monitor error rates
- Check API usage/costs
- Review security alerts

### Weekly
- Analyze user satisfaction scores
- Review tool call success rates
- Update tool catalog based on usage patterns

### Monthly
- Review token costs vs revenue
- Analyze conversation patterns
- Plan new tools/features
- Update model if Anthropic releases improvements

---

## Dependencies

### External Services
- Anthropic Claude API (already integrated)
- ChromaDB/Pinecone (Phase 3 only)
- AWS Secrets Manager (production security)

### Internal Services
- Transaction service (already exists)
- Budget service (already exists)
- Goal service (already exists)
- Credit service (already exists)

### Team Requirements
- 1 backend engineer (Python/FastAPI)
- 1 frontend engineer (React/TypeScript)
- 0.5 QA engineer (testing)

---

## Budget Estimate

### Development Costs
- Phase 1: 2-3 days × $800/day = $1,600-$2,400
- Phase 2: 1-2 weeks × $4,000/week = $4,000-$8,000
- Phase 3: 2-4 weeks × $4,000/week = $8,000-$16,000
- **Total:** $13,600-$26,400

### API Costs (monthly, 1000 active users)
- Claude Sonnet: $0.05/message × 10 messages/user/month × 1000 users = $500/month
- OpenAI Embeddings (Phase 3): $0.02/1M tokens × ~2M tokens = $0.04/month (negligible)
- **Total:** ~$500/month

### Infrastructure (Phase 3)
- Vector DB hosting (Pinecas serverless): $70/month
- **Total:** ~$70/month

---

## Next Steps

1. **Review with stakeholders** - Get approval for Phase 1 scope
2. **Set up project tracking** - Create Jira tickets for all tasks
3. **Allocate resources** - Assign backend/frontend engineers
4. **Begin Phase 1 implementation** - Start with `chat_with_context()` method
5. **Schedule daily standups** - 15min sync during development

---

## Appendix: Quick Wins

If time-constrained, prioritize these high-impact tasks:

1. **Implement `chat_with_context()`** - Unlocks basic chat (1 day)
2. **Add localStorage** - Persistence without backend changes (2 hours)
3. **Fix UI transform bug** - Better slide-in animation (30 min)
4. **Add 3 essential tools** - get_transactions, create_transaction, get_budget (1 day)

**Total:** 2-3 days for functional assistant
