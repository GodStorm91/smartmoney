/**
 * CategoryRulesList - Display and manage category rules
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Tag, Trash2, Plus, Wand2, Play, Check } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Card } from '@/components/ui/Card'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  fetchCategoryRules,
  deleteCategoryRule,
  createCategoryRule,
  applyRulesToTransactions,
  seedDefaultRules,
  suggestCategoryRules,
  type MatchType,
  type RuleSuggestion,
} from '@/services/category-rules-service'

const MATCH_TYPE_LABELS: Record<MatchType, string> = {
  contains: 'categoryRules.contains',
  starts_with: 'categoryRules.startsWith',
  exact: 'categoryRules.exact',
}

const CATEGORIES = [
  'Food', 'Shopping', 'Transportation', 'Utilities', 'Entertainment',
  'Healthcare', 'Education', 'Groceries', 'Dining', 'Cafe', 'Convenience',
  'Transfer', 'Investment', 'Clothing', 'Other'
]

interface CategoryRulesListProps {
  variant?: 'card' | 'collapsible'
}

export function CategoryRulesList({ variant = 'card' }: CategoryRulesListProps) {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [applyResult, setApplyResult] = useState<{ count: number; applied: boolean } | null>(null)

  // Form state
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('Other')
  const [matchType, setMatchType] = useState<MatchType>('contains')

  const { data: rules, isLoading } = useQuery({
    queryKey: ['category-rules'],
    queryFn: fetchCategoryRules,
  })

  const { data: suggestions, isLoading: loadingSuggestions } = useQuery({
    queryKey: ['category-rules-suggestions'],
    queryFn: suggestCategoryRules,
    enabled: showSuggestions,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCategoryRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-rules'] })
      setDeletingId(null)
    },
  })

  const createMutation = useMutation({
    mutationFn: createCategoryRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-rules'] })
      setKeyword('')
      setCategory('Other')
      setMatchType('contains')
      setShowAddForm(false)
    },
  })

  const seedMutation = useMutation({
    mutationFn: seedDefaultRules,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-rules'] })
    },
  })

  const applyMutation = useMutation({
    mutationFn: (dryRun: boolean) => applyRulesToTransactions(dryRun),
    onSuccess: (data, dryRun) => {
      if (!dryRun) {
        queryClient.invalidateQueries({ queryKey: ['transactions'] })
        queryClient.invalidateQueries({ queryKey: ['analytics'] })
        setApplyResult({ count: data.affected_count, applied: true })
      } else {
        setApplyResult({ count: data.affected_count, applied: false })
      }
    },
  })

  const handleDelete = (id: number) => {
    if (confirm(t('common.confirmDelete'))) {
      setDeletingId(id)
      deleteMutation.mutate(id)
    }
  }

  const handleCreate = () => {
    if (!keyword.trim()) return
    createMutation.mutate({
      keyword: keyword.trim(),
      category,
      match_type: matchType,
      priority: 10,
    })
  }

  const handleAddSuggestion = (suggestion: RuleSuggestion) => {
    createMutation.mutate({
      keyword: suggestion.keyword,
      category: suggestion.suggested_category,
      match_type: 'contains',
      priority: 10,
    })
  }

  // Wrapper component based on variant
  const Container = variant === 'collapsible'
    ? ({ children }: { children: React.ReactNode }) => (
        <CollapsibleSection
          title={t('categoryRules.title')}
          icon={<Tag className="w-5 h-5 text-purple-500" />}
          badge={rules?.length ? (
            <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
              {rules.length}
            </span>
          ) : undefined}
        >
          {children}
        </CollapsibleSection>
      )
    : ({ children }: { children: React.ReactNode }) => <Card>{children}</Card>

  if (isLoading) {
    return (
      <Container>
        {variant === 'card' && (
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
            {t('categoryRules.title')}
          </h3>
        )}
        <div className="flex justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      </Container>
    )
  }

  return (
    <Container>
      {variant === 'card' && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('categoryRules.title')}
            </h3>
          </div>
          <div className="flex gap-2">
            {(!rules || rules.length === 0) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => seedMutation.mutate()}
                disabled={seedMutation.isPending}
              >
                <Wand2 className="w-4 h-4 mr-1" />
                {seedMutation.isPending ? t('common.loading') : t('categoryRules.seedDefaults')}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <Plus className="w-4 h-4 mr-1" />
              {t('categoryRules.addRule')}
            </Button>
          </div>
        </div>
      )}

      {/* Action buttons for collapsible variant */}
      {variant === 'collapsible' && (
        <div className="flex gap-2 mb-4">
          {(!rules || rules.length === 0) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
            >
              <Wand2 className="w-4 h-4 mr-1" />
              {seedMutation.isPending ? t('common.loading') : t('categoryRules.seedDefaults')}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus className="w-4 h-4 mr-1" />
            {t('categoryRules.addRule')}
          </Button>
        </div>
      )}

      {/* Add Rule Form */}
      {showAddForm && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder={t('categoryRules.keyword')}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className={cn(
                'h-10 px-3 border rounded-lg text-sm',
                'bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
                'border-gray-300'
              )}
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={cn(
                'h-10 px-3 border rounded-lg text-sm',
                'bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
                'border-gray-300'
              )}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              value={matchType}
              onChange={(e) => setMatchType(e.target.value as MatchType)}
              className={cn(
                'h-10 px-3 border rounded-lg text-sm',
                'bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
                'border-gray-300'
              )}
            >
              <option value="contains">{t('categoryRules.contains')}</option>
              <option value="starts_with">{t('categoryRules.startsWith')}</option>
              <option value="exact">{t('categoryRules.exact')}</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={!keyword.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </div>
      )}

      {/* Rules List */}
      {rules && rules.length > 0 ? (
        <>
          <div className="space-y-2 mb-6">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border',
                  rule.is_active
                    ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 opacity-60'
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <code className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-sm truncate max-w-[150px]">
                    {rule.keyword}
                  </code>
                  <span className="text-gray-400">→</span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">
                    {rule.category}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">
                    ({t(MATCH_TYPE_LABELS[rule.match_type])})
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(rule.id)}
                  disabled={deletingId === rule.id}
                  className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 transition-colors"
                >
                  {deletingId === rule.id ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Apply Rules Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('categoryRules.applyDescription')}
                </p>
                {applyResult && (
                  <p className={cn(
                    'text-sm mt-1',
                    applyResult.applied ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'
                  )}>
                    {applyResult.applied
                      ? t('categoryRules.appliedCount', { count: applyResult.count })
                      : t('categoryRules.previewCount', { count: applyResult.count })}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyMutation.mutate(true)}
                  disabled={applyMutation.isPending}
                >
                  {applyMutation.isPending ? t('common.loading') : t('categoryRules.preview')}
                </Button>
                <Button
                  size="sm"
                  onClick={() => applyMutation.mutate(false)}
                  disabled={applyMutation.isPending || (applyResult?.count === 0)}
                >
                  <Play className="w-4 h-4 mr-1" />
                  {t('categoryRules.applyNow')}
                </Button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <Tag className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">{t('categoryRules.noRules')}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {t('categoryRules.noRulesDescription')}
          </p>
        </div>
      )}

      {/* Suggestions Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <button
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          {showSuggestions ? t('categoryRules.hideSuggestions') : t('categoryRules.showSuggestions')}
        </button>

        {showSuggestions && (
          <div className="mt-4 space-y-2">
            {loadingSuggestions ? (
              <div className="flex justify-center py-4">
                <LoadingSpinner size="sm" />
              </div>
            ) : suggestions && suggestions.length > 0 ? (
              suggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <code className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm truncate max-w-[150px]">
                      {suggestion.keyword}
                    </code>
                    <span className="text-gray-400">→</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {suggestion.suggested_category}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({suggestion.count}x)
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddSuggestion(suggestion)}
                    disabled={createMutation.isPending}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                {t('categoryRules.noSuggestions')}
              </p>
            )}
          </div>
        )}
      </div>
    </Container>
  )
}
