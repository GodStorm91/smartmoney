import { useTranslation } from 'react-i18next'
import { Download, Mail, Loader2 } from 'lucide-react'
import { formatMonth } from '@/utils/formatDate'

interface ReportHeaderProps {
  year: number
  month: number
  onDownloadPDF: () => void
  isDownloading: boolean
}

export function ReportHeader({ year, month, onDownloadPDF, isDownloading }: ReportHeaderProps) {
  const { t } = useTranslation('common')
  const monthName = formatMonth(new Date(year, month - 1))

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
          onClick={onDownloadPDF}
          disabled={isDownloading}
          className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label={isDownloading ? t('report.downloading') : t('report.downloadPDF')}
          title={isDownloading ? t('report.downloading') : t('report.downloadPDF')}
        >
          {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
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
