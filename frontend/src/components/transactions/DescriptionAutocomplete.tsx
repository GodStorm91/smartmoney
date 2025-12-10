/**
 * DescriptionAutocomplete - Autocomplete input for transaction descriptions
 *
 * Features:
 * - Debounced search (300ms)
 * - Shows suggestions from recent transactions
 * - Click suggestion → fills description, amount, category
 * - ESC or blur → closes dropdown
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/utils/cn'
import {
  fetchTransactionSuggestions,
  type TransactionSuggestion,
} from '@/services/transaction-service'

interface DescriptionAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSuggestionSelect?: (suggestion: TransactionSuggestion) => void
  placeholder?: string
  className?: string
  error?: boolean
}

export function DescriptionAutocomplete({
  value,
  onChange,
  onSuggestionSelect,
  placeholder,
  className,
  error,
}: DescriptionAutocompleteProps) {
  const { t } = useTranslation('common')
  const [isOpen, setIsOpen] = useState(false)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(value)
    }, 300)

    return () => clearTimeout(timer)
  }, [value])

  // Fetch suggestions
  const { data: suggestions = [] } = useQuery({
    queryKey: ['transaction-suggestions', debouncedQuery],
    queryFn: () => fetchTransactionSuggestions(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30000, // Cache for 30 seconds
  })

  // Open dropdown when we have suggestions
  useEffect(() => {
    setIsOpen(suggestions.length > 0 && value.length >= 2)
  }, [suggestions, value])

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        inputRef.current?.blur()
      }
    },
    []
  )

  // Handle suggestion selection
  const handleSelect = (suggestion: TransactionSuggestion) => {
    onChange(suggestion.description)
    setIsOpen(false)
    onSuggestionSelect?.(suggestion)
  }

  // Format amount for display
  const formatAmount = (amount: number) => {
    return Math.abs(amount).toLocaleString()
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setIsOpen(true)}
        placeholder={placeholder}
        className={cn(
          'w-full h-12 px-4 border rounded-lg text-base',
          'dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400',
          error ? 'border-red-500' : 'border-gray-300',
          className
        )}
      />

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          className={cn(
            'absolute top-full left-0 right-0 z-50 mt-1',
            'bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700',
            'max-h-60 overflow-y-auto'
          )}
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.description}-${index}`}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className={cn(
                'w-full px-4 py-3 flex items-center justify-between text-left',
                'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
                'border-b border-gray-100 dark:border-gray-700 last:border-0'
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {suggestion.description}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <span className="truncate">{suggestion.category}</span>
                  <span className="text-gray-300 dark:text-gray-600">•</span>
                  <span className="text-gray-400">
                    {suggestion.count}x {t('autocomplete.used', 'used')}
                  </span>
                </div>
              </div>
              <div className="ml-4 text-right shrink-0">
                <div
                  className={cn(
                    'font-medium font-numbers',
                    suggestion.is_income ? 'text-green-600' : 'text-gray-900 dark:text-gray-100'
                  )}
                >
                  ¥{formatAmount(suggestion.amount)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
