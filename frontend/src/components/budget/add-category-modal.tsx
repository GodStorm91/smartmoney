import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Plus } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useCategoryTree } from '@/hooks/useCategories'
import { formatCurrency } from '@/utils/formatCurrency'
import type { Budget } from '@/types'

interface AddCategoryModalProps {
  budget: Budget
  onClose: () => void
  onAdd: (category: string, amount: number) => void
}

export function AddCategoryModal({ budget, onClose, onAdd }: AddCategoryModalProps) {
  const { t } = useTranslation('common')
  const { data: categoryTree } = useCategoryTree()
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [customCategory, setCustomCategory] = useState<string>('')
  const [amount, setAmount] = useState<string>('')

  const availableCategories = useMemo(() => {
    if (!categoryTree) return []
    const existingCategories = new Set(budget.allocations.map(a => a.category))
    const allCategories: string[] = []

    categoryTree.expense.forEach(parent => {
      if (!existingCategories.has(parent.name)) {
        allCategories.push(parent.name)
      }
      parent.children.forEach(child => {
        if (!existingCategories.has(child.name)) {
          allCategories.push(child.name)
        }
      })
    })

    return allCategories.sort()
  }, [categoryTree, budget.allocations])

  const remainingBudget = useMemo(() => {
    const totalAllocated = budget.allocations.reduce((sum, a) => sum + a.amount, 0)
    return budget.monthly_income - (budget.savings_target || 0) - totalAllocated
  }, [budget])

  const isCustom = selectedCategory === '__custom__'
  const categoryName = isCustom ? customCategory : selectedCategory
  const isValid = categoryName.trim().length > 0 && parseInt(amount) > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    onAdd(categoryName, parseInt(amount))
  }

  const suggestedAmount = Math.floor(remainingBudget / (availableCategories.length + 1))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold">{t('budget.addCategory')}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('budget.category')}
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                if (e.target.value !== '__custom__') {
                  setCustomCategory('')
                }
              }}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="">{t('budget.selectCategory')}</option>
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
              <option value="__custom__">{t('budget.customCategory')}</option>
            </select>
          </div>

          {isCustom && (
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('budget.categoryName')}
              </label>
              <Input
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder={t('budget.categoryPlaceholder')}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('budget.amount')}
            </label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={formatCurrency(0)}
              min={1}
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('budget.remainingBudget')}: {formatCurrency(remainingBudget)}
            </p>
          </div>

          {suggestedAmount > 0 && (
            <button
              type="button"
              onClick={() => setAmount(String(suggestedAmount))}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {t('budget.suggestAmount', { amount: formatCurrency(suggestedAmount) })}
            </button>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={!isValid} className="flex-1">
              <Plus className="w-4 h-4 mr-1" />
              {t('budget.add')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
