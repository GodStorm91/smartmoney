import { useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  Home, Receipt, Wallet, Settings, TrendingUp, Target, Upload,
  Trophy, BarChart3, ShoppingCart, MapPinned, LogOut, ChevronsLeft, ChevronsRight,
  Scale,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAuth } from '@/contexts/AuthContext'

interface SidebarItem {
  path: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  labelKey: string
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { path: '/', icon: Home, labelKey: 'nav.home' },
  { path: '/transactions', icon: Receipt, labelKey: 'nav.transactions' },
  { path: '/accounts', icon: Wallet, labelKey: 'nav.accounts' },
  { path: '/budget', icon: TrendingUp, labelKey: 'nav.budget' },
  { path: '/analytics', icon: BarChart3, labelKey: 'nav.analytics' },
  { path: '/benchmark', icon: Scale, labelKey: 'nav.benchmark' },
  { path: '/goals', icon: Target, labelKey: 'nav.goals' },
  { path: '/proxy', icon: ShoppingCart, labelKey: 'nav.proxy' },
  { path: '/relocation', icon: MapPinned, labelKey: 'nav.relocation' },
  { path: '/gamification', icon: Trophy, labelKey: 'header.gamification' },
  { path: '/upload', icon: Upload, labelKey: 'header.upload' },
  { path: '/settings', icon: Settings, labelKey: 'nav.settings' },
]

export function Sidebar() {
  const { t } = useTranslation('common')
  const location = useLocation()
  const { logout } = useAuth()
  const [expanded, setExpanded] = useState(false)

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <aside
      className={cn(
        'hidden md:flex fixed left-0 top-0 h-screen flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-40 transition-[width] duration-200',
        expanded ? 'w-56' : 'w-16'
      )}
    >
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 px-4 h-16 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <svg className="w-7 h-7 text-primary-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        {expanded && <span className="text-lg font-bold text-gray-900 dark:text-white truncate">SmartMoney</span>}
      </Link>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
        {SIDEBAR_ITEMS.map((item) => {
          const active = isActive(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              title={!expanded ? t(item.labelKey) : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg transition-colors h-10',
                expanded ? 'px-3' : 'justify-center px-0',
                active
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" strokeWidth={active ? 2 : 1.5} />
              {expanded && <span className="text-sm font-medium truncate">{t(item.labelKey)}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: Logout + Collapse */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-2 space-y-1">
        <button
          onClick={logout}
          title={!expanded ? t('auth.logout') : undefined}
          className={cn(
            'flex items-center gap-3 rounded-lg transition-colors h-10 w-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
            expanded ? 'px-3' : 'justify-center px-0'
          )}
        >
          <LogOut className="w-5 h-5 shrink-0" strokeWidth={1.5} />
          {expanded && <span className="text-sm font-medium">{t('auth.logout')}</span>}
        </button>
        <button
          onClick={() => setExpanded(!expanded)}
          title={expanded ? t('nav.collapse', 'Collapse') : t('nav.expand', 'Expand')}
          className={cn(
            'flex items-center gap-3 rounded-lg transition-colors h-10 w-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700',
            expanded ? 'px-3' : 'justify-center px-0'
          )}
        >
          {expanded ? <ChevronsLeft className="w-5 h-5 shrink-0" /> : <ChevronsRight className="w-5 h-5 shrink-0" />}
          {expanded && <span className="text-sm font-medium">{t('nav.collapse', 'Collapse')}</span>}
        </button>
      </div>
    </aside>
  )
}
