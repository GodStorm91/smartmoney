import { cn } from '@/utils/cn'

interface SuccessCheckmarkProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeConfig = {
  sm: { wrapper: 'w-8 h-8', stroke: 2 },
  md: { wrapper: 'w-12 h-12', stroke: 2.5 },
  lg: { wrapper: 'w-16 h-16', stroke: 3 },
}

export function SuccessCheckmark({ size = 'md', className }: SuccessCheckmarkProps) {
  const config = sizeConfig[size]

  return (
    <div className={cn('relative', config.wrapper, className)}>
      {/* Circle background */}
      <div className="absolute inset-0 rounded-full bg-green-100 dark:bg-green-900/30 animate-checkmark-circle" />

      {/* SVG Checkmark */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 50 50"
        fill="none"
      >
        <circle
          cx="25"
          cy="25"
          r="20"
          stroke="currentColor"
          strokeWidth={config.stroke}
          className="text-green-500 animate-checkmark-circle"
          style={{ animationDelay: '0.1s' }}
        />
        <path
          d="M15 25 L22 32 L35 18"
          stroke="currentColor"
          strokeWidth={config.stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-green-500 animate-checkmark"
          style={{
            strokeDasharray: 50,
            strokeDashoffset: 50,
            animationDelay: '0.3s',
          }}
        />
      </svg>
    </div>
  )
}
