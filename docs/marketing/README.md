# SmartMoney Marketing Copy Documentation

> **Version:** 1.0 | **Date:** 2025-11-25 | **Status:** Production-Ready

---

## Overview

This directory contains production-ready marketing copy for the SmartMoney landing page. All copy follows conversion optimization best practices, emphasizes privacy and self-hosting benefits, and is tailored for the Japanese market.

---

## File Structure

```
marketing/
├── README.md                        # This file
├── hero-section.md                  # Above-fold content (headline, CTA, value props)
├── how-it-works-section.md          # 4-step user journey
├── feature-showcase.md              # 8 features with benefits-focused copy
├── ai-budget-deep-dive.md           # Unique selling point (AI budget generation)
├── pricing-packages.md              # 4 credit packages with ROI calculations
├── getting-started-guide.md         # Step-by-step deployment instructions
├── faq-section.md                   # 26 questions covering objections
├── final-cta-section.md             # Conversion-focused closing section
└── implementation-guidelines.md     # Design, SEO, A/B testing recommendations
```

---

## Key Messaging Pillars

### 1. Privacy-First
- Self-hosted (no cloud data sharing)
- 100% local database (SQLite/PostgreSQL)
- No third-party access except AI budget generation (user-initiated)

### 2. Cost Advantage
- 94% cheaper than MoneyForward Premium annually
- Pay-per-use AI budgets (~862 VND vs ¥500/month subscriptions)
- Credits never expire

### 3. Japanese Market Fit
- MoneyForward/Zaim CSV import (Shift-JIS auto-detection)
- Understanding of Japanese privacy concerns
- Tokyo-specific examples (45% housing costs)

### 4. AI Differentiation
- Claude 3.5 Haiku for personalized budgets
- Cost transparency (0.36 credits per generation)
- Swipe-to-adjust interface (mobile-friendly)

---

## Implementation Workflow

### Phase 1: Content Integration
1. Read `hero-section.md` - Implement above-fold HTML
2. Read `how-it-works-section.md` - Create 4-step visual flow
3. Read `feature-showcase.md` - Build 8-feature grid layout
4. Read `ai-budget-deep-dive.md` - Implement AI explainer section
5. Read `pricing-packages.md` - Create pricing card UI
6. Read `getting-started-guide.md` - Build step-by-step onboarding
7. Read `faq-section.md` - Implement accordion/collapsible FAQ
8. Read `final-cta-section.md` - Add conversion-focused footer

### Phase 2: Visual Assets
- Screenshot requirements in each section (marked `[Screenshot: Description]`)
- Refer to `implementation-guidelines.md` for design specs
- Ensure all amounts are masked for privacy demonstration

### Phase 3: A/B Testing
- Test hero headline variations (4 options provided)
- Test CTA button copy (3 variations per CTA)
- Test pricing package labels (social proof vs neutral)
- Test social proof elements (technical vs user-focused)

### Phase 4: SEO & Analytics
- Implement meta tags from `implementation-guidelines.md`
- Set up Google Analytics events for CTA clicks
- Add structured data (Schema.org)
- Verify all internal/external links

---

## Tone & Style Guidelines

### Voice Characteristics
1. **Honest & Transparent** - No hype, specific numbers
2. **Conversational** - "You," "Your," active voice
3. **Action-Oriented** - Verbs: Track, Control, Generate, Analyze
4. **Technical but Accessible** - Explain jargon when used

### Formatting Rules
- Headlines: 6-10 words max
- Subheadlines: 15-20 words max
- Body paragraphs: 2-3 sentences max
- Bullet points: Max 5-7 items per list

### Japanese Market Awareness
- Reference MoneyForward/Zaim explicitly
- Mention Shift-JIS encoding (shows understanding)
- Use Tokyo-specific examples (housing costs)
- Emphasize privacy (cultural fit)

---

## A/B Testing Strategy

### Hero Section (Priority: High)
**Variation A (Control):** "Your Money, Your Rules, Your Server"
**Variation B:** "Stop Sharing Your Financial Data With Cloud Services"
**Variation C:** "Self-Hosted Finance Tracking for Privacy-Conscious Japanese Families"
**Variation D:** "AI-Powered Budgets Without Sacrificing Privacy"

**Hypothesis:** Variation C may drive 15-25% higher conversions among Japanese users.

### Pricing Labels (Priority: High)
**Test:** "Most Popular" badge on Basic package vs no badge
**Hypothesis:** Badge increases Basic package conversions by 20-30% (industry standard).

### CTA Button Copy (Priority: Medium)
**Variation A:** "Start Self-Hosting (Free Setup Guide)"
**Variation B:** "Deploy Your Own Server (30 Minutes)"
**Variation C:** "Get Started Free"

