import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/utils/cn'
import { LanguageSwitcher } from './LanguageSwitcher'
import { useAuth } from '@/contexts/AuthContext'
import { usePrivacy } from '@/contexts/PrivacyContext'

export function Header() {
  const { t } = useTranslation('common')
  const { logout } = useAuth()
  const { isPrivacyMode, togglePrivacyMode } = usePrivacy()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
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
            <h1 className="text-xl font-bold text-gray-900">SmartMoney</h1>
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
            <NavLink to="/accounts">{t('header.accounts')}</NavLink>
            <NavLink to="/analytics">{t('header.analytics')}</NavLink>
            <NavLink to="/goals">{t('header.goals')}</NavLink>
            <NavLink to="/budget">{t('header.budget')}</NavLink>
            <NavLink to="/settings">{t('header.settings')}</NavLink>

            {/* Privacy Toggle - Desktop */}
            <button
              onClick={togglePrivacyMode}
              className="text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-100 focus-ring"
              aria-label={isPrivacyMode ? t('aria.showAmounts') : t('aria.hideAmounts')}
              title={isPrivacyMode ? t('aria.showAmounts') : t('aria.hideAmounts')}
            >
              {isPrivacyMode ? (
                <EyeOff className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Eye className="w-5 h-5" aria-hidden="true" />
              )}
            </button>

            {/* Language Switcher - Desktop */}
            <LanguageSwitcher />

            {/* Logout Button - Desktop */}
            <button
              onClick={logout}
              className="text-gray-600 hover:text-red-600 transition-colors px-3 py-1 rounded focus-ring"
              title={t('auth.logout')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </nav>

          {/* Mobile: Privacy Toggle + Language Switcher + Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={togglePrivacyMode}
              className="text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-100 focus-ring"
              aria-label={isPrivacyMode ? t('aria.showAmounts') : t('aria.hideAmounts')}
            >
              {isPrivacyMode ? (
                <EyeOff className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Eye className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
            <LanguageSwitcher />
            <button
              className="p-2 rounded-lg hover:bg-gray-100 focus-ring"
              aria-label={isMobileMenuOpen ? t('aria.closeMenu') : t('aria.openMenu')}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {isMobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav
            className="md:hidden py-4 border-t border-gray-200"
            role="navigation"
            aria-label={t('aria.mobileNavigation')}
          >
            <div className="flex flex-col gap-2">
              <MobileNavLink to="/" onClick={() => setIsMobileMenuOpen(false)}>
                {t('header.dashboard')}
              </MobileNavLink>
              <MobileNavLink to="/upload" onClick={() => setIsMobileMenuOpen(false)}>
                {t('header.upload')}
              </MobileNavLink>
              <MobileNavLink to="/transactions" onClick={() => setIsMobileMenuOpen(false)}>
                {t('header.transactions')}
              </MobileNavLink>
              <MobileNavLink to="/accounts" onClick={() => setIsMobileMenuOpen(false)}>
                {t('header.accounts')}
              </MobileNavLink>
              <MobileNavLink to="/analytics" onClick={() => setIsMobileMenuOpen(false)}>
                {t('header.analytics')}
              </MobileNavLink>
              <MobileNavLink to="/goals" onClick={() => setIsMobileMenuOpen(false)}>
                {t('header.goals')}
              </MobileNavLink>
              <MobileNavLink to="/budget" onClick={() => setIsMobileMenuOpen(false)}>
                {t('header.budget')}
              </MobileNavLink>
              <MobileNavLink to="/settings" onClick={() => setIsMobileMenuOpen(false)}>
                {t('header.settings')}
              </MobileNavLink>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  logout()
                }}
                className="px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors focus-ring text-left flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {t('auth.logout')}
              </button>
            </div>
          </nav>
        )}
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
        'text-gray-600 hover:text-gray-900 transition-colors pb-1',
        'focus-ring rounded'
      )}
      activeProps={{
        className: 'text-primary-600 font-medium border-b-2 border-primary-600',
      }}
    >
      {children}
    </Link>
  )
}

// Mobile navigation link component
function MobileNavLink({
  to,
  children,
  onClick,
}: {
  to: string
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        'px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100',
        'transition-colors focus-ring'
      )}
      activeProps={{
        className: 'bg-primary-50 text-primary-700 font-medium',
      }}
    >
      {children}
    </Link>
  )
}
