import { Upload, BarChart3, Brain, Target } from 'lucide-react'
import { Card } from '@/components/ui/Card'

const steps = [
  {
    icon: Upload,
    number: '01',
    title: 'Import Your Data',
    description: 'Upload CSV exports from MoneyForward, Zaim, or your bank. Auto-detects Japanese encoding (Shift-JIS) and maps categories instantly.',
    color: 'blue'
  },
  {
    icon: BarChart3,
    number: '02',
    title: 'Analyze Cashflow',
    description: 'View income vs expenses with category breakdowns. Track monthly trends and identify spending patterns across all your accounts.',
    color: 'green'
  },
  {
    icon: Brain,
    number: '03',
    title: 'Generate AI Budget',
    description: 'Claude AI analyzes your 3-month spending history to create personalized budget allocations. Pay only 0.36 credits per generation.',
    color: 'purple'
  },
  {
    icon: Target,
    number: '04',
    title: 'Track Goals',
    description: 'Set 1/3/5/10 year savings targets. Real-time achievability analysis shows if you\'re on track, ahead, or behind schedule.',
    color: 'orange'
  }
]

const colorClasses = {
  blue: 'bg-green-100 text-green-700',
  green: 'bg-green-100 text-green-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700'
}

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            From CSV import to AI-powered budgets in 4 simple steps. No complex setup, no data science degree required.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <Card key={index} className="relative">
              {/* Step Number */}
              <div className={`absolute -top-4 -left-4 h-12 w-12 rounded-full ${colorClasses[step.color as keyof typeof colorClasses]} flex items-center justify-center font-bold text-lg shadow-lg`}>
                {step.number}
              </div>

              {/* Icon */}
              <div className={`h-16 w-16 rounded-xl ${colorClasses[step.color as keyof typeof colorClasses]} flex items-center justify-center mb-4 mt-4`}>
                <step.icon className="h-8 w-8" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {step.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {step.description}
              </p>
            </Card>
          ))}
        </div>

        {/* Visual Flow Arrow (Desktop Only) */}
        <div className="hidden lg:flex items-center justify-center mt-12 text-gray-400">
          <div className="flex items-center gap-4">
            <div className="h-1 w-24 bg-gradient-to-r from-green-300 to-green-300 rounded" />
            <div className="h-1 w-24 bg-gradient-to-r from-green-300 to-purple-300 rounded" />
            <div className="h-1 w-24 bg-gradient-to-r from-purple-300 to-orange-300 rounded" />
          </div>
        </div>

        {/* Time Estimate */}
        <div className="text-center mt-12">
          <p className="text-gray-600">
            <span className="font-semibold text-gray-900">Average setup time:</span> 3 minutes •
            <span className="font-semibold text-gray-900 ml-2">First budget:</span> 30 seconds
          </p>
        </div>
      </div>
    </section>
  )
}