**Hypothesis:** Explicit time commitment ("30 Minutes") reduces uncertainty, increases clicks.

---

## Conversion Rate Optimization (CRO) Checklist

- [ ] **Above-Fold:** Headline + Value Props + CTA visible without scrolling
- [ ] **Social Proof:** Test scores (89/89 tests, 92/100 quality) visible in hero
- [ ] **Scarcity/Urgency:** Avoid fake urgency (hurts trust with Japanese market)
- [ ] **Trust Signals:** Open-source badge, GitHub stars, code quality scores
- [ ] **Objection Handling:** FAQ section addresses top 26 objections
- [ ] **Risk Reversal:** 7-day money-back guarantee clearly stated
- [ ] **Clear CTAs:** Multiple conversion opportunities (hero, pricing, footer)
- [ ] **Benefit-Driven:** Features described through user value, not technical specs

---

## Target Audience Personas

### Primary: Privacy-Conscious Japanese Family
- **Demographics:** 30-45 years old, Tokyo/Osaka, household income ¥5-10M/year
- **Pain Points:** MoneyForward privacy concerns, subscription fatigue, data fragmentation
- **Technical Level:** Basic command-line knowledge (can copy-paste commands)
- **Motivations:** Control over financial data, long-term cost savings, self-sufficiency

### Secondary: Tech-Savvy Individual
- **Demographics:** 25-40 years old, developer/engineer, single or DINK
- **Pain Points:** Generic budgets don't fit lifestyle, cloud vendor lock-in
- **Technical Level:** Comfortable with Docker, Git, SSH
- **Motivations:** Self-hosting everything, open-source preference, customization

### Tertiary: Financial Advisor (Future)
- **Demographics:** 35-55 years old, professional advisor with 20-100 clients
- **Pain Points:** Manual budget creation is time-consuming, client data privacy
- **Technical Level:** Varies (may need managed hosting option)
- **Motivations:** Scale budget creation, maintain client trust, cost efficiency

---

## Success Metrics

### Conversion Goals
- **Primary:** Sign-up rate (visitor → deployed instance)
- **Secondary:** Credit purchase rate (deployed → paid customer)
- **Tertiary:** Engagement metrics (time on page, scroll depth, CTA clicks)

### Target Benchmarks
- **Landing Page Conversion:** 2-5% (visitors → start deployment guide)
- **Setup Completion Rate:** 60-70% (start guide → deployed instance)
- **Credit Purchase Rate:** 15-25% (deployed → purchased credits)

### Key Performance Indicators (KPIs)
- Bounce rate: <40% (industry avg: 50-60%)
- Avg time on page: >3 minutes (content-heavy landing page)
- Scroll depth (75%+): >30% of visitors
- CTA click-through rate: >8% (hero CTA)

---

## Maintenance & Updates

### Monthly Reviews
- Update competitor pricing (MoneyForward, Zaim)
- Refresh testimonials (rotate new user stories)
- Test new headline variations (continuous optimization)

### Quarterly Updates
- Add new feature sections (as features ship)
- Update screenshots (reflect latest UI)
- Review FAQ based on support tickets (add new Q&As)

### Annual Overhaul
- Refresh entire copy for market changes
- Update ROI calculations (exchange rates, competitor pricing)
- Redesign layout if conversion rates plateau

---

## Legal & Compliance

### Required Disclaimers
- [ ] Money-back guarantee terms clearly stated
- [ ] Payment processing security (SePay PCI DSS compliance)
- [ ] Data privacy policy link (GDPR/CCPA compliance)
- [ ] Pricing accuracy (VND/JPY exchange rates updated quarterly)

### Trademark Considerations
- MoneyForward™ and Zaim™ mentioned as comparative references (fair use)
- Anthropic™ and Claude™ mentioned as service providers
- No logo usage without permission

---

## Next Steps

1. **Implement HTML/CSS** using copy from individual section files
2. **Create Visual Assets** following screenshot requirements
3. **Set Up A/B Testing** for hero headline and CTA buttons
4. **Configure Analytics** to track conversion events
5. **Launch Beta Landing Page** to collect user feedback
6. **Iterate Based on Data** (heatmaps, session recordings, conversion rates)

---

## Contact & Support

**Questions about this copy?**
- Review `implementation-guidelines.md` for design specs
- Check individual section files for specific copy variations
- Refer to original plan: `/home/godstorm91/project/smartmoney/plans/251125-1723-marketing-copy-plan/`

---

**END OF MARKETING COPY DOCUMENTATION**

*All copy is production-ready and optimized for conversion. Follow implementation guidelines for best results.*
