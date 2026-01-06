import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/utils/cn'
import { LanguageSwitcher } from './LanguageSwitcher'
import { ThemeToggle } from './ThemeToggle'
import { useAuth } from '@/contexts/AuthContext'
import { usePrivacy } from '@/contexts/PrivacyContext'

export function Header() {
  const { t } = useTranslation('common')
  const { logout } = useAuth()
  const { isPrivacyMode, togglePrivacyMode } = usePrivacy()

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <svg
              className="w-8 h-8 text-primary-500"
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
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">SmartMoney</h1>
          </Link>

          {/* Desktop Navigation */}
          <nav
            className="hidden md:flex items-center gap-6"
            role="navigation"
            aria-label={t('aria.mainNavigation')}
          >
            <NavLink to="/">{t('header.dashboard')}</NavLink>
            <NavLink to="/upload">{t('header.upload')}</NavLink>
            <NavLink to="/transactions">{t('header.transactions')}</NavLink>
            <NavLink to="/recurring">{t('header.recurring')}</NavLink>
            <NavLink to="/accounts">{t('header.accounts')}</NavLink>
            <NavLink to="/analytics">{t('header.analytics')}</NavLink>
            <NavLink to="/goals">{t('header.goals')}</NavLink>
            <NavLink to="/budget">{t('header.budget')}</NavLink>
            <NavLink to="/settings">{t('header.settings')}</NavLink>

            {/* Privacy Toggle - Desktop */}
            <button
              onClick={togglePrivacyMode}
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus-ring"
              aria-label={isPrivacyMode ? t('aria.showAmounts') : t('aria.hideAmounts')}
              title={isPrivacyMode ? t('aria.showAmounts') : t('aria.hideAmounts')}
            >
              {isPrivacyMode ? (
                <EyeOff className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Eye className="w-5 h-5" aria-hidden="true" />
              )}
            </button>

            {/* Theme Toggle - Desktop */}
            <ThemeToggle />

            {/* Language Switcher - Desktop */}
            <LanguageSwitcher />

            {/* Logout Button - Desktop */}
            <button
              onClick={logout}
              className="text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors px-3 py-1 rounded focus-ring"
              title={t('auth.logout')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </nav>

          {/* Mobile: Privacy Toggle + Theme Toggle + Language Switcher */}
          <div className="md:hidden flex items-center gap-1">
            <button
              onClick={togglePrivacyMode}
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus-ring"
              aria-label={isPrivacyMode ? t('aria.showAmounts') : t('aria.hideAmounts')}
            >
              {isPrivacyMode ? (
                <EyeOff className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Eye className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </header>
  )
}

// Desktop navigation link component
function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={cn(
        'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors pb-1',
        'focus-ring rounded'
      )}
      activeProps={{
        className: 'text-primary-600 dark:text-primary-400 font-medium border-b-2 border-primary-600 dark:border-primary-400',
      }}
    >
      {children}
    </Link>
  )
}

