import { useNavigate } from '@tanstack/react-router'

interface QuickActionButtonProps {
  label: string
  route: string
  icon?: string
}

export function QuickActionButton({ label, route, icon }: QuickActionButtonProps) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate({ to: route })}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 hover:bg-primary-200 dark:hover:bg-primary-900/50 active:bg-primary-300 dark:active:bg-primary-800/50 transition-colors"
    >
      {icon && <span>{icon}</span>}
      {label}
    </button>
  )
}
