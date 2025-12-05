/**
 * Receipt Scanner Modal - Main modal for scanning receipts
 */
import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, X, AlertCircle, Check } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { CameraCapture } from './CameraCapture'
import { ImageDropZone } from './ImageDropZone'
import { scanReceipt, ReceiptData } from '@/services/receipt-service'

interface ReceiptScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onScanComplete: (data: ReceiptData) => void
}

type Mode = 'select' | 'camera' | 'preview'

export function ReceiptScannerModal({
  isOpen,
  onClose,
  onScanComplete,
}: ReceiptScannerModalProps) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>('select')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)

  const scanMutation = useMutation({
    mutationFn: scanReceipt,
    onSuccess: (response) => {
      onScanComplete(response.data)
      handleClose()
    },
  })

  const handleClose = useCallback(() => {
    setMode('select')
    setCapturedImage(null)
    scanMutation.reset()
    onClose()
  }, [onClose, scanMutation])

  const handleImageCapture = useCallback((imageData: string) => {
    setCapturedImage(imageData)
    setMode('preview')
  }, [])

  const handleConfirmImage = useCallback(() => {
    if (capturedImage) {
      scanMutation.mutate({ image: capturedImage })
    }
  }, [capturedImage, scanMutation])

  const handleRetake = useCallback(() => {
    setCapturedImage(null)
    setMode('select')
  }, [])

  if (!isOpen) return null

  // Camera mode - fullscreen
  if (mode === 'camera') {
    return (
      <CameraCapture
        onCapture={handleImageCapture}
        onCancel={() => setMode('select')}
      />
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('receipt.scanReceipt', 'Scan Receipt')}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label={t('common.close', 'Close')}
          >
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {mode === 'select' && (
            <div className="space-y-4">
              {/* Camera button (primarily for mobile) */}
              <button
                onClick={() => setMode('camera')}
                className="w-full h-14 flex items-center justify-center gap-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                <Camera size={24} />
                {t('receipt.takePhoto', 'Take Photo')}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t('common.or', 'or')}
                </span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </div>

              {/* Drop zone (primarily for desktop) */}
              <ImageDropZone onImageSelect={handleImageCapture} />
            </div>
          )}

          {mode === 'preview' && capturedImage && (
            <div className="space-y-4">
              {/* Image preview */}
              <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                <img
                  src={capturedImage}
                  alt="Receipt preview"
                  className="w-full max-h-64 object-contain"
                />
              </div>

              {/* Scanning status */}
              {scanMutation.isPending && (
                <div className="flex items-center justify-center gap-3 py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('receipt.analyzing', 'Analyzing receipt with AI...')}
                  </span>
                </div>
              )}

              {/* Error */}
              {scanMutation.isError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
                  <AlertCircle size={20} />
                  <span>
                    {t('receipt.scanError', 'Failed to scan receipt. Please try again.')}
                  </span>
                </div>
              )}

              {/* Actions */}
              {!scanMutation.isPending && (
                <div className="flex gap-3">
                  <button
                    onClick={handleRetake}
                    className="flex-1 h-12 flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {t('receipt.retake', 'Retake')}
                  </button>
                  <button
                    onClick={handleConfirmImage}
                    disabled={scanMutation.isPending}
                    className="flex-1 h-12 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    <Check size={20} />
                    {t('receipt.scan', 'Scan')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
