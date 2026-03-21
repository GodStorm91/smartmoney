import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, LogOut } from 'lucide-react'
import { LanguageSwitcher } from './LanguageSwitcher'
import { ThemeToggle } from './ThemeToggle'
import { useAuth } from '@/contexts/AuthContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { AvatarBadge } from '@/components/gamification/AvatarBadge'

export function Header() {
  const { t } = useTranslation('common')
  const { logout } = useAuth()
  const { isPrivacyMode, togglePrivacyMode } = usePrivacy()

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <svg
                className="w-7 h-7 sm:w-8 sm:h-8 text-primary-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white hidden sm:block">SmartMoney</h1>
            </Link>
            <AvatarBadge />
          </div>

          <div className="hidden md:flex items-center gap-1 sm:gap-2">
            <button
              onClick={togglePrivacyMode}
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus-ring"
              aria-label={isPrivacyMode ? t('aria.showAmounts') : t('aria.hideAmounts')}
              title={isPrivacyMode ? t('aria.showAmounts') : t('aria.hideAmounts')}
            >
              {isPrivacyMode ? (
                <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
              )}
            </button>

            <div className="hidden sm:block">
              <ThemeToggle />
            </div>

            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>

            <button
              onClick={logout}
              className="hidden md:block text-gray-600 dark:text-gray-300 hover:text-expense-600 dark:hover:text-expense-300 transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus-ring"
              title={t('auth.logout')}
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <div className="md:hidden">
              <LanguageSwitcher />
            </div>

            <button
              onClick={togglePrivacyMode}
              className="md:hidden text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus-ring"
              aria-label={isPrivacyMode ? t('aria.showAmounts') : t('aria.hideAmounts')}
              title={isPrivacyMode ? t('aria.showAmounts') : t('aria.hideAmounts')}
            >
              {isPrivacyMode ? (
                <EyeOff className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Eye className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
