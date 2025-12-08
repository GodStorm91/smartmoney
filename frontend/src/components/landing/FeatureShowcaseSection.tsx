import { useTranslation } from 'react-i18next'

const features = [
  {
    id: 'dashboard',
    screenshot: '/screenshots/dashboard-light.webp',
    screenshotAlt: 'Dashboard Screenshot'
  },
  {
    id: 'transactions',
    screenshot: '/screenshots/transactions.webp',
    screenshotAlt: 'Transactions Screenshot'
  },
  {
    id: 'budget',
    screenshot: '/screenshots/budget.webp',
    screenshotAlt: 'Budget Screenshot'
  },
  {
    id: 'analytics',
    screenshot: '/screenshots/analytics.webp',
    screenshotAlt: 'Analytics Screenshot'
  }
]

export function FeatureShowcaseSection() {
  const { t } = useTranslation('landing')

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            {t('features.title')}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('features.subtitle')}
          </p>
        </div>

        {/* Features Grid with Screenshots */}
        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature) => (
            <div
              key={feature.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Screenshot */}
              <div className="aspect-video bg-gray-100 overflow-hidden">
                <img
                  src={feature.screenshot}
                  alt={feature.screenshotAlt}
                  className="w-full h-full object-cover object-top"
                  loading="lazy"
                />
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t(`features.${feature.id}.title`)}
                </h3>
                <p className="text-gray-600 text-sm">
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
