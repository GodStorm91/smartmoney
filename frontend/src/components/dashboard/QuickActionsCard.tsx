import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Upload, Target, BarChart3, ArrowRight } from 'lucide-react'

export function QuickActionsCard() {
  const { t } = useTranslation('common')

  const actions = [
    { to: '/upload', icon: Upload, label: t('dashboard.quickActionUpload') },
    { to: '/goals', icon: Target, label: t('dashboard.quickActionGoals') },
    { to: '/analytics', icon: BarChart3, label: t('dashboard.quickActionAnalytics') },
  ]

  return (
    <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-5 text-white shadow-lg shadow-primary-500/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{t('dashboard.quickActions')}</h3>
        <div className="p-2 bg-white/20 rounded-lg">
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
      <div className="space-y-2">
        {actions.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className="group block w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl p-4 transition-all duration-200 hover:scale-[1.02]"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                <Icon className="w-5 h-5" />
              </div>
              <span className="font-medium">{label}</span>
              <ArrowRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
