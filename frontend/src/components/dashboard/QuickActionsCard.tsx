import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export function QuickActionsCard() {
  const { t } = useTranslation('common')

  return (
    <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl p-6 text-white shadow-lg">
      <h3 className="text-lg font-semibold mb-4">{t('dashboard.quickActions')}</h3>
      <div className="space-y-3">
        <Link
          to="/upload"
          className="block w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-4 transition-colors"
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="font-medium">{t('dashboard.quickActionUpload')}</span>
          </div>
        </Link>

        <Link
          to="/goals"
          className="block w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-4 transition-colors"
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
            </svg>
            <span className="font-medium">{t('dashboard.quickActionGoals')}</span>
          </div>
        </Link>

        <Link
          to="/analytics"
          className="block w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-4 transition-colors"
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="font-medium">{t('dashboard.quickActionAnalytics')}</span>
          </div>
        </Link>
      </div>
    </div>
  )
}
