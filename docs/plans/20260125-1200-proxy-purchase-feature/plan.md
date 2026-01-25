# Proxy Purchase Feature Implementation Plan

**Date:** 2026-01-25 | **Status:** Planning | **Est. Effort:** 4-6 days

## Executive Summary

Enable proxy purchase (daiko-kounyuu) workflow: track purchases made for clients, manage receivables, and record settlement income. Backend is complete; frontend components exist but are not wired up.

## Current State

| Component | Status | Location |
|-----------|--------|----------|
| Backend API | Complete | `/backend/app/routes/proxy.py` |
| proxy-service.ts | Complete | `/frontend/src/services/proxy-service.ts` |
| ProxyPurchaseWizard | Exists (2-step) | `/frontend/src/components/proxy/` |
| ProxyReceivablesWidget | Exists (unused) | `/frontend/src/components/proxy/` |
| ProxySettlementModal | Exists | `/frontend/src/components/proxy/` |
| FAB Integration | Missing | - |
| Navigation | Missing | - |
| /proxy Page | Missing | - |

## Implementation Phases

### [Phase 1: Enable Existing Components](./phase-01-enable-existing.md)
- Add ProxyReceivablesWidget to Dashboard
- Add "Proxy Purchase" to FloatingActionButton menu
- Wire up existing components
- **Effort:** 0.5 day

### [Phase 2: Cart-Style Multi-Item UI](./phase-02-cart-ui.md)
- Redesign ProxyPurchaseWizard to single-screen cart
- Inline table: Item | Cost | Markup | Delete
- Quick markup buttons (+10/15/20%)
- Running totals with profit margin display
- **Effort:** 2 days

### [Phase 3: Dedicated /proxy Page](./phase-03-dedicated-page.md)
- Create `/proxy` route and page
- Tab 1: Outstanding Receivables (enhanced widget)
- Tab 2: Purchase History
- Tab 3: Monthly Profit Summary
- Tab 4: Client List
- **Effort:** 1.5 days

### [Phase 4: Navigation & Polish](./phase-04-navigation-polish.md)
- Add "Proxy" nav item (ShoppingCart icon)
- Add i18n translations (en, ja, vi)
- Mobile responsive optimization
- **Effort:** 0.5 day

## Technical Notes

- Backend supports multi-item via repeated API calls (batch optional)
- Use existing categories: "Proxy Purchase", "Proxy Income"
- Use existing account type: "receivable" for clients
- charge_info stored as JSON in transaction notes

## Success Criteria

1. ProxyReceivablesWidget visible on Dashboard when receivables exist
2. FAB allows quick proxy purchase entry
3. Multi-item cart allows adding 5+ items in single session
4. /proxy page shows all receivables, history, profit metrics
5. Navigation accessible on mobile and desktop

## Dependencies

- No backend changes required (API complete)
- Existing receivable accounts must exist for client selection

## Files Modified/Created

See individual phase docs for detailed file lists.
