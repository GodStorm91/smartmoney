import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Check, Upload, Wallet, Target, Sparkles, ChevronRight, X } from 'lucide-react'
import { fetchAccounts } from '@/services/account-service'
import { fetchTransactions } from '@/services/transaction-service'
import { fetchGoals } from '@/services/goal-service'
import { Card } from '@/components/ui/Card'
import { useState, useEffect } from 'react'

interface OnboardingStep {
  id: string
  titleKey: string
  descriptionKey: string
  icon: React.ReactNode
  link: string
  isComplete: boolean
}

export function OnboardingChecklist() {
  const { t } = useTranslation('common')
  const [isDismissed, setIsDismissed] = useState(false)

  // Check localStorage for dismissed state
  useEffect(() => {
    const dismissed = localStorage.getItem('onboarding_dismissed')
    if (dismissed === 'true') {
      setIsDismissed(true)
    }
  }, [])

  // Fetch user data to determine completion status
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => fetchAccounts(),
  })

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions-check'],
    queryFn: () => fetchTransactions(),
  })

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: fetchGoals,
  })

  const hasAccounts = accounts.length > 0
  const hasTransactions = transactions.length > 0
  const hasGoals = goals.length > 0

  // Define onboarding steps
  const steps: OnboardingStep[] = [
    {
      id: 'account',
      titleKey: 'onboarding.steps.account.title',
      descriptionKey: 'onboarding.steps.account.description',
      icon: <Wallet className="h-5 w-5" />,
      link: '/accounts',
      isComplete: hasAccounts,
    },
    {
      id: 'upload',
      titleKey: 'onboarding.steps.upload.title',
      descriptionKey: 'onboarding.steps.upload.description',
      icon: <Upload className="h-5 w-5" />,
      link: '/upload',
      isComplete: hasTransactions,
    },
    {
      id: 'goals',
      titleKey: 'onboarding.steps.goals.title',
      descriptionKey: 'onboarding.steps.goals.description',
      icon: <Target className="h-5 w-5" />,
      link: '/goals',
      isComplete: hasGoals,
    },
  ]

  const completedCount = steps.filter(s => s.isComplete).length
  const allComplete = completedCount === steps.length
  const progress = Math.round((completedCount / steps.length) * 100)

  // Don't show if dismissed or all complete
  if (isDismissed || allComplete) {
    return null
  }

  const handleDismiss = () => {
    localStorage.setItem('onboarding_dismissed', 'true')
    setIsDismissed(true)
  }

  return (
    <Card className="mb-6 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-950 dark:to-blue-950 border-primary-200 dark:border-primary-800">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg">
            <Sparkles className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('onboarding.title')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('onboarding.subtitle', { completed: completedCount, total: steps.length })}
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label={t('button.close')}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps list */}
      <div className="space-y-2">
        {steps.map((step) => (
          <Link
            key={step.id}
            to={step.link}
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
              step.isComplete
                ? 'bg-green-50 dark:bg-green-950/50'
                : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750'
            }`}
          >
            <div
              className={`p-2 rounded-full ${
                step.isComplete
                  ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}
            >
              {step.isComplete ? <Check className="h-5 w-5" /> : step.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`font-medium ${
                  step.isComplete
                    ? 'text-green-700 dark:text-green-400 line-through'
                    : 'text-gray-900 dark:text-gray-100'
                }`}
              >
                {t(step.titleKey)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {t(step.descriptionKey)}
              </p>
            </div>
            {!step.isComplete && (
              <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
            )}
          </Link>
        ))}
      </div>
    </Card>
  )
}
