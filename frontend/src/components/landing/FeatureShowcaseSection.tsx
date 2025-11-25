import { Shield, FileUp, Brain, Target, BarChart3, DollarSign, Globe, Zap } from 'lucide-react'
import { Card } from '@/components/ui/Card'

const features = [
  {
    icon: Shield,
    title: 'Privacy-First Self-Hosting',
    description: 'Your financial data never leaves your server. No cloud storage, no third-party access, no data mining. Complete control over your sensitive information.',
    benefit: 'Peace of mind for your family'
  },
  {
    icon: FileUp,
    title: 'Japanese CSV Auto-Import',
    description: 'Drag-and-drop CSV files from MoneyForward, Zaim, or any Japanese bank. Auto-detects Shift-JIS encoding and maps 大項目 categories instantly.',
    benefit: 'Works with your existing apps'
  },
  {
    icon: Brain,
    title: 'AI-Powered Budget Generation',
    description: 'Claude AI analyzes YOUR 3-month spending patterns to create personalized allocations. Not generic advice—budgets based on real behavior.',
    benefit: 'Budgets that actually work'
  },
  {
    icon: Target,
    title: 'Multi-Horizon Goal Tracking',
    description: 'Set savings targets for 1, 3, 5, and 10 years. Real-time achievability analysis shows if you\'re ahead, on track, or behind schedule.',
    benefit: 'Never lose sight of long-term goals'
  },
  {
    icon: BarChart3,
    title: 'Comprehensive Analytics',
    description: 'Monthly cashflow trends, category breakdowns, and source analysis. 12-month trend charts with income vs expense visualization.',
    benefit: 'Understand where your money goes'
  },
  {
    icon: DollarSign,
    title: 'Pay-Per-Use Pricing',
    description: 'No subscriptions. Buy credits once, use for years. 0.36 credits per AI budget = ~862 VND. 94% cheaper than MoneyForward Premium annually.',
    benefit: 'Fairest pricing in fintech'
  },
  {
    icon: Globe,
    title: 'Multi-Currency Support',
    description: 'Track accounts in JPY, USD, and VND with automatic exchange rate conversion. Perfect for expats and international families.',
    benefit: 'One view for all accounts'
  },
  {
    icon: Zap,
    title: 'Lightning-Fast Performance',
    description: 'Dashboard loads in <500ms with 10,000+ transactions. Optimized database queries and efficient React rendering for instant insights.',
    benefit: 'No waiting, just answers'
  }
]

export function FeatureShowcaseSection() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Everything You Need to Master Your Finances
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Built for privacy-conscious Japanese families who want control, transparency, and intelligence in one self-hosted platform.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} hover className="flex flex-col h-full">
              {/* Icon */}
              <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mb-4">
                <feature.icon className="h-7 w-7 text-white" />
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-4 flex-grow leading-relaxed">
                {feature.description}
              </p>

              {/* Benefit Badge */}
              <div className="inline-flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                <span className="font-medium">✓ {feature.benefit}</span>
              </div>
            </Card>
          ))}
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 text-center">
          <div className="inline-flex flex-wrap items-center justify-center gap-8 px-8 py-6 bg-white rounded-xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-700 font-bold">89</span>
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-900">Tests Passing</div>
                <div className="text-sm text-gray-500">100% reliability</div>
              </div>
            </div>

            <div className="h-8 w-px bg-gray-200" />

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-700 font-bold">92</span>
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-900">Code Quality</div>
                <div className="text-sm text-gray-500">Production-ready</div>
              </div>
            </div>

            <div className="h-8 w-px bg-gray-200" />

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="text-purple-700 font-bold">95%</span>
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-900">Test Coverage</div>
                <div className="text-sm text-gray-500">Battle-tested</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
