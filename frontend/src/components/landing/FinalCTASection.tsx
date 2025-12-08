import { Button } from '@/components/ui/Button'
import { Github } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export function FinalCTASection() {
  const navigate = useNavigate()
  const { t } = useTranslation('landing')

  return (
    <section className="py-16 bg-gradient-to-br from-green-600 via-green-700 to-green-800 text-white">
      <div className="max-w-4xl mx-auto px-6 text-center">
        {/* Headline */}
        <h2 className="text-3xl lg:text-4xl font-bold mb-4">
          {t('cta.title')}
        </h2>
        <p className="text-lg text-green-100 mb-8">
          {t('cta.subtitle')}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
          <Button
            onClick={() => navigate({ to: '/register' })}
            size="lg"
            className="bg-white text-green-700 hover:bg-green-50 shadow-xl"
          >
            {t('cta.button')}
          </Button>
          <Button
            onClick={() => window.open('https://github.com/GodStorm91/smartmoney', '_blank')}
            size="lg"
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10"
          >
            <Github className="h-5 w-5 mr-2" />
            {t('cta.openSource')}
          </Button>
        </div>

        <p className="text-sm text-green-200">
          {t('cta.noAccount')}
        </p>
      </div>
    </section>
  )
}
