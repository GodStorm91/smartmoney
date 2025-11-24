import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface BudgetFeedbackFormProps {
  onSubmit: (feedback: string) => void
  onCancel: () => void
  isLoading: boolean
}

export function BudgetFeedbackForm({ onSubmit, onCancel, isLoading }: BudgetFeedbackFormProps) {
  const { t } = useTranslation('common')
  const [feedback, setFeedback] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (feedback.trim()) {
      onSubmit(feedback.trim())
      setFeedback('')
    }
  }

  return (
    <Card className="p-6 border-blue-200 bg-blue-50">
      <h4 className="font-semibold mb-3">{t('budget.feedbackTitle')}</h4>
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder={t('budget.feedbackPlaceholder')}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[100px]"
          disabled={isLoading}
          required
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={isLoading || !feedback.trim()}>
            {isLoading ? t('budget.regenerating') : t('budget.submitFeedback')}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </Card>
  )
}
