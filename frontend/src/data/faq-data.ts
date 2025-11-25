export interface FAQ {
  question: string
  answer: string
}

export interface FAQCategory {
  category: string
  items: FAQ[]
}

export const faqCategories: FAQCategory[] = [
  {
    category: 'General',
    items: [
      {
        question: 'Is SmartMoney really free?',
        answer: "SmartMoney is open-source and self-hosted, so there's no subscription fee. You pay ONLY when you want AI-generated budgets (credit-based). Analyzing your data, viewing dashboards, and tracking goals is 100% free forever."
      },
      {
        question: 'Why self-host instead of using a cloud service?',
        answer: "Privacy. When you self-host, your financial data never leaves your server. No third-party company can see your transactions, sell your data to advertisers, or get hacked (exposing your info). You're in complete control."
      },
      {
        question: 'Do I need to be a programmer to set it up?',
        answer: 'No. If you can follow a recipe, you can deploy SmartMoney. Our setup guide uses copy-paste commands. Most users deploy in 30-45 minutes. We provide video tutorials and Discord support.'
      }
    ]
  },
  {
    category: 'Data Import',
    items: [
      {
        question: 'Which apps are compatible?',
        answer: 'Currently: MoneyForward, Zaim (CSV exports). We auto-detect Japanese encodings (Shift-JIS) and prevent duplicates. Future versions will support bank statements, credit card exports, and e-wallets (PayPay, LINE Pay).'
      },
      {
        question: 'How often should I import CSVs?',
        answer: "Monthly is ideal. Export from MoneyForward/Zaim at month-end, upload to SmartMoney. Takes ~30 seconds. If you prefer, import quarterly or weekly—whatever fits your workflow."
      },
      {
        question: 'What happens if I upload the same CSV twice?',
        answer: 'SmartMoney uses SHA-256 hashing to detect duplicates. If you re-upload, it\'ll skip duplicate transactions and only import new ones. You\'ll see a summary: "119 imported, 5 duplicates skipped."'
      }
    ]
  },
  {
    category: 'AI Budgets & Credits',
    items: [
      {
        question: 'How does the AI budget generation work?',
        answer: 'Claude AI (from Anthropic, makers of ChatGPT competitor) analyzes your transaction history (last 3-6 months), identifies spending patterns, and suggests realistic category allocations. You can swipe to adjust, then save. Takes ~10 seconds.'
      },
      {
        question: 'Why do credits cost money if SmartMoney is free?',
        answer: 'AI budget generation uses Claude API, which charges per token (words processed). We pass this cost to you with a 100× markup to cover infrastructure and development. One budget = ~0.36 credits (~862 VND), far cheaper than finance app subscriptions (¥500-1000/month).'
      },
      {
        question: 'How many budgets can I generate with 50 credits?',
        answer: '~138 budgets (50 credits ÷ 0.36 average cost). That\'s enough for 11+ years of monthly budgets. If you regenerate 3 times/month to optimize, ~46 months (4 years).'
      },
      {
        question: 'Do credits expire?',
        answer: "Never. Buy once, use forever. Unlike MoneyForward's monthly subscription (pay ¥500/mo whether you use it or not), SmartMoney credits sit in your account until you need them."
      },
      {
        question: "Can I get a refund if I don't like the AI budget?",
        answer: "Yes. If your first budget generation doesn't meet expectations, email us within 7 days for a full refund—no questions asked."
      }
    ]
  },
  {
    category: 'Goals & Analytics',
    items: [
      {
        question: 'How accurate is the goal achievability analysis?',
        answer: "SmartMoney uses linear projection: (total saved so far) ÷ (months elapsed) × (months remaining). It's 90%+ accurate if your income/expenses remain stable. For variable income, consider seasonal adjustments (future feature)."
      },
      {
        question: 'Can I track multiple currencies?',
        answer: 'Yes. SmartMoney supports JPY, USD, VND. If you have savings in USD and expenses in JPY, you can track both. Net worth aggregates using exchange rates (manual entry or optional API integration).'
      },
      {
        question: "What's the difference between goals and budgets?",
        answer: 'Goals: Long-term targets (1/3/5/10 years) like "Save ¥2.7M for house down payment in 3 years." Budgets: Monthly spending limits per category (food, housing, transport). Goals answer "What am I saving for?", budgets answer "How much can I spend this month?"'
      }
    ]
  },
  {
    category: 'Privacy & Security',
    items: [
      {
        question: 'Is my data encrypted?',
        answer: 'Yes. HTTPS/SSL via Let\'s Encrypt encrypts data in transit. Database can be encrypted at rest (optional PostgreSQL feature). Since you self-host, YOU control encryption keys.'
      },
      {
        question: 'What happens if my server gets hacked?',
        answer: "Same risk as any self-hosted service. Mitigation: use strong passwords, enable 2FA (future feature), keep software updated, restrict SSH access. SmartMoney doesn't store payment details (processed via SePay), so financial risk is limited to transaction data."
      },
      {
        question: 'Does SmartMoney send my data to third parties?',
        answer: "Only when YOU choose to generate an AI budget. At that moment, transaction summary (not individual transactions) is sent to Claude API. Anthropic (Claude's maker) doesn't store or train on your data per their enterprise agreement. Otherwise, zero external API calls."
      }
    ]
  },
  {
    category: 'Payments & Credits',
    items: [
      {
        question: 'What payment methods are supported?',
        answer: 'Vietnamese bank transfer and QR code (via SePay gateway). International credit cards coming Q2 2026.'
      },
      {
        question: 'How long does it take to receive credits after payment?',
        answer: "Usually <1 minute. SePay sends a webhook to your SmartMoney server, credits are added automatically. You'll receive an email confirmation."
      },
      {
        question: 'Can I share credits with family members?',
        answer: 'Not yet. Current version is single-user. Multi-user (family accounts) planned for v2.0 (2026), where you can create sub-accounts and allocate credits.'
      }
    ]
  },
  {
    category: 'Technical',
    items: [
      {
        question: 'What are the server requirements?',
        answer: 'Minimum: 1 CPU, 1GB RAM, 20GB SSD (handles 100k transactions). Recommended: 2 CPU, 2GB RAM, 40GB SSD (better performance). VPS Cost: ~¥5-10/month (Hetzner CX11, DigitalOcean Basic).'
      },
      {
        question: 'Can I run SmartMoney on a Raspberry Pi?',
        answer: 'Yes! Raspberry Pi 4 (2GB+ RAM) works great for home use. Expect slightly slower CSV uploads (20s instead of 5s) due to CPU limits. Setup guide available in docs.'
      },
      {
        question: 'How do I update SmartMoney to the latest version?',
        answer: 'Run these commands: cd /root/smartmoney && git pull && cd deploy && docker compose up -d --build. Takes ~5 minutes. Your data is preserved in PostgreSQL volume.'
      },
      {
        question: 'What if I want to migrate from SQLite to PostgreSQL?',
        answer: 'SmartMoney MVP uses SQLite. For production (>250k transactions), switch to PostgreSQL via migration script (provided in v0.2.0 release). Script preserves all data, takes ~10 minutes.'
      }
    ]
  },
  {
    category: 'Support',
    items: [
      {
        question: "Where can I get help if I'm stuck?",
        answer: 'Documentation: /docs (setup guides, troubleshooting). Discord: Join our community (500+ members, avg response time: 2 hours). Email: support@smartmoney.com (48-hour response time). GitHub Issues: Report bugs, request features.'
      },
      {
        question: 'Is SmartMoney open-source?',
        answer: 'Yes. Code is on GitHub under MIT License. You can inspect security, contribute features, or fork for custom modifications. Transparency builds trust.'
      }
    ]
  }
]
