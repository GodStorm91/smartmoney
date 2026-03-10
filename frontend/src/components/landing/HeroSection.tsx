import { Button } from '@/components/ui/Button'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export function HeroSection() {
  const navigate = useNavigate()
  const { t } = useTranslation('landing')

  return (
    <section className="bg-white dark:bg-gray-950">
      <div className="max-w-3xl mx-auto px-6 py-20 lg:py-28 text-center">
        {/* Category */}
        <p className="text-sm font-medium text-primary-600 dark:text-primary-400 mb-4">
          {t('hero.category')}
        </p>

        {/* Headline */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white leading-tight mb-5">
          {t('hero.headline')}
        </h1>

        {/* Subtitle */}
        <p className="text-lg text-gray-500 dark:text-gray-400 mb-8 max-w-xl mx-auto leading-relaxed">
          {t('hero.subheadline')}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-14">
          <Button
            onClick={() => navigate({ to: '/register' })}
            size="lg"
          >
            {t('hero.cta')}
          </Button>
          <Button
            onClick={() => navigate({ to: '/login' })}
            size="lg"
            variant="outline"
          >
            {t('hero.seeLiveDemo')}
          </Button>
        </div>

        {/* Screenshot */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <img
            src="/screenshots/dashboard-light.webp"
            alt="SmartMoney Dashboard"
            className="w-full"
            loading="eager"
          />
        </div>
      </div>
    </section>
  )
}
