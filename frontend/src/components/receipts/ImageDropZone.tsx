/**
 * Image Drop Zone - Drag-drop and file upload for receipts
 */
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload } from 'lucide-react'
import { cn } from '@/utils/cn'
import { processImage } from '@/utils/image-utils'

interface ImageDropZoneProps {
  onImageSelect: (imageData: string) => void
  className?: string
}

export function ImageDropZone({ onImageSelect, className }: ImageDropZoneProps) {
  const { t } = useTranslation()
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        alert(t('receipt.invalidFile', 'Please select an image file'))
        return
      }

      setIsProcessing(true)
      try {
        const imageData = await processImage(file)
        onImageSelect(imageData)
      } catch {
        alert(t('receipt.processError', 'Failed to process image'))
      } finally {
        setIsProcessing(false)
      }
    },
    [onImageSelect, t]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
        isDragging
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500',
        isProcessing && 'opacity-50 pointer-events-none',
        className
      )}
    >
      <input
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
        id="receipt-file-input"
      />
      <label htmlFor="receipt-file-input" className="cursor-pointer">
        <div className="flex flex-col items-center gap-3">
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
              <p className="text-gray-600 dark:text-gray-400">
                {t('receipt.processing', 'Processing...')}
              </p>
            </>
          ) : (
            <>
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
                <Upload size={24} className="text-gray-500 dark:text-gray-400" />
              </div>
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-300">
                  {t('receipt.dropOrClick', 'Drop image here or click to upload')}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {t('receipt.supportedFormats', 'JPG, PNG, HEIC supported')}
                </p>
              </div>
            </>
          )}
        </div>
      </label>
    </div>
  )
}
