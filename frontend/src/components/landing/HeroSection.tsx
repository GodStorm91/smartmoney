import { Button } from '@/components/ui/Button'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Shield, Brain, Globe } from 'lucide-react'

export function HeroSection() {
  const navigate = useNavigate()
  const { t } = useTranslation('landing')

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-green-600 via-green-700 to-green-800 text-white">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div>
            {/* Headline */}
            <h1 className="text-4xl lg:text-5xl font-bold mb-4 leading-tight">
              {t('hero.headline')}
            </h1>

            {/* Subheadline */}
            <p className="text-lg text-green-100 mb-6 leading-relaxed">
              {t('hero.subheadline')}
            </p>

            {/* Value Props */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-full">
                <Shield className="h-4 w-4 text-green-300" />
                <span className="text-sm">{t('hero.valueProp1')}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-full">
                <Brain className="h-4 w-4 text-green-300" />
                <span className="text-sm">{t('hero.valueProp2')}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-full">
                <Globe className="h-4 w-4 text-green-300" />
                <span className="text-sm">{t('hero.valueProp3')}</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => navigate({ to: '/register' })}
                size="lg"
                className="bg-white text-green-700 hover:bg-green-50 shadow-xl"
              >
                {t('hero.cta')}
              </Button>
              <Button
                onClick={() => navigate({ to: '/login' })}
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
              >
                {t('hero.seeLiveDemo')}
              </Button>
            </div>
          </div>

          {/* Right Column - Real Screenshot */}
          <div className="relative">
            <div className="relative bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20 shadow-2xl">
              {/* Desktop Screenshot */}
              <img
                src="/screenshots/dashboard-light.webp"
                alt="SmartMoney Dashboard"
                className="rounded-lg shadow-lg w-full"
                loading="eager"
              />
            </div>

            {/* Mobile Screenshot - Floating */}
            <div className="absolute -bottom-8 -left-8 w-32 lg:w-40 hidden md:block">
              <img
                src="/screenshots/dashboard-mobile.webp"
                alt="SmartMoney Mobile"
                className="rounded-xl shadow-2xl border-4 border-white"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
