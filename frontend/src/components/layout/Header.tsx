import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, Menu } from 'lucide-react'
import { cn } from '@/utils/cn'
import { LanguageSwitcher } from './LanguageSwitcher'
import { ThemeToggle } from './ThemeToggle'
import { useAuth } from '@/contexts/AuthContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useState } from 'react'
import { LevelBadge } from '@/components/gamification/LevelBadge'

export function Header() {
  const { t } = useTranslation('common')
  const { logout } = useAuth()
  const { isPrivacyMode, togglePrivacyMode } = usePrivacy()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
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
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">SmartMoney</h1>
          </Link>

          <div className="hidden md:flex items-center gap-4">
            <NavLink to="/">{t('header.dashboard')}</NavLink>
            <NavLink to="/transactions">{t('header.transactions')}</NavLink>
            <NavLink to="/accounts">{t('header.accounts')}</NavLink>
            <NavLink to="/goals">{t('header.goals')}</NavLink>
            <NavLink to="/analytics">{t('header.analytics')}</NavLink>
            <NavLink to="/budget">{t('header.budget')}</NavLink>
            <NavLink to="/gamification">{t('header.gamification')}</NavLink>
            <NavLink to="/upload">{t('header.upload')}</NavLink>
            <NavLink to="/settings">{t('header.settings')}</NavLink>
            <LevelBadge />
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={togglePrivacyMode}
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus-ring"
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
              className="hidden md:block text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus-ring"
              title={t('auth.logout')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-gray-200 dark:border-gray-700">
            <nav className="flex flex-col space-y-1">
              <MobileNavLink to="/" onClick={() => setIsMobileMenuOpen(false)}>
                {t('header.dashboard')}
              </MobileNavLink>
              <MobileNavLink to="/transactions" onClick={() => setIsMobileMenuOpen(false)}>
                {t('header.transactions')}
              </MobileNavLink>
              <MobileNavLink to="/accounts" onClick={() => setIsMobileMenuOpen(false)}>
                {t('header.accounts')}
              </MobileNavLink>
              <MobileNavLink to="/goals" onClick={() => setIsMobileMenuOpen(false)}>
                {t('header.goals')}
              </MobileNavLink>
              <MobileNavLink to="/analytics" onClick={() => setIsMobileMenuOpen(false)}>
                {t('header.analytics')}
              </MobileNavLink>
              <MobileNavLink to="/budget" onClick={() => setIsMobileMenuOpen(false)}>
                {t('header.budget')}
              </MobileNavLink>
              <MobileNavLink to="/gamification" onClick={() => setIsMobileMenuOpen(false)}>
                {t('header.gamification')}
              </MobileNavLink>
              <MobileNavLink to="/upload" onClick={() => setIsMobileMenuOpen(false)}>
                {t('header.upload')}
              </MobileNavLink>
              <MobileNavLink to="/settings" onClick={() => setIsMobileMenuOpen(false)}>
                {t('header.settings')}
              </MobileNavLink>
              <div className="flex items-center gap-3 pt-3 mt-2 border-t border-gray-200 dark:border-gray-700">
                <ThemeToggle />
                <LanguageSwitcher />
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    logout()
                  }}
                  className="flex items-center gap-2 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="font-medium">{t('auth.logout')}</span>
                </button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={cn(
        'text-sm xl:text-base text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors pb-1',
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

function MobileNavLink({ to, onClick, children }: { to: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center px-3 py-2.5 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
      activeProps={{
        className: 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
      }}
    >
      {children}
    </Link>
  )
}

