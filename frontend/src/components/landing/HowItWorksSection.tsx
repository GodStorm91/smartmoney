import { Upload, BarChart3, Brain } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const steps = [
  {
    id: 'step1',
    icon: Upload,
    color: 'bg-blue-100 text-blue-700'
  },
  {
    id: 'step2',
    icon: BarChart3,
    color: 'bg-green-100 text-green-700'
  },
  {
    id: 'step3',
    icon: Brain,
    color: 'bg-purple-100 text-purple-700'
  }
]

export function HowItWorksSection() {
  const { t } = useTranslation('landing')

  return (
    <section id="how-it-works" className="py-16 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            {t('howItWorks.title')}
          </h2>
          <p className="text-lg text-gray-600">
            {t('howItWorks.subtitle')}
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={step.id} className="text-center">
              {/* Step Number */}
              <div className="relative inline-flex items-center justify-center mb-4">
                <div className={`h-16 w-16 rounded-full ${step.color} flex items-center justify-center`}>
                  <step.icon className="h-8 w-8" />
                </div>
                <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-gray-900 text-white text-sm font-bold flex items-center justify-center">
                  {index + 1}
                </div>
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t(`howItWorks.${step.id}.title`)}
              </h3>
              <p className="text-gray-600 text-sm">
                {t(`howItWorks.${step.id}.description`)}
              </p>
            </div>
          ))}
        </div>

        {/* Connecting Lines (Desktop) */}
        <div className="hidden md:flex items-center justify-center mt-8">
          <div className="flex items-center gap-4">
            <div className="h-1 w-24 bg-gradient-to-r from-blue-300 to-green-300 rounded" />
            <div className="h-1 w-24 bg-gradient-to-r from-green-300 to-purple-300 rounded" />
          </div>
        </div>
      </div>
    </section>
  )
}
