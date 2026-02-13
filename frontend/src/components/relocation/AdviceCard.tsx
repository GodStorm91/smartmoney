import { useTranslation } from 'react-i18next'
import { Lightbulb } from 'lucide-react'
import { Card } from '@/components/ui/Card'

interface AdviceCardProps {
  advice: string[]
}

export function AdviceCard({ advice }: AdviceCardProps) {
  const { t } = useTranslation('common')

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-5 h-5 text-blue-500 dark:text-teal-400" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('relocation.adviceTitle')}
        </h2>
      </div>
      <ul className="space-y-2">
        {advice.map((tip, index) => (
          <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 dark:bg-teal-400 shrink-0" />
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
