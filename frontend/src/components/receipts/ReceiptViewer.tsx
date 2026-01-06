/**
 * Receipt Viewer - Modal for viewing receipt images
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, ZoomIn, ZoomOut, Download, Receipt } from 'lucide-react'
import { getReceiptUrl } from '@/services/receipt-service'

interface ReceiptViewerProps {
  receiptUrl: string | null | undefined
  onClose: () => void
}

export function ReceiptViewer({ receiptUrl, onClose }: ReceiptViewerProps) {
  const { t } = useTranslation()
  const [zoom, setZoom] = useState(1)
  const url = getReceiptUrl(receiptUrl)

  if (!url) return null

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3))
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5))

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = url
    link.download = `receipt-${Date.now()}.jpg`
    link.click()
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex flex-col"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50">
        <h2 className="text-white font-medium flex items-center gap-2">
          <Receipt size={20} />
          {t('receipt.viewReceipt', 'View Receipt')}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
            aria-label={t('common.zoomOut', 'Zoom out')}
          >
            <ZoomOut size={20} />
          </button>
          <span className="text-white text-sm w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
            aria-label={t('common.zoomIn', 'Zoom in')}
          >
            <ZoomIn size={20} />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white ml-2"
            aria-label={t('common.download', 'Download')}
          >
            <Download size={20} />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white ml-2"
            aria-label={t('common.close', 'Close')}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Image */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        <img
          src={url}
          alt="Receipt"
          className="max-w-full max-h-full object-contain transition-transform duration-200"
          style={{ transform: `scale(${zoom})` }}
        />
      </div>
    </div>
  )
}

interface ReceiptThumbnailProps {
  receiptUrl: string | null | undefined
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Small thumbnail preview of receipt
 */
export function ReceiptThumbnail({ receiptUrl, onClick, size = 'md' }: ReceiptThumbnailProps) {
  const { t } = useTranslation()
  const url = getReceiptUrl(receiptUrl)

  if (!url) return null

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }

  return (
    <button
      onClick={onClick}
      className={`${sizeClasses[size]} rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors`}
      aria-label={t('receipt.viewReceipt', 'View Receipt')}
    >
      <img
        src={url}
        alt="Receipt thumbnail"
        className="w-full h-full object-cover"
      />
    </button>
  )
}
