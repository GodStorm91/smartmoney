import { Button } from '@/components/ui/Button'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { TrendingUp, Globe } from 'lucide-react'
import { useState } from 'react'

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' }
]

export function LandingHeader() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation('landing')
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)

  const currentLanguage = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0]

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code)
    setShowLanguageMenu(false)
  }

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <span className="text-xl font-bold text-gray-900">SmartMoney</span>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Globe className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{currentLanguage.flag}</span>
              </button>

              {showLanguageMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => changeLanguage(lang.code)}
                      className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 ${
                        i18n.language === lang.code ? 'bg-green-50 text-green-700' : 'text-gray-700'
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Auth Buttons */}
            <Button
              onClick={() => navigate({ to: '/login' })}
              variant="outline"
              size="sm"
            >
              Login
            </Button>
            <Button
              onClick={() => navigate({ to: '/register' })}
              size="sm"
            >
              {t('hero.cta')}
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
