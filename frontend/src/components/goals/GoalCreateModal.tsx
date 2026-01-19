import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createGoal, updateGoal, fetchGoal } from '@/services/goal-service'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StartDateSelector } from './StartDateSelector'
import {
  validateGoalForm,
  calculateStartDate,
  formatAmountInput,
  type StartDateOption,
  type GoalFormErrors,
} from './goal-form-helpers'

interface GoalCreateModalProps {
  isOpen: boolean
  onClose: () => void
  preselectedYears?: number
  editingGoalId?: number | null
}

export function GoalCreateModal({
  isOpen,
  onClose,
  preselectedYears,
  editingGoalId,
}: GoalCreateModalProps) {
  const queryClient = useQueryClient()

  // Form state
  const [years, setYears] = useState<number>(preselectedYears || 1)
  const [targetAmount, setTargetAmount] = useState<string>('')
  const [startDateOption, setStartDateOption] = useState<StartDateOption>('today')
  const [customDate, setCustomDate] = useState<string>('')
  const [errors, setErrors] = useState<GoalFormErrors>({})
  const [serverError, setServerError] = useState<string>('')

  // Fetch existing goal if editing
  const { data: existingGoal } = useQuery({
    queryKey: ['goal', editingGoalId],
    queryFn: () => fetchGoal(editingGoalId!),
    enabled: !!editingGoalId && isOpen,
  })

  // Reset form when modal opens/closes or preselectedYears changes
  useEffect(() => {
    if (isOpen) {
      if (editingGoalId && existingGoal) {
        // Pre-fill form with existing data
        setYears(existingGoal.years)
        setTargetAmount(existingGoal.target_amount.toString())
        if (existingGoal.start_date) {
          setStartDateOption('custom')
          setCustomDate(existingGoal.start_date)
        } else {
          setStartDateOption('today')
          setCustomDate('')
        }
      } else {
        // Reset form for new goal
        setYears(preselectedYears || 1)
        setTargetAmount('')
        setStartDateOption('today')
        setCustomDate('')
      }
      setErrors({})
      setServerError('')
    }
  }, [isOpen, preselectedYears, editingGoalId, existingGoal])

  // Create/Update goal mutation
  const goalMutation = useMutation({
    mutationFn: editingGoalId
      ? (data: any) => updateGoal(editingGoalId, data)
      : createGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['goals-progress-full'] })
      onClose()
    },
    onError: () => {
      setServerError(
        editingGoalId
          ? '目標の更新に失敗しました。もう一度お試しください。'
          : '目標の作成に失敗しました。もう一度お試しください。'
      )
    },
  })

  // Handle submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    const validationErrors = validateGoalForm(
      years,
      targetAmount,
      startDateOption,
      customDate,
      preselectedYears
    )

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    // Prepare data
    const amount = parseInt(targetAmount.replace(/,/g, ''), 10)
    const startDate = calculateStartDate(startDateOption, customDate)

    // Submit
    goalMutation.mutate({
      name: `${years}年貯蓄目標`,
      target_amount: amount,
      years,
      start_date: startDate,
      end_date: '', // Backend calculates this
    })
  }

  // Handle amount input with formatting
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatAmountInput(e.target.value)
    setTargetAmount(formatted)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 id="modal-title" className="text-xl font-bold text-gray-900">
            {editingGoalId
              ? '目標を編集'
              : preselectedYears
              ? `${preselectedYears}年目標を作成`
              : '新しい目標を作成'}
          </h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Years input (only if not preselected) */}
          {!preselectedYears && (
            <Input
              label="期間（年）"
              type="number"
              min={1}
              max={10}
              value={years}
              onChange={(e) => setYears(parseInt(e.target.value, 10))}
              error={errors.years}
              placeholder="1〜10"
              aria-label="目標期間を年単位で入力"
              required
            />
          )}

          {/* Target amount input */}
          <div>
            <Input
              label="目標金額"
              type="text"
              value={targetAmount}
              onChange={handleAmountChange}
              error={errors.targetAmount}
              placeholder="例: 1,000,000"
              aria-label="目標金額を入力"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              最小額: ¥10,000 / 刻み: ¥10,000
            </p>
          </div>

          {/* Start date selector */}
          <StartDateSelector
            selectedOption={startDateOption}
            customDate={customDate}
            customDateError={errors.customDate}
            onOptionChange={setStartDateOption}
            onCustomDateChange={setCustomDate}
          />

          {/* Server error display */}
          {serverError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg" role="alert">
              <p className="text-sm text-red-800">{serverError}</p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} disabled={goalMutation.isPending}>
            キャンセル
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={goalMutation.isPending}
          >
            {goalMutation.isPending
              ? editingGoalId
                ? '更新中...'
                : '作成中...'
              : editingGoalId
              ? '更新'
              : '作成'}
          </Button>
        </div>
      </div>
    </div>
  )
}
