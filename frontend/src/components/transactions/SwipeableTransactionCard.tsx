import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/utils/formatDate'
import { formatCurrencySignedPrivacy } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useRatesMap } from '@/hooks/useExchangeRates'
import type { Transaction } from '@/types'

interface SwipeableTransactionCardProps {
  transaction: Transaction
  onEdit: (transaction: Transaction) => void
  onDelete: (transaction: Transaction) => void
}

export function SwipeableTransactionCard({
  transaction,
  onEdit,
  onDelete,
}: SwipeableTransactionCardProps) {
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const rates = useRatesMap()

  const [translateX, setTranslateX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const cardRef = useRef<HTMLDivElement>(null)

  const DELETE_BUTTON_WIDTH = 80 // Width of delete button in px
  const SWIPE_THRESHOLD = 40 // Minimum swipe distance to trigger delete button

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX)
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return

    const currentX = e.touches[0].clientX
    const diff = startX - currentX

    // Only allow left swipe (positive diff)
    if (diff > 0) {
      // Limit to delete button width
      setTranslateX(Math.min(diff, DELETE_BUTTON_WIDTH))
    } else {
      // Allow slight right swipe to close
      setTranslateX(Math.max(diff, -20))
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)

    // Snap to delete button or reset
    if (translateX > SWIPE_THRESHOLD) {
      setTranslateX(DELETE_BUTTON_WIDTH)
    } else {
      setTranslateX(0)
    }
  }

  const handleCardClick = () => {
    // If delete button is visible, close it
    if (translateX > 0) {
      setTranslateX(0)
    } else {
      // Otherwise open edit modal
      onEdit(transaction)
    }
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(transaction)
  }

  // Close swipe on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setTranslateX(0)
      }
    }

    if (translateX > 0) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [translateX])

  return (
    <div ref={cardRef} className="relative overflow-hidden">
      {/* Delete Button Background */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-600"
        style={{ width: `${DELETE_BUTTON_WIDTH}px` }}
      >
        <button
          onClick={handleDeleteClick}
          className="h-full w-full flex flex-col items-center justify-center text-white transition-opacity"
          style={{ opacity: translateX > 0 ? 1 : 0 }}
          aria-label="Delete transaction"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6 mb-1"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
            />
          </svg>
          <span className="text-xs font-medium">削除</span>
        </button>
      </div>

      {/* Swipeable Card */}
      <div
        className="relative"
        style={{
          transform: `translateX(-${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 250ms ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleCardClick}
      >
        <Card className="cursor-pointer active:scale-[0.98] transition-transform">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-50">{transaction.description}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(transaction.date)}</p>
            </div>
            <p
              className={`text-lg font-bold font-numbers ${
                transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}
            >
              {formatCurrencySignedPrivacy(
                transaction.amount,
                transaction.type,
                currency,
                rates,
                false,
                isPrivacyMode
              )}
            </p>
          </div>
          <div className="flex gap-2 text-xs">
            <Badge>{transaction.category}</Badge>
            <span className="text-gray-600 dark:text-gray-400">{transaction.source}</span>
          </div>
        </Card>
      </div>
    </div>
  )
}
