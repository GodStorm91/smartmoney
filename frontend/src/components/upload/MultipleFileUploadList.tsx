import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { FileUploadItem } from './FileUploadItem'
import type { FileUploadItem as FileUploadItemType } from '@/types'

interface MultipleFileUploadListProps {
  files: FileUploadItemType[]
  onRemoveFile: (id: string) => void
  onUploadAll: () => void
  onClearAll: () => void
  uploading: boolean
}

export function MultipleFileUploadList({
  files,
  onRemoveFile,
  onUploadAll,
  onClearAll,
  uploading,
}: MultipleFileUploadListProps) {
  const { t } = useTranslation('common')

  if (files.length === 0) {
    return null
  }

  const pendingFiles = files.filter(f => f.status === 'pending')
  const uploadingFiles = files.filter(f => f.status === 'uploading')
  const successFiles = files.filter(f => f.status === 'success')
  const errorFiles = files.filter(f => f.status === 'error')

  const allCompleted = files.length > 0 && pendingFiles.length === 0 && uploadingFiles.length === 0

  return (
    <div className="mt-6 space-y-4">
      {/* Summary Stats */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-900">{files.length}</span>
            <span className="ml-1 text-gray-600">{t('upload.filesSelected')}</span>
          </div>
          {successFiles.length > 0 && (
            <div>
              <span className="font-medium text-green-600">{successFiles.length}</span>
              <span className="ml-1 text-gray-600">{t('upload.uploaded')}</span>
            </div>
          )}
          {errorFiles.length > 0 && (
            <div>
              <span className="font-medium text-red-600">{errorFiles.length}</span>
              <span className="ml-1 text-gray-600">{t('upload.failed')}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {!allCompleted && pendingFiles.length > 0 && (
            <Button
              variant="primary"
              onClick={onUploadAll}
              disabled={uploading || pendingFiles.length === 0}
            >
              {uploading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t('upload.uploading')}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {t('upload.uploadAll')} ({pendingFiles.length})
                </>
              )}
            </Button>
          )}

          {allCompleted && (
            <Button variant="outline" onClick={onClearAll}>
              {t('upload.clearAll')}
            </Button>
          )}
        </div>
      </div>

      {/* File List */}
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {files.map(file => (
          <FileUploadItem
            key={file.id}
            item={file}
            onRemove={file.status === 'pending' ? onRemoveFile : undefined}
          />
        ))}
      </div>

      {/* Overall Progress Message */}
      {uploading && (
        <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>
            {t('upload.uploadingProgress', {
              current: successFiles.length + uploadingFiles.length,
              total: files.length,
            })}
          </span>
        </div>
      )}

      {/* Completion Message */}
      {allCompleted && (
        <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
          errorFiles.length > 0 ? 'text-yellow-800 bg-yellow-50' : 'text-green-800 bg-green-50'
        }`}>
          <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>
            {errorFiles.length > 0
              ? t('upload.completedWithErrors', { success: successFiles.length, error: errorFiles.length })
              : t('upload.allCompleted', { count: successFiles.length })}
          </span>
        </div>
      )}
    </div>
  )
}
