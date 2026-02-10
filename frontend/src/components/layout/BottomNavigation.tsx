import { useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  Home,
  Receipt,
  Wallet,
  Settings,
  TrendingUp,
  Target,
  Upload,
  Trophy,
  BarChart3,
  ChevronRight,
  LogOut,
  ShoppingCart,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAuth } from '@/contexts/AuthContext'

// Consistent icon configuration using Lucide icons
interface NavItemConfig {
  path: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  labelKey: string
  activeColor: string
}

export const NAV_CONFIG: Record<string, NavItemConfig> = {
  home: { path: '/', icon: Home, labelKey: 'nav.home', activeColor: 'text-primary-600 dark:text-primary-400' },
  budget: { path: '/budget', icon: TrendingUp, labelKey: 'nav.budget', activeColor: 'text-blue-600 dark:text-blue-400' },
  accounts: { path: '/accounts', icon: Wallet, labelKey: 'nav.accounts', activeColor: 'text-green-600 dark:text-green-400' },
  transactions: { path: '/transactions', icon: Receipt, labelKey: 'nav.transactions', activeColor: 'text-purple-600 dark:text-purple-400' },
  gamification: { path: '/gamification', icon: Trophy, labelKey: 'header.gamification', activeColor: 'text-yellow-500' },
  analytics: { path: '/analytics', icon: BarChart3, labelKey: 'nav.analytics', activeColor: 'text-indigo-600 dark:text-indigo-400' },
  goals: { path: '/goals', icon: Target, labelKey: 'nav.goals', activeColor: 'text-pink-600 dark:text-pink-400' },
  proxy: { path: '/proxy', icon: ShoppingCart, labelKey: 'nav.proxy', activeColor: 'text-orange-600 dark:text-orange-400' },
  settings: { path: '/settings', icon: Settings, labelKey: 'nav.settings', activeColor: 'text-gray-600 dark:text-gray-400' },
  upload: { path: '/upload', icon: Upload, labelKey: 'header.upload', activeColor: 'text-cyan-600 dark:text-cyan-400' },
}

const navItems: NavItemConfig[] = [
  NAV_CONFIG.home,
  NAV_CONFIG.budget,
  NAV_CONFIG.accounts,
  NAV_CONFIG.transactions,
]

const primaryMenuItems: NavItemConfig[] = [
  NAV_CONFIG.gamification,
  NAV_CONFIG.analytics,
  NAV_CONFIG.goals,
  NAV_CONFIG.proxy,
]

const secondaryMenuItems: NavItemConfig[] = [
  NAV_CONFIG.settings,
  NAV_CONFIG.upload,
]

// Custom More icon (three dots)
const MoreIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="19" r="1" />
  </svg>
)

export function BottomNavigation() {
  const { t } = useTranslation('common')
  const location = useLocation()
  const { logout } = useAuth()
  const [isMoreOpen, setIsMoreOpen] = useState(false)

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const isPrimaryActive = primaryMenuItems.some(item => isActive(item.path))

  return (
    <>
      {isMoreOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMoreOpen(false)}
        />
      )}

      {isMoreOpen && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-50 md:hidden rounded-t-3xl shadow-2xl animate-slide-up max-h-[85vh] overflow-y-auto">
          {/* Handle Bar */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>

          {/* Menu Items */}
          <div className="p-4 space-y-6">
            {/* Primary Menu */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">
                {t('nav.explore', 'Explore')}
              </h3>
              <div className="space-y-1">
                {primaryMenuItems.map((item) => {
                  const active = isActive(item.path)
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMoreOpen(false)}
                      className={cn(
                        'flex items-center gap-4 px-4 py-3 rounded-xl transition-all',
                        active
                          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                      )}
                    >
                      <div className={cn(
                        'w-10 h-10 flex items-center justify-center rounded-lg',
                        active ? 'bg-primary-100 dark:bg-primary-900/50' : 'bg-gray-100 dark:bg-gray-800'
                      )}>
                        <item.icon className="w-5 h-5" strokeWidth={1.5} />
                      </div>
                      <span className="font-medium flex-1">{t(item.labelKey)}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Secondary Menu */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">
                {t('nav.settings', 'Settings')}
              </h3>
              <div className="space-y-1">
                {secondaryMenuItems.map((item) => {
                  const active = isActive(item.path)
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMoreOpen(false)}
                      className={cn(
                        'flex items-center gap-4 px-4 py-3 rounded-xl transition-all',
                        active
                          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                      )}
                    >
                      <div className={cn(
                        'w-10 h-10 flex items-center justify-center rounded-lg',
                        active ? 'bg-primary-100 dark:bg-primary-900/50' : 'bg-gray-100 dark:bg-gray-800'
                      )}>
                        <item.icon className="w-5 h-5" strokeWidth={1.5} />
                      </div>
                      <span className="font-medium flex-1">{t(item.labelKey)}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={() => {
                setIsMoreOpen(false)
                logout()
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <div className="w-10 h-10 flex items-center justify-center bg-red-100 dark:bg-red-900/30 rounded-lg">
                <LogOut className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <span className="font-medium">{t('auth.logout')}</span>
            </button>
          </div>

          <div className="h-safe-area" />
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50 md:hidden safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="flex items-stretch justify-around h-[calc(4rem+env(safe-area-inset-bottom,0px))]">
          {navItems.map((item) => {
            const active = isActive(item.path)

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMoreOpen(false)}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 px-1 transition-all relative',
                  active ? item.activeColor : 'text-gray-400 dark:text-gray-500'
                )}
              >
                {active && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary-500 dark:bg-primary-400 rounded-full" />
                )}
                <div className={cn(
                  'p-2 rounded-xl transition-colors',
                  active && 'bg-primary-50 dark:bg-primary-900/20'
                )}>
                  <item.icon className="w-6 h-6" strokeWidth={active ? 2 : 1.5} />
                </div>
                <span className="text-[10px] font-medium mt-1 truncate max-w-full px-0.5">
                  {t(item.labelKey)}
                </span>
              </Link>
            )
          })}

          <button
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className={cn(
              'flex flex-col items-center justify-center flex-1 px-1 transition-all relative',
              isPrimaryActive || isMoreOpen
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-400 dark:text-gray-500'
            )}
          >
            {isMoreOpen && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary-500 dark:bg-primary-400 rounded-full" />
            )}
            <div className={cn(
              'p-2 rounded-xl transition-colors',
              isMoreOpen && 'bg-primary-50 dark:bg-primary-900/20'
            )}>
              <MoreIcon className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-medium mt-1">
              {t('nav.more')}
            </span>
          </button>
        </div>
      </nav>
    </>
  )
}
