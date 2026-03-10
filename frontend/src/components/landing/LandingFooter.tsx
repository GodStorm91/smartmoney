import { useTranslation } from 'react-i18next'
import { TrendingUp, Github } from 'lucide-react'

export function LandingFooter() {
  const { t } = useTranslation('landing')

  return (
    <footer className="bg-gray-900 text-gray-400 py-10">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary-500" />
            <span className="text-base font-bold text-white">SmartMoney</span>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <a
              href="https://github.com/GodStorm91/smartmoney"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-white transition-colors"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
            <a href="#" className="hover:text-white transition-colors">
              {t('footer.privacy')}
            </a>
            <a href="#" className="hover:text-white transition-colors">
              {t('footer.terms')}
            </a>
          </div>

          <p className="text-sm">
            {t('footer.copyright')}
          </p>
        </div>
      </div>
    </footer>
  )
}
