import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Check, Sparkles } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { cn } from '@/utils/cn'

const packages = [
  {
    name: 'Starter',
    credits: 50,
    priceVND: 119000,
    priceFormatted: '¥119k',
    budgets: 138,
    lifespan: '11+ years',
    description: 'Perfect for trying out AI budgets',
    popular: false
  },
  {
    name: 'Basic',
    credits: 120,
    priceVND: 249000,
    priceFormatted: '¥249k',
    budgets: 333,
    lifespan: '27+ years',
    description: 'Most popular for families',
    popular: true
  },
  {
    name: 'Standard',
    credits: 300,
    priceVND: 549000,
    priceFormatted: '¥549k',
    budgets: 833,
    lifespan: '69+ years',
    description: 'For frequent budget refinements',
    popular: false
  },
  {
    name: 'Premium',
    credits: 1000,
    priceVND: 1199000,
    priceFormatted: '¥1.2M',
    budgets: 2777,
    lifespan: 'Lifetime',
    description: 'For financial advisors',
    popular: false
  }
]

export function PricingSection() {
  const navigate = useNavigate()

  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Pay Once, Use For Years
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-6">
            No subscriptions. Buy credits once, they never expire. Generate AI budgets whenever you need them.
          </p>
          <p className="text-sm text-gray-500">
            Average cost: <span className="font-semibold text-gray-900">0.36 credits</span> per AI budget = ~862 VND
          </p>
        </div>

        {/* Packages Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {packages.map((pkg, index) => (
            <Card
              key={index}
              className={cn(
                'relative flex flex-col',
                pkg.popular && 'ring-2 ring-blue-500 shadow-xl'
              )}
            >
              {/* Popular Badge */}
              {pkg.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="bg-blue-600 text-white px-4 py-1 rounded-full flex items-center gap-1 text-sm font-semibold shadow-lg">
                    <Sparkles className="h-3 w-3" />
                    Most Popular
                  </div>
                </div>
              )}

              {/* Package Header */}
              <div className="text-center mb-6 mt-2">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
                <p className="text-sm text-gray-600">{pkg.description}</p>
              </div>

              {/* Price */}
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-gray-900 mb-1">{pkg.priceFormatted}</div>
                <div className="text-sm text-gray-500">VND • One-time payment</div>
                <div className="text-lg font-semibold text-blue-600 mt-2">{pkg.credits} credits</div>
              </div>

              {/* Value Props */}
              <div className="space-y-3 mb-6 flex-grow">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>{pkg.budgets} AI budgets</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>Lasts {pkg.lifespan}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>Never expires</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>Pay-per-use</span>
                </div>
              </div>

              {/* CTA Button */}
              <Button
                onClick={() => navigate({ to: '/register' })}
                variant={pkg.popular ? 'primary' : 'outline'}
                className="w-full"
              >
                Buy {pkg.name}
              </Button>
            </Card>
          ))}
        </div>

        {/* ROI Comparison */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 max-w-4xl mx-auto">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Cost Comparison: SmartMoney vs MoneyForward Premium
            </h3>
            <div className="grid md:grid-cols-2 gap-8 mt-8">
              <div>
                <div className="text-sm text-gray-600 mb-2">SmartMoney (12 budgets/year)</div>
                <div className="text-3xl font-bold text-green-600 mb-2">¥10,344</div>
                <div className="text-xs text-gray-500">0.36 credits × 12 × 2392 VND/credit</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-2">MoneyForward Premium</div>
                <div className="text-3xl font-bold text-gray-400 line-through mb-2">¥188,000</div>
                <div className="text-xs text-gray-500">¥500/month × 12 months × 31.33 VND/JPY</div>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-blue-200">
              <div className="text-lg font-semibold text-blue-700">
                Save <span className="text-2xl">¥177,656</span> per year = 94% cheaper
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Plus: MoneyForward doesn't even have AI budgets!
              </p>
            </div>
          </div>
        </Card>

        {/* Money-Back Note */}
        <p className="text-center text-sm text-gray-500 mt-8">
          Self-hosted = No recurring fees • Open source = No vendor lock-in • Pay-per-use = Fairest model
        </p>
      </div>
    </section>
  )
}
