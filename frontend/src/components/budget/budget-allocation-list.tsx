import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { formatCurrency } from '@/utils/formatCurrency'
import type { BudgetAllocation } from '@/types'

interface BudgetAllocationListProps {
  allocations: BudgetAllocation[]
  totalBudget: number
  onAllocationChange?: (updatedAllocations: BudgetAllocation[]) => void
}

export function BudgetAllocationList({
  allocations,
  totalBudget,
  onAllocationChange
}: BudgetAllocationListProps) {
  const { t } = useTranslation('common')

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">{t('budget.allocations')}</h3>
      {onAllocationChange && (
        <p className="text-sm text-gray-600 mb-4">{t('budget.swipeToEdit')}</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allocations.map((allocation, index) => (
          <AllocationCard
            key={index}
            allocation={allocation}
            totalBudget={totalBudget}
            editable={!!onAllocationChange}
            onAmountChange={(newAmount) => {
              if (onAllocationChange) {
                const updated = [...allocations]
                updated[index] = { ...allocation, amount: newAmount }
                onAllocationChange(updated)
              }
            }}
          />
        ))}
      </div>
    </div>
  )
}

interface AllocationCardProps {
  allocation: BudgetAllocation
  totalBudget: number
  editable: boolean
  onAmountChange: (newAmount: number) => void
}

function AllocationCard({
  allocation,
  totalBudget,
  editable,
  onAmountChange
}: AllocationCardProps) {
  const { t } = useTranslation('common')
  const [isDragging, setIsDragging] = useState(false)
  const startX = useRef<number>(0)
  const initialAmount = useRef<number>(allocation.amount)

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!editable) return
    e.preventDefault()
    setIsDragging(true)
    startX.current = e.touches[0].clientX
    initialAmount.current = allocation.amount
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!editable || !isDragging) return
    e.preventDefault()
    const currentX = e.touches[0].clientX
    const deltaX = currentX - startX.current

    // Improved sensitivity: 200px swipe = 50% change (more responsive)
    const percentChange = deltaX / 400
    const amountChange = initialAmount.current * percentChange
    const newAmount = Math.max(0, Math.round(initialAmount.current + amountChange))

    onAmountChange(newAmount)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!editable) return
    e.preventDefault()
    setIsDragging(false)
  }

  // Mouse handlers for desktop testing
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!editable) return
    e.preventDefault()
    setIsDragging(true)
    startX.current = e.clientX
    initialAmount.current = allocation.amount
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!editable || !isDragging) return
    e.preventDefault()
    const currentX = e.clientX
    const deltaX = currentX - startX.current

    // Same sensitivity as touch
    const percentChange = deltaX / 400
    const amountChange = initialAmount.current * percentChange
    const newAmount = Math.max(0, Math.round(initialAmount.current + amountChange))

    onAmountChange(newAmount)
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!editable) return
    e.preventDefault()
    setIsDragging(false)
  }

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false)
    }
  }

  const percentage = totalBudget > 0 ? (allocation.amount / totalBudget) * 100 : 0

  return (
    <div
      className={editable ? 'cursor-grab active:cursor-grabbing touch-none select-none' : ''}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <Card
        className={`p-4 transition-all ${isDragging ? 'ring-2 ring-blue-400 shadow-lg scale-[1.02]' : ''}`}
      >
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-semibold">{allocation.category}</h4>
          <p className={`text-lg font-bold ${isDragging ? 'text-blue-600 scale-110' : 'text-blue-600'} transition-all`}>
            {formatCurrency(allocation.amount)}
          </p>
        </div>
        {allocation.reasoning && (
          <p className="text-sm text-gray-600">{allocation.reasoning}</p>
        )}
        <div className="mt-2">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${isDragging ? 'bg-blue-600' : 'bg-blue-500'}`}
              style={{
                width: `${Math.min(percentage, 100)}%`,
              }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {percentage.toFixed(1)}% {t('budget.ofTotal')}
          </p>
        </div>
        {editable && isDragging && (
          <p className="text-xs text-blue-600 mt-2 font-medium animate-pulse">
            ← {t('budget.swipeLeft')} / {t('budget.swipeRight')} →
          </p>
        )}
      </Card>
    </div>
  )
}
