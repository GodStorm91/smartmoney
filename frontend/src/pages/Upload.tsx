import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { UploadDropZone } from '@/components/upload/UploadDropZone'
import { UploadHistoryList } from '@/components/upload/UploadHistoryList'
import { UploadFAQ } from '@/components/upload/UploadFAQ'
import { MultipleFileUploadList } from '@/components/upload/MultipleFileUploadList'
import { uploadCSV, uploadPayPayImage, fetchUploadHistory } from '@/services/upload-service'
import type { FileUploadItem } from '@/types'

type UploadMode = 'csv' | 'paypay'

export function Upload() {
  const { t } = useTranslation('common')
  const [uploadMode, setUploadMode] = useState<UploadMode>('csv')
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fileItems, setFileItems] = useState<FileUploadItem[]>([])
  const queryClient = useQueryClient()

  const { data: history, isLoading } = useQuery({
    queryKey: ['upload-history'],
    queryFn: fetchUploadHistory,
  })

  const uploadMutation = useMutation({
    mutationFn: uploadMode === 'csv' ? uploadCSV : uploadPayPayImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upload-history'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
    },
  })

  // File validation based on mode
  const isValidFile = (file: File): boolean => {
    if (uploadMode === 'csv') {
      return file.name.endsWith('.csv')
    }
    return /\.(png|jpg|jpeg)$/i.test(file.name)
  }

  const maxFileSize = uploadMode === 'csv' ? 50 * 1024 * 1024 : 10 * 1024 * 1024
  const acceptedTypes = uploadMode === 'csv' ? '.csv' : '.png,.jpg,.jpeg'

  const handleFilesSelect = (files: FileList) => {
    const newFiles: FileUploadItem[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      // Validate file type based on mode
      if (!isValidFile(file)) {
        const alertKey = uploadMode === 'csv' ? 'upload.alertSelectCSV' : 'upload.alertSelectImage'
        alert(t(alertKey, { filename: file.name }))
        continue
      }

      if (file.size > maxFileSize) {
        alert(t('upload.alertMaxSize', { filename: file.name }))
        continue
      }

      // Check for duplicates
      const isDuplicate = fileItems.some(item =>
        item.file.name === file.name && item.file.size === file.size
      )

      if (isDuplicate) {
        continue
      }

      newFiles.push({
        id: `${file.name}-${file.size}-${Date.now()}-${i}`,
        file,
        status: 'pending',
        progress: 0,
      })
    }

    if (newFiles.length > 0) {
      setFileItems(prev => [...prev, ...newFiles])
    }
  }

  const handleRemoveFile = (id: string) => {
    setFileItems(prev => prev.filter(item => item.id !== id))
  }

  const handleClearAll = () => {
    setFileItems([])
  }

  const uploadSingleFile = async (item: FileUploadItem) => {
    // Update status to uploading
    setFileItems(prev =>
      prev.map(f => f.id === item.id ? { ...f, status: 'uploading' as const, progress: 50 } : f)
    )

    try {
      const result = await uploadMutation.mutateAsync(item.file)

      // Update status to success
      setFileItems(prev =>
        prev.map(f => f.id === item.id ? {
          ...f,
          status: 'success' as const,
          progress: 100,
          result: {
            filename: result.filename,
            uploaded_at: new Date().toISOString(),
            imported_count: result.created,
            duplicate_count: result.skipped,
            error_count: 0,
            status: 'success' as const,
          },
          backendResult: result
        } : f)
      )
    } catch (error) {
      console.error('Upload failed:', error)

      // Update status to error
      setFileItems(prev =>
        prev.map(f => f.id === item.id ? {
          ...f,
          status: 'error' as const,
          progress: 0,
          error: error instanceof Error ? error.message : t('upload.alertUploadFailed')
        } : f)
      )
    }
  }

  const handleUploadAll = async () => {
    const pendingFiles = fileItems.filter(f => f.status === 'pending')

    if (pendingFiles.length === 0) return

    setUploading(true)

    // Upload files sequentially
    for (const file of pendingFiles) {
      await uploadSingleFile(file)
    }

    setUploading(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFilesSelect(files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleModeChange = (mode: UploadMode) => {
    if (mode !== uploadMode) {
      setUploadMode(mode)
      setFileItems([]) // Clear files when switching modes
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Title */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('upload.title')}</h2>
        <p className="text-gray-600">{t('upload.subtitle')}</p>
      </div>

      {/* Upload Zone */}
      <Card className="mb-8">
        {/* Tab Switcher */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => handleModeChange('csv')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              uploadMode === 'csv'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('upload.tabCSV')}
          </button>
          <button
            onClick={() => handleModeChange('paypay')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              uploadMode === 'paypay'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('upload.tabPayPay')}
          </button>
        </div>

        <UploadDropZone
          isDragOver={isDragOver}
          uploading={uploading}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onFileSelect={handleFilesSelect}
          hasFiles={fileItems.length > 0}
          acceptedTypes={acceptedTypes}
          uploadMode={uploadMode}
        />

        {/* Multiple File Upload List */}
        <MultipleFileUploadList
          files={fileItems}
          onRemoveFile={handleRemoveFile}
          onUploadAll={handleUploadAll}
          onClearAll={handleClearAll}
          uploading={uploading}
        />
      </Card>

      {/* Upload History */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('upload.history')}</h3>
        <UploadHistoryList history={history} isLoading={isLoading} />
      </Card>

      {/* FAQ Section */}
      <Card className="mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('upload.faq')}</h3>
        <UploadFAQ />
      </Card>
    </div>
  )
}
