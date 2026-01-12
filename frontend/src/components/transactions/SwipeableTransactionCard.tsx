import { useState, useRef, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/utils/formatDate'
import { formatCurrencySignedPrivacy } from '@/utils/formatCurrency'
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
  const { isPrivacyMode } = usePrivacy()
  const rates = useRatesMap()

  const [translateX, setTranslateX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  const DELETE_BUTTON_WIDTH = 80
  const SWIPE_THRESHOLD = 40
  const LONG_PRESS_DURATION = 500

  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLongPress = useRef(false)
  const startY = useRef(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX)
    startY.current = e.touches[0].clientY
    setIsDragging(true)

    isLongPress.current = false
    pressTimer.current = setTimeout(() => {
      isLongPress.current = true
      setShowContextMenu(true)
    }, LONG_PRESS_DURATION)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return

    const currentX = e.touches[0].clientX
    const currentY = e.touches[0].clientY
    const diffY = Math.abs(currentY - startY.current)

    if (isLongPress.current) {
      return
    }

    if (diffY > 10) {
      cancelPress()
      return
    }

    const diff = startX - currentX

    if (diff > 0) {
      setTranslateX(Math.min(diff, DELETE_BUTTON_WIDTH))
    } else {
      setTranslateX(Math.max(diff, -20))
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)

    if (isLongPress.current) {
      setTranslateX(0)
      return
    }

    cancelPress()

    if (translateX > SWIPE_THRESHOLD) {
      setTranslateX(DELETE_BUTTON_WIDTH)
    } else {
      setTranslateX(0)
    }
  }

  const cancelPress = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
    isLongPress.current = false
  }, [])

  const handleCardClick = () => {
    if (isLongPress.current) {
      setShowContextMenu(false)
      return
    }

    if (translateX > 0) {
      setTranslateX(0)
    } else {
      onEdit(transaction)
    }
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(transaction)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setShowContextMenu(true)
  }

  const closeContextMenu = useCallback(() => {
    setShowContextMenu(false)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        closeContextMenu()
      }
    }

    if (showContextMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showContextMenu, closeContextMenu])

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
      {showContextMenu && (
        <div className="fixed inset-0 z-40" onClick={closeContextMenu}>
            <div
            ref={contextMenuRef}
            className="absolute bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 select-none"
            style={{
              left: '50%',
              bottom: '20px',
              transform: 'translateX(-50%)',
              maxWidth: '280px',
              width: 'calc(100% - 32px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-2">
              <button
                onClick={() => {
                  onEdit(transaction)
                  closeContextMenu()
                }}
                className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-600 dark:text-blue-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                </svg>
                <span className="text-gray-900 dark:text-gray-100">Edit</span>
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${transaction.description}: ${formatCurrencySignedPrivacy(transaction.amount, transaction.type, transaction.currency || 'JPY', rates, false, false)}`)
                  closeContextMenu()
                }}
                className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-600 dark:text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
                <span className="text-gray-900 dark:text-gray-100">Copy</span>
              </button>
              <div className="my-2 border-t border-gray-200 dark:border-gray-700" />
              <button
                onClick={() => {
                  onDelete(transaction)
                  closeContextMenu()
                }}
                className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-red-600 dark:text-red-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                <span className="text-red-600 dark:text-red-400">Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
        onTouchCancel={cancelPress}
        onClick={handleCardClick}
        onContextMenu={handleContextMenu}
      >
        <Card className="cursor-pointer active:scale-[0.98] transition-transform">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-50">{transaction.description}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(transaction.date)}</p>
            </div>
            <p
              className={`text-lg font-bold font-numbers ${
                transaction.is_transfer
                  ? 'text-blue-500 dark:text-blue-400'
                  : transaction.type === 'income'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
              }`}
            >
              {formatCurrencySignedPrivacy(
                transaction.amount,
                transaction.type,
                transaction.currency || 'JPY',
                rates,
                true,
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
