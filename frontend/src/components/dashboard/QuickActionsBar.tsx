import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from '@tanstack/react-router'
import { Plus, Upload, Camera, BarChart3, Wallet, Target } from 'lucide-react'
import { cn } from '@/utils/cn'

interface QuickAction {
  icon: React.ReactNode
  label: string
  to?: string
  onClick?: () => void
  color: string
}

interface QuickActionsBarProps {
  onAddTransaction?: () => void
  onScanReceipt?: () => void
  className?: string
}

export function QuickActionsBar({
  onAddTransaction,
  onScanReceipt,
  className,
}: QuickActionsBarProps) {
  const { t } = useTranslation('common')
  const navigate = useNavigate()

  // Default handlers navigate to transactions page
  const handleAddTransaction = onAddTransaction || (() => navigate({ to: '/transactions' }))
  const handleScanReceipt = onScanReceipt || (() => navigate({ to: '/transactions' }))

  const actions: QuickAction[] = [
    {
      icon: <Plus size={20} />,
      label: t('quickActions.addTransaction', 'Add'),
      onClick: handleAddTransaction,
      color: 'bg-primary-500 text-white',
    },
    {
      icon: <Camera size={20} />,
      label: t('quickActions.scan', 'Scan'),
      onClick: handleScanReceipt,
      color: 'bg-purple-500 text-white',
    },
    {
      icon: <Upload size={20} />,
      label: t('quickActions.upload', 'Upload'),
      to: '/upload',
      color: 'bg-blue-500 text-white',
    },
    {
      icon: <BarChart3 size={20} />,
      label: t('quickActions.analytics', 'Analytics'),
      to: '/analytics',
      color: 'bg-green-500 text-white',
    },
    {
      icon: <Wallet size={20} />,
      label: t('quickActions.accounts', 'Accounts'),
      to: '/accounts',
      color: 'bg-orange-500 text-white',
    },
    {
      icon: <Target size={20} />,
      label: t('quickActions.goals', 'Goals'),
      to: '/goals',
      color: 'bg-pink-500 text-white',
    },
  ]

  return (
    <div className={cn('overflow-x-auto scrollbar-hide -mx-4 px-4', className)}>
      <div className="flex gap-3 pb-2 min-w-max">
        {actions.map((action, index) => {
          const content = (
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center',
                  'transition-transform active:scale-95',
                  action.color
                )}
              >
                {action.icon}
              </div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {action.label}
              </span>
            </div>
          )

          if (action.to) {
            return (
              <Link
                key={index}
                to={action.to}
                className="flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-xl p-1"
              >
                {content}
              </Link>
            )
          }

          return (
            <button
              key={index}
              onClick={action.onClick}
              className="flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-xl p-1"
            >
              {content}
            </button>
          )
        })}
      </div>
    </div>
  )
}
