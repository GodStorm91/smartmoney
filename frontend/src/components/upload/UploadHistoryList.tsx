import { useTranslation } from 'react-i18next'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatDateTime } from '@/utils/formatDate'
import type { UploadResult } from '@/types'

interface UploadHistoryListProps {
  history?: UploadResult[]
  isLoading: boolean
}

export function UploadHistoryList({ history, isLoading }: UploadHistoryListProps) {
  const { t } = useTranslation('common')
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    )
  }

  if (!history || history.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('upload.noHistory')}</h3>
        <p className="text-gray-600">{t('upload.uploadFirst')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {history.map((result, index) => (
        <UploadResultCard key={index} result={result} />
      ))}
    </div>
  )
}

function UploadResultCard({ result }: { result: UploadResult }) {
  const { t } = useTranslation('common')
  const bgColor = result.status === 'success' ? 'bg-green-50 border-green-200' : result.status === 'warning' ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'
  const iconColor = result.status === 'success' ? 'bg-green-100 text-green-600' : result.status === 'warning' ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-200 text-gray-600'
  const badgeColor = result.status === 'success' ? 'bg-green-100 text-green-800' : result.status === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-200 text-gray-700'
  const badgeLabel = result.status === 'success' ? t('upload.success') : result.status === 'warning' ? t('upload.warning') : t('upload.completed')

  return (
    <div className={`flex items-start gap-4 p-4 border rounded-lg ${bgColor}`}>
      <div className={`p-2 rounded-lg ${iconColor}`}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {result.status === 'warning' ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          )}
        </svg>
      </div>
      <div className="flex-1">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h4 className="font-semibold text-gray-900">{result.filename}</h4>
            <p className="text-sm text-gray-600">{formatDateTime(result.uploaded_at)}</p>
          </div>
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${badgeColor}`}>{badgeLabel}</span>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600">{t('upload.imported')}</p>
            <p className="font-semibold font-numbers text-gray-900">{result.imported_count}{t('upload.count')}</p>
          </div>
          <div>
            <p className="text-gray-600">{t('upload.duplicates')}</p>
            <p className="font-semibold font-numbers text-gray-900">{result.duplicate_count}{t('upload.count')}</p>
          </div>
          <div>
            <p className="text-gray-600">{t('upload.errors')}</p>
            <p className={`font-semibold font-numbers ${result.error_count > 0 ? 'text-yellow-700' : 'text-gray-900'}`}>{result.error_count}{t('upload.count')}</p>
          </div>
        </div>
        {result.errors && result.errors.length > 0 && (
          <div className="mt-3 text-sm text-yellow-800 bg-yellow-100 p-3 rounded">
            <p className="font-medium mb-1">{t('upload.errorDetails')}</p>
            <ul className="space-y-1 text-xs">
              {result.errors.map((error, idx) => (
                <li key={idx}>• {t('upload.row')}{error.row}: {error.message}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
