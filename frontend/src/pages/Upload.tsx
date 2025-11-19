import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { UploadDropZone } from '@/components/upload/UploadDropZone'
import { UploadHistoryList } from '@/components/upload/UploadHistoryList'
import { UploadFAQ } from '@/components/upload/UploadFAQ'
import { MultipleFileUploadList } from '@/components/upload/MultipleFileUploadList'
import { uploadCSV, fetchUploadHistory } from '@/services/upload-service'
import type { FileUploadItem } from '@/types'

export function Upload() {
  const { t } = useTranslation('common')
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fileItems, setFileItems] = useState<FileUploadItem[]>([])
  const queryClient = useQueryClient()

  const { data: history, isLoading } = useQuery({
    queryKey: ['upload-history'],
    queryFn: fetchUploadHistory,
  })

  const uploadMutation = useMutation({
    mutationFn: uploadCSV,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upload-history'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
    },
  })

  const handleFilesSelect = (files: FileList) => {
    const newFiles: FileUploadItem[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      // Validate file
      if (!file.name.endsWith('.csv')) {
        alert(t('upload.alertSelectCSV', { filename: file.name }))
        continue
      }

      if (file.size > 50 * 1024 * 1024) {
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Title */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('upload.title')}</h2>
        <p className="text-gray-600">{t('upload.subtitle')}</p>
      </div>

      {/* Upload Zone */}
      <Card className="mb-8">
        <UploadDropZone
          isDragOver={isDragOver}
          uploading={uploading}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onFileSelect={handleFilesSelect}
          hasFiles={fileItems.length > 0}
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
