import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Upload, Target, BarChart3 } from 'lucide-react'

export function QuickActionsCard() {
  const { t } = useTranslation('common')

  return (
    <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl p-5 text-white shadow-lg">
      <h3 className="text-lg font-semibold mb-4">{t('dashboard.quickActions')}</h3>
      <div className="space-y-2.5">
        <Link
          to="/upload"
          className="block w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-3.5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Upload className="w-5 h-5" />
            <span className="font-medium">{t('dashboard.quickActionUpload')}</span>
          </div>
        </Link>

        <Link
          to="/goals"
          className="block w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-3.5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5" />
            <span className="font-medium">{t('dashboard.quickActionGoals')}</span>
          </div>
        </Link>

        <Link
          to="/analytics"
          className="block w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-3.5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5" />
            <span className="font-medium">{t('dashboard.quickActionAnalytics')}</span>
          </div>
        </Link>
      </div>
    </div>
  )
}
