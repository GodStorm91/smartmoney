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
  Flame,
  Zap,
  LogOut,
  ShoppingCart,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAuth } from '@/contexts/AuthContext'
import { useGamificationStats } from '@/services/gamification-service'

// Consistent icon configuration using Lucide icons
interface NavItemConfig {
  path: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  labelKey: string
  activeColor: string
  badge?: string
}

const NAV_CONFIG: Record<string, NavItemConfig> = {
  home: { path: '/', icon: Home, labelKey: 'nav.home', activeColor: 'text-primary-600 dark:text-primary-400' },
  budget: { path: '/budget', icon: TrendingUp, labelKey: 'nav.budget', activeColor: 'text-blue-600 dark:text-blue-400' },
  accounts: { path: '/accounts', icon: Wallet, labelKey: 'nav.accounts', activeColor: 'text-green-600 dark:text-green-400' },
  transactions: { path: '/transactions', icon: Receipt, labelKey: 'nav.transactions', activeColor: 'text-purple-600 dark:text-purple-400' },
  gamification: { path: '/gamification', icon: Trophy, labelKey: 'header.gamification', activeColor: 'text-yellow-500', badge: 'level' },
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

  const { data: gamificationStats } = useGamificationStats()

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const isPrimaryActive = primaryMenuItems.some(item => isActive(item.path))

  const formatNumber = (num: number) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
    return num.toString()
  }

  const getMenuItem = (key: string): NavItemConfig => NAV_CONFIG[key] || NAV_CONFIG.home

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
          {/* Gamification Header */}
          <div className="sticky top-0 bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 dark:from-primary-600 dark:via-primary-700 dark:to-primary-800 p-4 rounded-t-3xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-white" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-white/80 text-xs font-medium">Level</div>
                  <div className="text-2xl font-bold text-white">
                    {gamificationStats?.current_level || 1}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white/80 text-xs">Total XP</div>
                <div className="text-xl font-bold text-white">
                  {formatNumber(gamificationStats?.total_xp || 0)}
                </div>
              </div>
            </div>

            {/* XP Progress Bar */}
            <div className="bg-white/20 backdrop-blur rounded-full h-2 mb-3">
              <div
                className="bg-white h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, gamificationService.calculateLevelProgress(
                    gamificationStats?.total_xp || 0,
                    gamificationStats?.current_level || 1,
                    gamificationStats?.xp_to_next_level || 100
                  ))}%`
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-white/80">
              <span>{formatNumber(gamificationStats?.total_xp || 0)} XP</span>
              <span>{formatNumber((gamificationStats?.xp_to_next_level || 100) - ((gamificationStats?.total_xp || 0) % (gamificationStats?.xp_to_next_level || 100)))} XP to next</span>
            </div>

            {/* Stats Row */}
            <div className="flex gap-4 mt-4">
              <div className="flex-1 bg-white/10 backdrop-blur rounded-xl p-2 text-center">
                <div className="flex items-center justify-center gap-1 text-white">
                  <Flame className="w-4 h-4" />
                  <span className="font-bold">{gamificationStats?.current_streak || 0}</span>
                </div>
                <div className="text-xs text-white/70">Day Streak</div>
              </div>
              <div className="flex-1 bg-white/10 backdrop-blur rounded-xl p-2 text-center">
                <div className="flex items-center justify-center gap-1 text-yellow-300">
                  <Trophy className="w-4 h-4" />
                  <span className="font-bold">{gamificationStats?.achievements_unlocked || 0}/{gamificationStats?.achievements_total || 0}</span>
                </div>
                <div className="text-xs text-white/70">Badges</div>
              </div>
              <div className="flex-1 bg-white/10 backdrop-blur rounded-xl p-2 text-center">
                <div className="flex items-center justify-center gap-1 text-green-300">
                  <Zap className="w-4 h-4" />
                  <span className="font-bold">+{gamificationStats?.recent_xp_events?.[0]?.xp_earned || 0}</span>
                </div>
                <div className="text-xs text-white/70">Last XP</div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-4 space-y-6">
            {/* Primary Menu */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">
                {t('nav.explore', 'Explore')}
              </h3>
              <div className="space-y-2">
                {primaryMenuItems.map((item) => {
                  const active = isActive(item.path)
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMoreOpen(false)}
                      className={cn(
                        'flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all',
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
                      {item.badge === 'level' && (
                        <span className="px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold rounded-full">
                          Lv.{gamificationStats?.current_level || 1}
                        </span>
                      )}
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
              <div className="space-y-2">
                {secondaryMenuItems.map((item) => {
                  const active = isActive(item.path)
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMoreOpen(false)}
                      className={cn(
                        'flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all',
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

            {/* Quick Actions */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">
                {t('nav.quickActions', 'Quick Actions')}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {navItems.slice(0, 4).map((item) => {
                  const config = getMenuItem(item.path.slice(1))
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMoreOpen(false)}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <config.icon className="w-5 h-5 text-gray-500" strokeWidth={1.5} />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t(config.labelKey)}</span>
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
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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

import { gamificationService } from '@/services/gamification-service'
