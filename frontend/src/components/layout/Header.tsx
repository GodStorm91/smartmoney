import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, Menu, LogOut, Home, Receipt, Wallet, Target, BarChart3, TrendingUp, Trophy, Upload, Settings } from 'lucide-react'
import { LanguageSwitcher } from './LanguageSwitcher'
import { ThemeToggle } from './ThemeToggle'
import { useAuth } from '@/contexts/AuthContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useState } from 'react'
import { AvatarBadge } from '@/components/gamification/AvatarBadge'
import { cn } from '@/utils/cn'

// Consistent icon configuration using Lucide icons (matching BottomNavigation)
interface MobileMenuItem {
  path: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  labelKey: string
  activeColor: string
}

const MOBILE_MENU_ITEMS: MobileMenuItem[] = [
  { path: '/', icon: Home, labelKey: 'header.dashboard', activeColor: 'text-primary-600 dark:text-primary-400' },
  { path: '/transactions', icon: Receipt, labelKey: 'header.transactions', activeColor: 'text-purple-600 dark:text-purple-400' },
  { path: '/accounts', icon: Wallet, labelKey: 'header.accounts', activeColor: 'text-green-600 dark:text-green-400' },
  { path: '/goals', icon: Target, labelKey: 'header.goals', activeColor: 'text-pink-600 dark:text-pink-400' },
  { path: '/analytics', icon: BarChart3, labelKey: 'header.analytics', activeColor: 'text-indigo-600 dark:text-indigo-400' },
  { path: '/budget', icon: TrendingUp, labelKey: 'header.budget', activeColor: 'text-blue-600 dark:text-blue-400' },
  { path: '/gamification', icon: Trophy, labelKey: 'header.gamification', activeColor: 'text-yellow-500' },
  { path: '/upload', icon: Upload, labelKey: 'header.upload', activeColor: 'text-cyan-600 dark:text-cyan-400' },
  { path: '/settings', icon: Settings, labelKey: 'header.settings', activeColor: 'text-gray-600 dark:text-gray-400' },
]

export function Header() {
  const { t } = useTranslation('common')
  const { logout } = useAuth()
  const { isPrivacyMode, togglePrivacyMode } = usePrivacy()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

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
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <div className="md:hidden">
              <LanguageSwitcher />
            </div>

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
              {MOBILE_MENU_ITEMS.map((item) => {
                const active = isActive(item.path)
                return (
                  <MobileNavLink 
                    key={item.path} 
                    to={item.path} 
                    onClick={() => setIsMobileMenuOpen(false)}
                    icon={item.icon}
                    active={active}
                    activeColor={item.activeColor}
                  >
                    {t(item.labelKey)}
                  </MobileNavLink>
                )
              })}
              <div className="flex items-center gap-3 pt-3 mt-2 border-t border-gray-200 dark:border-gray-700">
                <ThemeToggle />
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    logout()
                  }}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                    'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                  )}
                >
                  <LogOut className="w-5 h-5" />
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

interface MobileNavLinkProps {
  to: string
  onClick: () => void
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  active: boolean
  activeColor: string
  children: React.ReactNode
}

function MobileNavLink({ to, onClick, icon: Icon, active, activeColor, children }: MobileNavLinkProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium',
        active
          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
      )}
    >
      <Icon className={cn('w-5 h-5', active && activeColor)} strokeWidth={1.5} />
      <span>{children}</span>
    </Link>
  )
}
