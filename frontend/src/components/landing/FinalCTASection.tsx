import { Button } from '@/components/ui/Button'
import { Github } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export function FinalCTASection() {
  const navigate = useNavigate()
  const { t } = useTranslation('landing')

  return (
    <section className="py-16 bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <h2 className="text-2xl lg:text-3xl font-bold mb-3">
          {t('cta.title')}
        </h2>
        <p className="text-gray-400 mb-8">
          {t('cta.subtitle')}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <Button
            onClick={() => navigate({ to: '/register' })}
            size="lg"
          >
            {t('cta.button')}
          </Button>
          <Button
            onClick={() => window.open('https://github.com/GodStorm91/smartmoney', '_blank')}
            size="lg"
            variant="outline"
            className="border-gray-600 text-gray-200 hover:bg-gray-800"
          >
            <Github className="h-5 w-5 mr-2" />
            {t('cta.openSource')}
          </Button>
        </div>

        <p className="text-sm text-gray-500">
          {t('cta.noAccount')}
        </p>
      </div>
    </section>
  )
}
