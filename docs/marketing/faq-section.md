# FAQ Section - Landing Page Copy

## Section Header
```
Frequently Asked Questions
Everything you need to know before getting started
```

---

## General

**Q1: Is SmartMoney really free?**

SmartMoney is open-source and self-hosted, so there's no subscription fee. You pay ONLY when you want AI-generated budgets (credit-based). Analyzing your data, viewing dashboards, and tracking goals is 100% free forever.

---

**Q2: Why self-host instead of using a cloud service?**

Privacy. When you self-host, your financial data never leaves your server. No third-party company can see your transactions, sell your data to advertisers, or get hacked (exposing your info). You're in complete control.

---

**Q3: Do I need to be a programmer to set it up?**

No. If you can follow a recipe, you can deploy SmartMoney. Our setup guide uses copy-paste commands. Most users deploy in 30-45 minutes. We provide video tutorials and Discord support.

---

## Data Import

**Q4: Which apps are compatible?**

Currently: MoneyForward, Zaim (CSV exports). We auto-detect Japanese encodings (Shift-JIS) and prevent duplicates. Future versions will support bank statements, credit card exports, and e-wallets (PayPay, LINE Pay).

---

**Q5: How often should I import CSVs?**

Monthly is ideal. Export from MoneyForward/Zaim at month-end, upload to SmartMoney. Takes ~30 seconds. If you prefer, import quarterly or weekly—whatever fits your workflow.

---

**Q6: What happens if I upload the same CSV twice?**

SmartMoney uses SHA-256 hashing to detect duplicates. If you re-upload, it'll skip duplicate transactions and only import new ones. You'll see a summary: "119 imported, 5 duplicates skipped."

---

## AI Budgets & Credits

**Q7: How does the AI budget generation work?**

Claude AI (from Anthropic, makers of ChatGPT competitor) analyzes your transaction history (last 3-6 months), identifies spending patterns, and suggests realistic category allocations. You can swipe to adjust, then save. Takes ~10 seconds.

---

**Q8: Why do credits cost money if SmartMoney is free?**

AI budget generation uses Claude API, which charges per token (words processed). We pass this cost to you with a 100× markup to cover infrastructure and development. One budget = ~0.36 credits (~862 VND), far cheaper than finance app subscriptions (¥500-1000/month).

---

**Q9: How many budgets can I generate with 50 credits?**

~138 budgets (50 credits ÷ 0.36 average cost). That's enough for 11+ years of monthly budgets. If you regenerate 3 times/month to optimize, ~46 months (4 years).

---

**Q10: Do credits expire?**

Never. Buy once, use forever. Unlike MoneyForward's monthly subscription (pay ¥500/mo whether you use it or not), SmartMoney credits sit in your account until you need them.

---

**Q11: Can I get a refund if I don't like the AI budget?**

Yes. If your first budget generation doesn't meet expectations, email us within 7 days for a full refund—no questions asked.

---

## Goals & Analytics

**Q12: How accurate is the goal achievability analysis?**

SmartMoney uses linear projection: (total saved so far) ÷ (months elapsed) × (months remaining). It's 90%+ accurate if your income/expenses remain stable. For variable income, consider seasonal adjustments (future feature).

---

**Q13: Can I track multiple currencies?**

Yes. SmartMoney supports JPY, USD, VND. If you have savings in USD and expenses in JPY, you can track both. Net worth aggregates using exchange rates (manual entry or optional API integration).

---

**Q14: What's the difference between goals and budgets?**

**Goals:** Long-term targets (1/3/5/10 years) like "Save ¥2.7M for house down payment in 3 years."
**Budgets:** Monthly spending limits per category (food, housing, transport).

Goals answer "What am I saving for?", budgets answer "How much can I spend this month?"

---

## Privacy & Security

**Q15: Is my data encrypted?**

Yes. HTTPS/SSL via Let's Encrypt encrypts data in transit. Database can be encrypted at rest (optional PostgreSQL feature). Since you self-host, YOU control encryption keys.

---

**Q16: What happens if my server gets hacked?**

Same risk as any self-hosted service. Mitigation: use strong passwords, enable 2FA (future feature), keep software updated, restrict SSH access. SmartMoney doesn't store payment details (processed via SePay), so financial risk is limited to transaction data.

---

**Q17: Does SmartMoney send my data to third parties?**

Only when YOU choose to generate an AI budget. At that moment, transaction summary (not individual transactions) is sent to Claude API. Anthropic (Claude's maker) doesn't store or train on your data per their enterprise agreement. Otherwise, zero external API calls.

---

## Payments & Credits

**Q18: What payment methods are supported?**

Vietnamese bank transfer and QR code (via SePay gateway). International credit cards coming Q2 2026.

---

**Q19: How long does it take to receive credits after payment?**

Usually <1 minute. SePay sends a webhook to your SmartMoney server, credits are added automatically. You'll receive an email confirmation.

---

**Q20: Can I share credits with family members?**

Not yet. Current version is single-user. Multi-user (family accounts) planned for v2.0 (2026), where you can create sub-accounts and allocate credits.

---

## Technical

**Q21: What are the server requirements?**

**Minimum:** 1 CPU, 1GB RAM, 20GB SSD (handles 100k transactions)
**Recommended:** 2 CPU, 2GB RAM, 40GB SSD (better performance)
**VPS Cost:** ~¥5-10/month (Hetzner CX11, DigitalOcean Basic)

---

**Q22: Can I run SmartMoney on a Raspberry Pi?**

Yes! Raspberry Pi 4 (2GB+ RAM) works great for home use. Expect slightly slower CSV uploads (20s instead of 5s) due to CPU limits. Setup guide available in docs.

---

**Q23: How do I update SmartMoney to the latest version?**
```bash
cd /root/smartmoney
git pull
cd deploy
docker compose up -d --build
```
Takes ~5 minutes. Your data is preserved in PostgreSQL volume.

---

**Q24: What if I want to migrate from SQLite to PostgreSQL?**

SmartMoney MVP uses SQLite. For production (>250k transactions), switch to PostgreSQL via migration script (provided in v0.2.0 release). Script preserves all data, takes ~10 minutes.

---

## Support

**Q25: Where can I get help if I'm stuck?**

- **Documentation:** /docs (setup guides, troubleshooting)
- **Discord:** Join our community (500+ members, avg response time: 2 hours)
- **Email:** support@smartmoney.com (48-hour response time)
- **GitHub Issues:** Report bugs, request features

---

**Q26: Is SmartMoney open-source?**

Yes. Code is on GitHub under MIT License. You can inspect security, contribute features, or fork for custom modifications. Transparency builds trust.
