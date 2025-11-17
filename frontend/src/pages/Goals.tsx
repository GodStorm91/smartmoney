import { useQuery } from '@tanstack/react-query'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { GoalProgressCard } from '@/components/financial/GoalProgressCard'
import { fetchGoals } from '@/services/goal-service'

export function Goals() {
  const { data: goals, isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: fetchGoals,
  })

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">長期目標</h2>
        <p className="text-gray-600">1年、3年、5年、10年の貯蓄目標を設定・追跡</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : goals && goals.length > 0 ? (
        <div className="space-y-6">
          {goals.map((goal) => (
            <GoalProgressCard key={goal.id} goal={goal} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">目標が設定されていません</h3>
          <p className="text-gray-600">最初の目標を設定しましょう</p>
        </div>
      )}
    </div>
  )
}
