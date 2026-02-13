import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { MapPinned } from 'lucide-react'
import { RelocationForm } from '@/components/relocation/RelocationForm'
import { ComparisonReport } from '@/components/relocation/ComparisonReport'
import { GoalImpactCard } from '@/components/relocation/GoalImpactCard'
import { compareLocations } from '@/services/relocation-service'
import type { RelocationCompareRequest, RelocationCompareResponse } from '@/types/relocation'

export function RelocationPage() {
  const { t } = useTranslation('common')
  const [result, setResult] = useState<RelocationCompareResponse | null>(null)

  const compareMutation = useMutation({
    mutationFn: (request: RelocationCompareRequest) => compareLocations(request),
    onSuccess: (data) => {
      setResult(data)
    },
    onError: () => {
      toast.error(t('relocation.compareError'))
    },
  })

  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MapPinned className="w-5 h-5 text-primary-600" />
            {t('relocation.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('relocation.subtitle')}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <RelocationForm
          onSubmit={(req) => compareMutation.mutate(req)}
          isLoading={compareMutation.isPending}
        />

        {result && (
          <>
            <ComparisonReport data={result} />
            <GoalImpactCard monthlyDifference={result.monthly_difference} />
          </>
        )}
      </div>
    </div>
  )
}
