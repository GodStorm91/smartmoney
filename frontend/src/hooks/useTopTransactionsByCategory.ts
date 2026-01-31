import { useQuery } from '@tanstack/react-query'
import { fetchTransactions } from '@/services/transaction-service'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { useCategoryTree } from '@/hooks/useCategories'
import { useMemo } from 'react'
import type { Transaction } from '@/types'

interface TopTransaction {
  id: number
  description: string
  amount: number
  currency: string
  date: string
  amountJpy: number
  isBig: boolean // > 25% of category budget
}

interface CategoryTopTransactions {
  category: string
  transactions: TopTransaction[]
  totalSpent: number
}

// Convert amount to JPY using exchange rates
function convertToJpy(amount: number, currency: string, rates: Record<string, number>): number {
  if (currency === 'JPY') return amount
  const rate = rates[currency]
  if (!rate || rate === 0) return amount
  return Math.round(amount / rate)
}

export function useTopTransactionsByCategory(
  categories: string[],
  month: string,
  budgetMap: Map<string, number>, // category -> budgeted amount
  limit: number = 3
) {
  const { data: exchangeRates } = useExchangeRates()
  const { data: categoryTree } = useCategoryTree()
  const rates = exchangeRates?.rates || {}

  // Build parent to children category map
  const parentToChildrenMap = useMemo(() => {
    const map = new Map<string, string[]>()
    if (!categoryTree) return map

    categoryTree.expense.forEach(parent => {
      const childNames = parent.children.map(child => child.name)
      map.set(parent.name, childNames)
    })

    categoryTree.income.forEach(parent => {
      const childNames = parent.children.map(child => child.name)
      map.set(parent.name, childNames)
    })

    return map
  }, [categoryTree])

  // Get all categories to search (each parent + all its children)
  const allCategoriesToSearch = useMemo(() => {
    const allCats = new Set<string>()
    categories.forEach(cat => {
      allCats.add(cat)
      const children = parentToChildrenMap.get(cat) || []
      children.forEach(child => allCats.add(child))
    })
    return Array.from(allCats)
  }, [categories, parentToChildrenMap])

  const query = useQuery({
    queryKey: ['top-transactions-by-category', month, categories.sort().join(',')],
    queryFn: async () => {
      if (categories.length === 0 || !month) return new Map<string, CategoryTopTransactions>()

      const [year, monthNum] = month.split('-').map(Number)
      const lastDay = new Date(year, monthNum, 0).getDate()
      const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`
      const endDate = `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

      const data = await fetchTransactions({
        categories: allCategoriesToSearch,
        start_date: startDate,
        end_date: endDate,
        type: 'expense'
      })

      // Filter out transfers
      const expenses = data.filter(tx => !tx.is_transfer && !tx.is_adjustment)

      // Group by parent category
      const categoryGroups = new Map<string, Transaction[]>()

      expenses.forEach(tx => {
        // Find which parent category this belongs to
        let parentCategory = tx.category
        for (const [parent, children] of parentToChildrenMap) {
          if (children.includes(tx.category) || parent === tx.category) {
            parentCategory = parent
            break
          }
        }

        if (!categories.includes(parentCategory)) return

        if (!categoryGroups.has(parentCategory)) {
          categoryGroups.set(parentCategory, [])
        }
        categoryGroups.get(parentCategory)!.push(tx)
      })

      // Process each category
      const result = new Map<string, CategoryTopTransactions>()

      categories.forEach(category => {
        const txs = categoryGroups.get(category) || []
        const budgeted = budgetMap.get(category) || 0

        // Convert to JPY and sort by amount
        const withJpy = txs.map(tx => ({
          id: tx.id,
          description: tx.description,
          amount: tx.amount,
          currency: tx.currency,
          date: tx.date,
          amountJpy: convertToJpy(Math.abs(tx.amount), tx.currency || 'JPY', rates),
          isBig: false // will be set below
        }))

        // Sort by JPY amount (largest first)
        withJpy.sort((a, b) => b.amountJpy - a.amountJpy)

        // Calculate total spent
        const totalSpent = withJpy.reduce((sum, tx) => sum + tx.amountJpy, 0)

        // Mark "big" transactions (> 25% of budget OR > 2x average)
        const avgAmount = withJpy.length > 0 ? totalSpent / withJpy.length : 0
        const bigThreshold = Math.max(budgeted * 0.25, avgAmount * 2)

        const topTxs = withJpy.slice(0, limit).map(tx => ({
          ...tx,
          isBig: tx.amountJpy > bigThreshold && tx.amountJpy > 5000 // Also require min ¥5000
        }))

        result.set(category, {
          category,
          transactions: topTxs,
          totalSpent
        })
      })

      return result
    },
    enabled: categories.length > 0 && !!month,
    staleTime: 30000, // 30 seconds
  })

  return query
}
