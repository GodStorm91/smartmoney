# Phase 2C: shadcn/ui Component Integration

**Purpose**: Ready-made component library integration
**Status**: Component selection and customization
**Timeline**: 1 day

---

## Tabs Component

**Import:**
```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
```

**Tasks:**
- [ ] Installed and configured
- [ ] Grid layout for triggers
- [ ] Content transitions defined
- [ ] Responsive behavior set
- [ ] Custom styling applied
- [ ] Focus states tested

**Customization:**
- [ ] Active underline color: #4CAF50
- [ ] Tab padding: `py-3 px-6`
- [ ] Tab height: 48px
- [ ] Transition duration: 150ms
- [ ] Focus ring visible: `focus:ring-2`

---

## Card Component

**Import:**
```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
```

**Tasks:**
- [ ] Used for detail panel sections
- [ ] Padding consistent with design (p-6)
- [ ] Border/shadow styling
- [ ] Responsive padding adjustments

**Customization:**
- [ ] Remove top border if not needed
- [ ] Shadow: subtle (shadow-sm)
- [ ] Border: light gray (border-gray-200)

---

## Accordion Component (Mobile)

**Import:**
```tsx
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
```

**Tasks:**
- [ ] Mobile category list fallback
- [ ] Smooth expand/collapse
- [ ] Keyboard accessible
- [ ] Single or multiple open mode decision

**Customization:**
- [ ] Icon rotation animation
- [ ] Trigger padding: py-3 px-4
- [ ] Content padding: py-4 px-4
- [ ] Focus state visible

---

## Table Component

**Import:**
```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
```

**Tasks:**
- [ ] Transaction list table
- [ ] Responsive/mobile-friendly
- [ ] Sortable columns (optional)
- [ ] Hover states
- [ ] Right-align numeric columns

**Customization:**
- [ ] Header background: gray-50
- [ ] Row hover: gray-100
- [ ] Border color: gray-200
- [ ] Text alignment: right for amounts
- [ ] Padding: py-3 px-4

---

## Badge Component

**Import:**
```tsx
import { Badge } from "@/components/ui/badge"
```

**Tasks:**
- [ ] Status indicators
- [ ] Color variants (green, yellow, red)
- [ ] Labels: "On Track", "Over Budget", "Under Budget"
- [ ] Sizing: small variant

**Customization:**
- [ ] Green: #4CAF50 (on-track)
- [ ] Yellow: #FBC02D (warning)
- [ ] Red: #F44336 (over-budget)

---

## Progress Component

**Import:**
```tsx
import { Progress } from "@/components/ui/progress"
```

**Tasks:**
- [ ] Budget progress bars
- [ ] Labeled values
- [ ] Color variants
- [ ] Smooth animations
- [ ] Accessibility: aria-valuenow, aria-valuemin, aria-valuemax

**Customization:**
- [ ] Height: 6-8px
- [ ] Background: light gray
- [ ] Filled color: conditional (green/yellow/red)
- [ ] Border-radius: rounded

---

## Button Component

**Import:**
```tsx
import { Button } from "@/components/ui/button"
```

**Tasks:**
- [ ] Add category button
- [ ] Edit/delete icon buttons
- [ ] View all transactions link
- [ ] Add transaction button
- [ ] Ghost variants for secondary actions

**Customization:**
- [ ] Size variants: sm, md
- [ ] Colors: primary (green), gray
- [ ] Icons: 18-20px
- [ ] Hover/focus states clear

---

## Select Component (Optional)

**Import:**
```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
```

**Tasks:**
- [ ] Filter transactions (if needed)
- [ ] Sort options
- [ ] Category grouping selector
- [ ] Month/period selector

---

## Dialog Component (Optional)

**Import:**
```tsx
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
```

**Tasks:**
- [ ] Add category modal
- [ ] Edit category modal
- [ ] Delete confirmation modal
- [ ] Category rules dialog

---

## Utility Components

### Skeleton (Loading States)

```tsx
import { Skeleton } from "@/components/ui/skeleton"
```

- [ ] Category list skeleton
- [ ] Detail panel skeleton
- [ ] Transaction table skeleton

### Empty State

- [ ] No categories message
- [ ] No transactions message
- [ ] Custom empty state component

---

## TypeScript & Props

**All components:**
- [ ] Full TypeScript support
- [ ] PropTypes/interfaces defined
- [ ] Optional props marked
- [ ] Default props set
- [ ] Event handlers typed

**Example props structure:**
```tsx
interface CategoryListProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading?: boolean;
  error?: Error;
}
```

---

## Accessibility

- [ ] All components ARIA-compliant
- [ ] Keyboard navigation supported
- [ ] Focus indicators visible
- [ ] Color not sole differentiator
- [ ] Semantic HTML preserved
- [ ] Screen reader tested

---

## Styling Integration

- [ ] Tailwind CSS classes used
- [ ] Custom CSS minimal
- [ ] Dark mode support considered
- [ ] Responsive classes (lg:, md:)
- [ ] Consistent spacing (8px grid)
- [ ] Consistent colors (#4CAF50 primary)

---

## Output

By end of Phase 2C:
- [ ] All shadcn/ui components integrated
- [ ] Custom props/styling applied
- [ ] TypeScript types complete
- [ ] Accessibility verified
- [ ] Ready for custom component building
