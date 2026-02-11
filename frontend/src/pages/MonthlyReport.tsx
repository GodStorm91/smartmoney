import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetchMonthlyReport, downloadMonthlyReportPDF } from '@/services/report-service'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { MetricCard } from '@/components/analytics/MetricCard'
import { MonthPicker } from '@/components/analytics/MonthPicker'
import { CategoryBarChart } from '@/components/charts/CategoryBarChart'
import { IncomeExpenseBarChart } from '@/components/charts/IncomeExpenseBarChart'
import { ReportHeader } from '@/components/report/ReportHeader'
import { FocusAreas } from '@/components/report/FocusAreas'
import { SmartSummaryCard } from '@/components/report/SmartSummaryCard'
import { GoalProgressCard } from '@/components/report/GoalProgressCard'
import { AccountSummaryCard } from '@/components/report/AccountSummaryCard'
import { ReportInsights } from '@/components/report/ReportInsights'
import { formatCurrency } from '@/utils/formatCurrency'

export function MonthlyReport({ embedded = false }: { embedded?: boolean }) {
  const { t } = useTranslation('common')
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [isDownloading, setIsDownloading] = useState(false)

  const year = selectedMonth.getFullYear()
  const month = selectedMonth.getMonth() + 1

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['monthly-report', year, month],
    queryFn: () => fetchMonthlyReport(year, month),
    staleTime: 1000 * 60 * 5,
  })

  const handleDownloadPDF = useCallback(async () => {
    setIsDownloading(true)
    try {
      const blob = await downloadMonthlyReportPDF(year, month)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `monthly_report_${year}_${String(month).padStart(2, '0')}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch {
      toast.error(t('report.downloadError'))
    } finally {
      setIsDownloading(false)
    }
  }, [year, month, t])

  const content = (
    <>
      <ReportHeader year={year} month={month} onDownloadPDF={handleDownloadPDF} isDownloading={isDownloading} />
      <MonthPicker selectedMonth={selectedMonth} onChange={setSelectedMonth} className="mb-6" />

      {isLoading && (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      )}

      {error && (
        <Card className="text-center py-10">
          <p className="text-red-500">{t('report.loadError')}</p>
        </Card>
      )}

      {report && (
        <div className="space-y-6">
          {/* AI Smart Summary */}
          <SmartSummaryCard year={year} month={month} reportData={report} />

          {/* Summary metrics */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <MetricCard
              label={t('analytics.heroIncome')}
              value={formatCurrency(report.summary.total_income)}
              change={report.summary.income_change}
              trend={report.summary.income_change > 0 ? 'positive' : report.summary.income_change < 0 ? 'negative' : 'neutral'}
            />
            <MetricCard
              label={t('analytics.heroExpense')}
              value={formatCurrency(report.summary.total_expense)}
              change={report.summary.expense_change}
              trend={report.summary.expense_change < 0 ? 'positive' : report.summary.expense_change > 0 ? 'negative' : 'neutral'}
            />
            <MetricCard
              label={t('analytics.heroNet')}
              value={formatCurrency(report.summary.net_cashflow)}
              change={report.summary.net_change}
              trend={report.summary.net_change > 0 ? 'positive' : report.summary.net_change < 0 ? 'negative' : 'neutral'}
            />
            <MetricCard
              label={t('report.savingsRate')}
              value={`${report.summary.savings_rate.toFixed(1)}%`}
              subtitle={t('report.savingsRateDesc')}
            />
          </div>

          {/* Budget adherence — focus areas + expandable full table */}
          {report.budget_adherence && (
            <Card>
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                {t('report.budgetAdherence')}
              </h2>
              <FocusAreas
                focusAreas={report.budget_adherence.focus_areas ?? []}
                budgetAdherence={report.budget_adherence}
              />
            </Card>
          )}

          {/* Category breakdown */}
          {report.category_breakdown.length > 0 && (
            <Card>
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                {t('report.categoryBreakdown')}
              </h2>
              <CategoryBarChart data={report.category_breakdown} />
            </Card>
          )}

          {/* Spending trends */}
          {report.spending_trends.length > 0 && (
            <Card>
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                {t('report.spendingTrends')}
              </h2>
              <IncomeExpenseBarChart data={report.spending_trends} />
            </Card>
          )}

          {/* Goal progress */}
          {report.goal_progress.length > 0 && (
            <Card>
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                {t('report.goalProgress')}
              </h2>
              <div className="space-y-4">
                {report.goal_progress.map((g) => (
                  <GoalProgressCard key={g.goal_id} goal={g} />
                ))}
              </div>
            </Card>
          )}

          {/* Account summary */}
          {report.account_summary.length > 0 && (
            <Card>
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                {t('report.accountSummary')}
              </h2>
              <AccountSummaryCard accounts={report.account_summary} totalNetWorth={report.total_net_worth} />
            </Card>
          )}

          <ReportInsights insights={report.insights} />

          {/* Empty state */}
          {report.summary.total_income === 0 && report.summary.total_expense === 0 && (
            <Card className="text-center py-10">
              <p className="text-gray-500 dark:text-gray-400">{t('report.noData')}</p>
            </Card>
          )}
        </div>
      )}
    </>
  )

  if (embedded) return content

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
      {content}
    </div>
  )
}
