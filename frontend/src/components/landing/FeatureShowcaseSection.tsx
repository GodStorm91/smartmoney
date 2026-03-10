import { useTranslation } from 'react-i18next'

const features = [
  {
    id: 'dashboard',
    screenshot: '/screenshots/dashboard-light.webp',
    screenshotAlt: 'Dashboard Screenshot',
  },
  {
    id: 'transactions',
    screenshot: '/screenshots/transactions.webp',
    screenshotAlt: 'Transactions Screenshot',
  },
  {
    id: 'budget',
    screenshot: '/screenshots/budget.webp',
    screenshotAlt: 'Budget Screenshot',
  },
  {
    id: 'analytics',
    screenshot: '/screenshots/analytics.webp',
    screenshotAlt: 'Analytics Screenshot',
  },
]

export function FeatureShowcaseSection() {
  const { t } = useTranslation('landing')

  return (
    <section className="py-16 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('features.title')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            {t('features.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature) => (
            <div
              key={feature.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="aspect-video bg-gray-100 dark:bg-gray-700 overflow-hidden">
                <img
                  src={feature.screenshot}
                  alt={feature.screenshotAlt}
                  className="w-full h-full object-cover object-top"
                  loading="lazy"
                />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {t(`features.${feature.id}.title`)}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t(`features.${feature.id}.description`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
