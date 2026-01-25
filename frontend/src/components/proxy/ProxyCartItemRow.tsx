import { RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface CartItem {
  id: string
  item: string
  cost: string
  markupPrice: string
  notes: string
}

interface ProxyCartItemRowProps {
  item: CartItem
  index: number
  onUpdate: (id: string, field: keyof CartItem, value: string) => void
  onDelete: (id: string) => void
  onQuickMarkup: (id: string, percent: number) => void
  showDelete: boolean
  disabled?: boolean
  inputRef?: RefObject<HTMLInputElement>
}

// Format number with thousand separators
function formatWithCommas(value: string): string {
  const num = value.replace(/[^\d]/g, '')
  if (!num) return ''
  return parseInt(num).toLocaleString('en-US')
}

export function ProxyCartItemRow({
  item,
  index,
  onUpdate,
  onDelete,
  onQuickMarkup,
  showDelete,
  disabled,
  inputRef,
}: ProxyCartItemRowProps) {
  const { t } = useTranslation('common')

  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      {/* Mobile Layout: stacked */}
      <div className="sm:hidden space-y-3">
        {/* Row header with number and delete */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 font-medium">#{index + 1}</span>
          {showDelete && (
            <button
              onClick={() => onDelete(item.id)}
              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded min-w-[44px] min-h-[44px] flex items-center justify-center"
              disabled={disabled}
              aria-label={t('button.delete')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Item name - full width */}
        <input
          ref={inputRef}
          value={item.item}
          onChange={e => onUpdate(item.id, 'item', e.target.value)}
          placeholder={t('proxy.itemPlaceholder', 'e.g., iPhone case')}
          className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm min-h-[44px]"
          disabled={disabled}
        />

        {/* Cost and Markup - side by side */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">{t('proxy.cost')}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">¥</span>
              <input
                value={item.cost}
                onChange={e => onUpdate(item.id, 'cost', formatWithCommas(e.target.value))}
                placeholder="1,000"
                className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm min-h-[44px]"
                inputMode="numeric"
                disabled={disabled}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">{t('proxy.markupPrice')}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">¥</span>
              <input
                value={item.markupPrice}
                onChange={e => onUpdate(item.id, 'markupPrice', formatWithCommas(e.target.value))}
                placeholder="1,200"
                className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm min-h-[44px]"
                inputMode="numeric"
                disabled={disabled}
              />
            </div>
          </div>
        </div>

        {/* Quick markup buttons */}
        <div className="flex gap-2">
          {[10, 15, 20].map(pct => (
            <button
              key={pct}
              onClick={() => onQuickMarkup(item.id, pct)}
              className="flex-1 px-2 py-2 text-xs bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500 min-h-[44px]"
              disabled={disabled || !item.cost}
            >
              +{pct}%
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Layout: grid */}
      <div className="hidden sm:grid sm:grid-cols-12 sm:gap-3 sm:items-center">
        {/* Row number */}
        <div className="col-span-1 text-gray-400 text-sm text-center">{index + 1}</div>

        {/* Item description */}
        <div className="col-span-4">
          <input
            ref={inputRef}
            value={item.item}
            onChange={e => onUpdate(item.id, 'item', e.target.value)}
            placeholder={t('proxy.itemPlaceholder', 'e.g., iPhone case')}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
            disabled={disabled}
          />
        </div>

        {/* Cost (JPY) */}
        <div className="col-span-2">
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">¥</span>
            <input
              value={item.cost}
              onChange={e => onUpdate(item.id, 'cost', formatWithCommas(e.target.value))}
              placeholder="1,000"
              className="w-full pl-6 pr-2 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
              inputMode="numeric"
              disabled={disabled}
            />
          </div>
        </div>

        {/* Markup Price with buttons */}
        <div className="col-span-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">¥</span>
              <input
                value={item.markupPrice}
                onChange={e => onUpdate(item.id, 'markupPrice', formatWithCommas(e.target.value))}
                placeholder="1,200"
                className="w-full pl-6 pr-2 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                inputMode="numeric"
                disabled={disabled}
              />
            </div>
            {/* Quick markup buttons */}
            <div className="flex gap-1">
              {[10, 15, 20].map(pct => (
                <button
                  key={pct}
                  onClick={() => onQuickMarkup(item.id, pct)}
                  className={cn(
                    'px-1.5 py-1 text-xs rounded transition-colors',
                    item.cost
                      ? 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  )}
                  disabled={disabled || !item.cost}
                >
                  +{pct}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Delete button */}
        <div className="col-span-1 text-center">
          {showDelete && (
            <button
              onClick={() => onDelete(item.id)}
              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
              disabled={disabled}
              aria-label={t('button.delete')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
