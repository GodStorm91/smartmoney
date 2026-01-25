# Cart UI Patterns & Invoice Creation Research
**Research Date:** 2026-01-25 | **Scope:** Multi-item cart UX for financial apps

## 1. Mobile-First Cart Architecture

**Bottom Navigation Pattern** - Place add/remove controls within thumb zone (bottom 40% of screen).
- Navigation items (cart, account, menu) live in fixed bottom tab bar
- Reduces cognitive load vs. top-heavy layouts
- Critical for <50ms interaction latency on mobile

**Button State Transformation**
- "Add to Cart" → Quantity Spinner (not separate modal)
- After first add, show quantity directly in product list
- Eliminates extra taps; tested with 5.2% order increase
- Use 48×48px minimum tap targets (Android) / 44×44px (iOS)

## 2. Quick-Add Patterns (Minimal Taps)

**Single-Click Add**
- Show mini-cart overlay (not full page navigation)
- Sticky bottom drawer slides up with confirmation
- Toast notification for subsequent adds (not modal)
- Real-time cart badge updates on main nav

**Product List Optimization**
- Inline quantity picker visible after first add
- No need to enter product detail page for quantity adjustment
- Swipe-to-remove gesture on mobile (accessible with undo)

## 3. Multi-Item Line Entry UI

**Table-Based Invoice Grid**
- Inline editing mode: click cell → input field transforms
- Fields: Description | Qty | Unit Price | Amount | Currency
- Press Enter to save, Esc to discard
- Real-time total calculation below each row

**Validation Strategy**
- Prevent invalid entries (quantity, price) client-side before save
- Show validation errors inline (below field, red border)
- Column-level sum displayed in footer (Subtotal row)

## 4. Currency Conversion & Profit Display

**Inline Conversion Display**
- Show source currency amount (JPY) + target currency (USD/EUR)
- Real-time exchange rate using API (OpenExchangeRates)
- Format: "¥1,000 = $6.80 (at rate 147.0)"
- Update rate every 5-10 min (cache to reduce API calls)

**Profit/Margin Column**
- Qty × (Sale Price - Cost) = Profit
- Show % margin next to absolute value
- Color code: Green (>20%), Yellow (10-20%), Red (<10%)
- Recalculate on qty/price change (debounce 300ms)

## 5. Mobile Invoice Entry Workflow

**Sequence:**
1. Tap "Add Item" → Mini form slides up (description, qty, price)
2. Pre-fill common fields (product category dropdown)
3. Confirm → Item appears in list below with edit/delete icons
4. Swipe-left on item → Delete with undo (2s toast)
5. Tap item row → Expand inline editor for quick corrections

**Form Submission Pattern**
- Submit button only enabled when: qty > 0, price > 0, description filled
- Show item count badge on submit (encourages bulk entry)
- Auto-save to draft every 30s (background sync)

## 6. Desktop Enhancements (vs Mobile)

- Multi-row edit: Click header checkbox → batch edit selected rows
- Keyboard shortcuts: Tab advances cells, Ctrl+Enter saves row
- Resizable columns + sticky header for long scrolls
- Copy-paste from Excel for bulk imports

## 7. Performance Optimizations

- Virtual scrolling for 100+ items (only render visible rows)
- Debounce calculation updates (300ms) on qty/price changes
- Lazy-load exchange rates (fetch once per session)
- Memoize calculation functions (React.memo for grid rows)

## 8. Key Metrics & Acceptance Criteria

- **Quick-add time:** <5 taps to add item with quantity
- **Form submission:** <100ms validation + recalculation
- **Mobile load time:** Cart renders in <3s
- **Cart abandonment:** Target <15% with sticky button pattern

## Unresolved Questions

- Should currency conversion happen per-item or at checkout only?
- Auto-save frequency for draft items—every 30s or on blur?
- Undo/redo depth—single level or multi-level history?

---

**Sources:**
- [15 Best Practices for Mobile eCommerce Sites](https://www.mobiloud.com/blog/mobile-ecommerce-best-practices)
- [Shopping Cart UX Guide 2026](https://www.trafiki-ecommerce.com/marketing-knowledge-hub/the-ultimate-guide-to-shopping-cart-ux/)
- [NN/G: Cart Feedback Best Practices](https://www.nngroup.com/articles/cart-feedback/)
- [Grocery UX: Dynamic Add-to-Cart Button](https://baymard.com/blog/grocery-add-to-cart-buttons)
- [Material React Table: Inline Editing](https://www.material-react-table.com/docs/guides/editing)
- [Multi-Currency Invoicing Software](https://www.invoicera.com/blog/business-operations/multi-currency-invoicing-software/)
- [Currency Input UI Patterns](http://uipatterns.io/currency-input)
- [React Data Grid Best Practices](https://www.infragistics.com/blogs/best-react-data-grid/)
