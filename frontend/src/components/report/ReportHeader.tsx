import { useTranslation } from 'react-i18next'
import { Download, Mail } from 'lucide-react'
import { format } from 'date-fns'

interface ReportHeaderProps {
  year: number
  month: number
}

export function ReportHeader({ year, month }: ReportHeaderProps) {
  const { t } = useTranslation('common')
  const monthName = format(new Date(year, month - 1), 'MMMM yyyy')

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          {t('report.title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{monthName}</p>
      </div>
      <div className="flex gap-2">
        <button
          disabled
          className="p-2 rounded-lg text-gray-400 dark:text-gray-600 cursor-not-allowed"
          aria-label={t('report.downloadPDF')}
          title={t('report.comingSoon')}
        >
          <Download size={18} />
        </button>
        <button
          disabled
          className="p-2 rounded-lg text-gray-400 dark:text-gray-600 cursor-not-allowed"
          aria-label={t('report.sendEmail')}
          title={t('report.comingSoon')}
        >
          <Mail size={18} />
        </button>
      </div>
    </div>
  )
}
