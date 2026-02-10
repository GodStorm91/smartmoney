import { useTranslation } from 'react-i18next'
import { Receipt, Camera, X } from 'lucide-react'

interface TransactionReceiptSectionProps {
  onScanClick: () => void
  receiptPreview: string | null
  onReceiptSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveReceipt: () => void
  fileInputRef: React.RefObject<HTMLInputElement>
}

export function TransactionReceiptSection({
  onScanClick,
  receiptPreview,
  onReceiptSelect,
  onRemoveReceipt,
  fileInputRef,
}: TransactionReceiptSectionProps) {
  const { t } = useTranslation('common')

  return (
    <div className="space-y-3">
      {/* Scan Receipt Button (OCR) */}
      <button
        type="button"
        onClick={onScanClick}
        className="w-full h-12 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
      >
        <Receipt size={20} />
        {t('receipt.scanReceipt', 'Scan Receipt')}
      </button>

      {/* Attach Receipt (just image storage) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onReceiptSelect}
        className="hidden"
      />

      {receiptPreview ? (
        <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <img
            src={receiptPreview}
            alt="Receipt preview"
            className="w-full h-24 object-cover"
          />
          <button
            type="button"
            onClick={onRemoveReceipt}
            className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-12 flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 text-gray-500 dark:text-gray-400 rounded-lg font-medium transition-colors"
        >
          <Camera size={20} />
          {t('receipt.attachReceipt', 'Attach Receipt Photo')}
        </button>
      )}
    </div>
  )
}
