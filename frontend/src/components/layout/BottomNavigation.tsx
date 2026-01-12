import { useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  Home,
  Receipt,
  Wallet,
  Target,
  Settings,
  TrendingUp,
  Plus,
  LogOut,
  Upload,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAuth } from '@/contexts/AuthContext'

const navItems = [
  { path: '/', icon: Home, labelKey: 'nav.home' },
  { path: '/transactions', icon: Receipt, labelKey: 'nav.transactions' },
  { path: '/accounts', icon: Wallet, labelKey: 'nav.accounts' },
  { path: '/goals', icon: Target, labelKey: 'nav.goals' },
  { path: '/settings', icon: Settings, labelKey: 'nav.settings' },
]

const moreMenuItems = [
  { path: '/upload', icon: Upload, labelKey: 'header.upload' },
  { path: '/analytics', icon: TrendingUp, labelKey: 'nav.analytics' },
]

export function BottomNavigation() {
  const { t } = useTranslation('common')
  const location = useLocation()
  const { logout } = useAuth()
  const [isMoreOpen, setIsMoreOpen] = useState(false)

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const isMoreActive = moreMenuItems.some(item => isActive(item.path))

  return (
    <>
      {isMoreOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMoreOpen(false)}
        />
      )}

      {isMoreOpen && (
        <div className="fixed bottom-20 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50 md:hidden rounded-t-2xl shadow-lg animate-slide-up">
          <div className="p-4 space-y-2">
            {moreMenuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMoreOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors',
                  isActive(item.path)
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{t(item.labelKey)}</span>
              </Link>
            ))}

            <button
              onClick={() => {
                setIsMoreOpen(false)
                logout()
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">{t('auth.logout')}</span>
            </button>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-40 md:hidden safe-area-bottom">
        <div className="flex items-stretch justify-around h-[68px]">
          {navItems.map((item) => {
            const active = isActive(item.path)

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMoreOpen(false)}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 px-1 transition-all relative',
                  active
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                )}
              >
                {active && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary-500 dark:bg-primary-400 rounded-full" />
                )}
                <div className={cn(
                  'p-2 rounded-xl transition-colors',
                  active && 'bg-primary-50 dark:bg-primary-900/20'
                )}>
                  <item.icon className="w-6 h-6" strokeWidth={active ? 2.5 : 2} />
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
              isMoreActive || isMoreOpen
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            )}
          >
            {isMoreOpen && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary-500 dark:bg-primary-400 rounded-full" />
            )}
            <div className={cn(
              'p-2 rounded-xl transition-colors',
              isMoreOpen && 'bg-primary-50 dark:bg-primary-900/20'
            )}>
              <Plus className="w-6 h-6" strokeWidth={isMoreOpen ? 2.5 : 2} />
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
