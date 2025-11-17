import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/Card'
import { UploadDropZone } from '@/components/upload/UploadDropZone'
import { UploadHistoryList } from '@/components/upload/UploadHistoryList'
import { UploadFAQ } from '@/components/upload/UploadFAQ'
import { uploadCSV, fetchUploadHistory } from '@/services/upload-service'

export function Upload() {
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
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

  const handleFileSelect = async (file: File) => {
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      alert('CSVファイルを選択してください')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('ファイルサイズは10MB以下にしてください')
      return
    }

    setUploading(true)
    try {
      await uploadMutation.mutateAsync(file)
    } catch (error) {
      console.error('Upload failed:', error)
      alert('アップロードに失敗しました')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
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
        <h2 className="text-3xl font-bold text-gray-900 mb-2">CSVアップロード</h2>
        <p className="text-gray-600">銀行またはアプリからエクスポートしたCSVファイルをアップロード</p>
      </div>

      {/* Upload Zone */}
      <Card className="mb-8">
        <UploadDropZone
          isDragOver={isDragOver}
          uploading={uploading}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onFileSelect={handleFileSelect}
        />
      </Card>

      {/* Upload History */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">アップロード履歴</h3>
        <UploadHistoryList history={history} isLoading={isLoading} />
      </Card>

      {/* FAQ Section */}
      <Card className="mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">よくある質問</h3>
        <UploadFAQ />
      </Card>
    </div>
  )
}
