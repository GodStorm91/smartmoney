import { Upload, BarChart3, Brain } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const steps = [
  { id: 'step1', icon: Upload },
  { id: 'step2', icon: BarChart3 },
  { id: 'step3', icon: Brain },
]

export function HowItWorksSection() {
  const { t } = useTranslation('landing')

  return (
    <section id="how-it-works" className="py-16 bg-white dark:bg-gray-950">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('howItWorks.title')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            {t('howItWorks.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={step.id} className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 mb-4">
                <step.icon className="h-5 w-5" />
              </div>
              <div className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1">
                {index + 1}
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                {t(`howItWorks.${step.id}.title`)}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t(`howItWorks.${step.id}.description`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
