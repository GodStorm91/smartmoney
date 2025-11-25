# Implementation Guidelines - Landing Page

## Visual Hierarchy Priority

1. **Hero Headline** - Largest, boldest (48px)
2. **Value Prop Bullets** - Icons + concise text (18px)
3. **Primary CTA** - High contrast, blue button (prominent)
4. **Social Proof** - Subtle but visible (14px)

---

## Screenshot Requirements

### MUST HAVE:
1. Dashboard overview (masked amounts) - Hero section
2. CSV upload success modal - How It Works Step 2
3. AI budget generation interface - Feature Showcase #2
4. Goal progress cards (4 horizons) - Feature Showcase #4
5. Credit purchase page with "Most Popular" badge - Pricing section

### NICE TO HAVE:
6. Trend chart + category pie chart - Feature Showcase #5
7. System architecture diagram - Feature Showcase #6
8. Multi-currency account list - Feature Showcase #7
9. Budget progress bars - Feature Showcase #8
10. Docker deployment terminal - Getting Started

---

## Color Psychology

- **Blue:** Trust, professionalism (CTAs, links)
- **Green:** Positive (ahead on goals, income, savings)
- **Red:** Warning (behind on goals, expenses, overspending)
- **Orange:** Attention ("Most Popular" badge, low credits)
- **Gray:** Neutral backgrounds, text hierarchy

---

## Typography Guidelines

### Headings
- Bold, 32-48px, sans-serif (Inter, Roboto)
- Section headers: 32px
- Feature headlines: 24px

### Body Copy
- Regular, 16-18px
- Line-height: 1.6 (readability)
- Max width: 700px for paragraphs

### CTA Buttons
- Semibold, 16px
- Sentence case preferred over uppercase
- Padding: 12px 24px

---

## Accessibility Requirements (WCAG AA)

- Contrast ratio ≥4.5:1 for body text
- Contrast ratio ≥3:1 for large text (18px+)
- Keyboard navigation (Tab key through all interactive elements)
- Screen reader friendly (aria-labels on icons)
- Touch targets ≥44×44px (iOS guideline)

---

## Mobile Responsive

- Single-column layout on <768px
- Touch targets ≥44×44px
- Swipe gestures with visual feedback
- Hamburger menu for navigation
- CTA buttons full-width on mobile

---

## Copy Tone Checklist

Before publishing, verify each section meets these criteria:

- [ ] **Honest & Transparent** - No hype, no exaggeration
- [ ] **Conversational** - Sounds human, not corporate
- [ ] **Specific** - Numbers, metrics, concrete examples
- [ ] **Action-Oriented** - Verbs like "Track," "Generate," "Control"
- [ ] **Privacy-Focused** - Emphasizes self-hosting benefits
- [ ] **Japanese Market Aware** - References MoneyForward, Zaim, Shift-JIS
- [ ] **Benefit-Driven** - Features described through user value
- [ ] **Scannable** - Subheadings every 150-200 words
- [ ] **CTA-Rich** - Multiple conversion opportunities throughout

---

## Links to Verify Before Launch

- [ ] `/docs/deployment` - Setup guide
- [ ] `/demo` - Live demo
- [ ] `/docs` - Documentation hub
- [ ] `support@smartmoney.com` - Email address
- [ ] Discord invite link (add when ready)
- [ ] GitHub repository URL
- [ ] Hetzner affiliate link (if applicable)

---

## Performance Optimization

### Above-the-Fold Loading
- Inline critical CSS
- Defer non-essential JavaScript
- Optimize hero image (WebP format, <100KB)
- Lazy load below-fold screenshots

### Image Optimization
- WebP format with JPEG fallback
- Responsive images (srcset)
- Alt text for all images (SEO + accessibility)
- Screenshot file size <200KB each

---

## SEO Recommendations

### Meta Tags
```html
<title>SmartMoney - Self-Hosted Finance Tracker | Privacy-First Budget App</title>
<meta name="description" content="Track cashflow, reach goals, keep privacy. Import MoneyForward/Zaim CSVs, generate AI budgets with Claude, track 1-10 year goals. 100% self-hosted.">
<meta name="keywords" content="self-hosted finance, MoneyForward alternative, Zaim alternative, privacy finance app, AI budget, Japan finance tracker">
```

### Structured Data (Schema.org)
- SoftwareApplication schema
- FAQ schema for FAQ section
- Product schema for pricing packages

### Open Graph Tags
```html
<meta property="og:title" content="SmartMoney - Your Money, Your Rules, Your Server">
<meta property="og:description" content="Self-hosted finance tracker with AI budgets. 94% cheaper than MoneyForward Premium.">
<meta property="og:image" content="https://smartmoney.com/og-image.png">
```

---

## Conversion Tracking Setup

### Google Analytics Events
- CTA Click: "Start Self-Hosting"
- CTA Click: "See How It Works"
- Scroll Depth: 25%, 50%, 75%, 100%
- Section Views: Hero, Features, Pricing, FAQ
- External Links: GitHub, Discord, Hetzner

### A/B Testing Tools
- Google Optimize (free)
- VWO (Visual Website Optimizer)
- Optimizely (enterprise)

**Test Priority:**
1. Hero headline variations
2. CTA button copy
3. Pricing package labels
4. Social proof elements
