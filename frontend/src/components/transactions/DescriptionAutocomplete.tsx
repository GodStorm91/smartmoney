/**
 * DescriptionAutocomplete - Autocomplete input for transaction descriptions
 *
 * Features:
 * - Debounced search (300ms)
 * - IME composition handling (Japanese/Chinese input)
 * - Keyboard navigation (ArrowUp/Down, Enter, Escape)
 * - ARIA combobox pattern for accessibility
 * - Shows suggestions from recent transactions + keyword rules
 * - Click/Enter suggestion → fills description, amount, category
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/utils/cn'
import { useCompositionHandler } from '@/hooks/useCompositionHandler'
import {
  fetchTransactionSuggestions,
  type TransactionSuggestion,
  type AutoCategory,
} from '@/services/transaction-service'

interface DescriptionAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSuggestionSelect?: (suggestion: TransactionSuggestion) => void
  onAutoCategory?: (autoCategory: AutoCategory) => void
  placeholder?: string
  className?: string
  error?: boolean
  currencySymbol?: string
}

export function DescriptionAutocomplete({
  value,
  onChange,
  onSuggestionSelect,
  onAutoCategory,
  placeholder,
  className,
  error,
  currencySymbol = '¥',
}: DescriptionAutocompleteProps) {
  const { t } = useTranslation('common')
  const [isOpen, setIsOpen] = useState(false)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const lastAutoCatRef = useRef<string>('')
  const { isComposing, handleCompositionStart, handleCompositionEnd } =
    useCompositionHandler()

  // Debounce the search query — skip during IME composition
  useEffect(() => {
    if (isComposing) return
    const timer = setTimeout(() => {
      setDebouncedQuery(value)
    }, 300)
    return () => clearTimeout(timer)
  }, [value, isComposing])

  // Fetch suggestions (now returns {suggestions, auto_category})
  const { data: suggestionResponse, isFetching } = useQuery({
    queryKey: ['transaction-suggestions', debouncedQuery],
    queryFn: () => fetchTransactionSuggestions(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30000,
  })

  const suggestions = suggestionResponse?.suggestions ?? []

  // Fire onAutoCategory when we get a high-confidence auto_category — once per description
  useEffect(() => {
    const ac = suggestionResponse?.auto_category
    if (ac && ac.confidence >= 0.7 && onAutoCategory && debouncedQuery !== lastAutoCatRef.current) {
      lastAutoCatRef.current = debouncedQuery
      onAutoCategory(ac)
    }
  }, [suggestionResponse, debouncedQuery, onAutoCategory])

  // Open dropdown when we have suggestions
  useEffect(() => {
    setIsOpen(suggestions.length > 0 && value.length >= 2)
    setActiveIndex(-1)
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

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current && activeIndex >= 0) {
      const el = listRef.current.children[activeIndex] as HTMLElement
      if (el) el.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex, isOpen])

  // Handle suggestion selection
  const handleSelect = useCallback((suggestion: TransactionSuggestion) => {
    onChange(suggestion.description)
    setIsOpen(false)
    setActiveIndex(-1)
    onSuggestionSelect?.(suggestion)
  }, [onChange, onSuggestionSelect])

  // Handle IME composition end — trigger debounce with final value
  const handleCompositionEndEvent = (e: React.CompositionEvent<HTMLInputElement>) => {
    handleCompositionEnd()
    const finalValue = (e.target as HTMLInputElement).value
    setDebouncedQuery(finalValue)
  }

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isOpen) {
          // First Escape: close dropdown
          e.preventDefault()
          setIsOpen(false)
          setActiveIndex(-1)
        } else {
          // Second Escape: blur input
          inputRef.current?.blur()
        }
      } else if (e.key === 'ArrowDown' && isOpen && suggestions.length > 0) {
        e.preventDefault()
        setActiveIndex((prev) => (prev + 1) % suggestions.length)
      } else if (e.key === 'ArrowUp' && isOpen && suggestions.length > 0) {
        e.preventDefault()
        setActiveIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1))
      } else if (e.key === 'Enter' && activeIndex >= 0 && suggestions[activeIndex]) {
        e.preventDefault()
        handleSelect(suggestions[activeIndex])
      }
    },
    [isOpen, suggestions, activeIndex, handleSelect]
  )

  // Format amount for display
  const formatAmount = (amount: number) => {
    return Math.abs(amount).toLocaleString()
  }

  const showEmptyState = !isFetching && value.length >= 2 && debouncedQuery.length >= 2 && suggestions.length === 0

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setIsOpen(true)}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEndEvent}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls="desc-suggestions"
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
        autoComplete="off"
        className={cn(
          'w-full h-12 px-4 border rounded-lg text-base',
          'bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
          'hover:border-gray-400 dark:hover:border-gray-500',
          'transition-colors',
          error ? 'border-expense-600' : 'border-gray-300',
          className
        )}
      />

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          id="desc-suggestions"
          ref={listRef}
          role="listbox"
          aria-label={t('autocomplete.suggestions', 'Suggestions')}
          className={cn(
            'absolute top-full left-0 right-0 z-50 mt-1',
            'bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700',
            'max-h-60 overflow-y-auto animate-slide-down'
          )}
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.description}-${index}`}
              id={`suggestion-${index}`}
              type="button"
              role="option"
              aria-selected={activeIndex === index}
              onClick={() => handleSelect(suggestion)}
              onMouseEnter={() => setActiveIndex(index)}
              className={cn(
                'w-full px-4 py-3 flex items-center justify-between text-left',
                'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
                'first:rounded-t-lg last:rounded-b-lg',
                'border-b border-gray-100 dark:border-gray-700 last:border-0',
                activeIndex === index && 'bg-primary-50 dark:bg-primary-900/30'
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {suggestion.description}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <span className="truncate">{suggestion.category}</span>
                  {suggestion.count > 0 ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400">
                      <span className="w-1 h-1 rounded-full bg-income-500 shrink-0" />
                      {suggestion.count}x
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-primary-500">
                      <span className="w-1 h-1 rounded-full bg-primary-500 shrink-0" />
                      {t('transaction.ruleBased', 'rule')}
                    </span>
                  )}
                </div>
              </div>
              {suggestion.amount > 0 && (
                <div className="ml-4 text-right shrink-0">
                  <div
                    className={cn(
                      'font-medium font-numbers',
                      suggestion.is_income
                        ? 'text-income-600 dark:text-income-300'
                        : 'text-expense-600 dark:text-expense-300'
                    )}
                  >
                    {currencySymbol}{formatAmount(suggestion.amount)}
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {showEmptyState && (
        <div className={cn(
          'absolute top-full left-0 right-0 z-50 mt-1',
          'bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700',
          'px-4 py-3 text-sm text-gray-400 dark:text-gray-500 animate-slide-down'
        )}>
          {t('autocomplete.noMatches', 'No matches found')}
        </div>
      )}
    </div>
  )
}
