import { useTranslation } from 'react-i18next'
import type { FileUploadItem as FileUploadItemType } from '@/types'

interface FileUploadItemProps {
  item: FileUploadItemType
  onRemove?: (id: string) => void
}

export function FileUploadItem({ item, onRemove }: FileUploadItemProps) {
  const { t } = useTranslation('common')

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getStatusBadge = () => {
    switch (item.status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {t('upload.statusPending')}
          </span>
        )
      case 'uploading':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <svg className="animate-spin -ml-0.5 mr-1.5 h-3 w-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {t('upload.statusUploading')}
          </span>
        )
      case 'success':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {t('upload.statusSuccess')}
          </span>
        )
      case 'error':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {t('upload.statusError')}
          </span>
        )
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        {/* File Info */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* File Icon */}
          <div className="flex-shrink-0">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>

          {/* File Details */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{item.file.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{formatFileSize(item.file.size)}</p>

            {/* Progress Bar (show when uploading) */}
            {item.status === 'uploading' && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Success Details */}
            {item.status === 'success' && item.backendResult && (
              <div className="mt-2 text-xs text-gray-600">
                <span className="text-green-600 font-medium">{item.backendResult.created}</span> {t('upload.created')},
                <span className="ml-1 text-gray-500">{item.backendResult.skipped}</span> {t('upload.skipped')}
              </div>
            )}

            {/* Error Message */}
            {item.status === 'error' && item.error && (
              <div className="mt-2 text-xs text-red-600">
                {item.error}
              </div>
            )}
          </div>
        </div>

        {/* Status Badge & Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {getStatusBadge()}

          {/* Remove Button (only for pending files) */}
          {item.status === 'pending' && onRemove && (
            <button
              onClick={() => onRemove(item.id)}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              aria-label={t('upload.removeFile')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
