import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Trash2 } from 'lucide-react'
import { CollapsibleCard } from '@/components/ui/CollapsibleCard'
import { Button } from '@/components/ui/Button'
import { useCategoryTree, useDeleteCategory } from '@/hooks/useCategories'
import { CreateCategoryModal } from '@/components/transactions/CreateCategoryModal'
import { EditCategoryModal } from '@/components/transactions/EditCategoryModal'

interface Category {
  id: number
  name: string
  icon: string
  type: string
}

export function CategoryManagementSection() {
  const { t } = useTranslation('common')
  const { data: tree, isLoading } = useCategoryTree()
  const deleteMutation = useDeleteCategory()

  // Flatten category tree into a list of custom (non-system) categories
  const categories = useMemo(() => {
    if (!tree) return []
    const result: Category[] = []
    for (const parent of tree.expense ?? []) {
      for (const child of parent.children ?? []) {
        if (!child.is_system) {
          result.push({ id: child.id, name: child.name, icon: child.icon, type: 'expense' })
        }
      }
    }
    for (const parent of tree.income ?? []) {
      for (const child of parent.children ?? []) {
        if (!child.is_system) {
          result.push({ id: child.id, name: child.name, icon: child.icon, type: 'income' })
        }
      }
    }
    return result
  }, [tree])

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id)
      setDeleteConfirm(null)
    } catch (error) {
      console.error('Failed to delete category:', error)
    }
  }

  const expenseCategories = categories.filter(c => c.type === 'expense')
  const incomeCategories = categories.filter(c => c.type === 'income')

  return (
    <>
      <CollapsibleCard
        title={t('settings.categoryManagement')}
        badge={categories.length}
      >
        {isLoading ? (
          <div className="py-4 text-center text-gray-400">{t('loading')}</div>
        ) : categories.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-500 text-center py-4">
            {t('settings.noCategories')}
          </p>
        ) : (
          <div className="space-y-4">
            {/* Expense Categories */}
            {expenseCategories.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  {t('transaction.expense', 'Expense')}
                </h4>
                <div className="space-y-2">
                  {expenseCategories.map((cat) => (
                    <CategoryRow
                      key={cat.id}
                      category={cat}
                      onEdit={() => setEditingCategory(cat)}
                      onDelete={() => setDeleteConfirm(cat.id)}
                      isDeleting={deleteMutation.isPending && deleteConfirm === cat.id}
                      showDeleteConfirm={deleteConfirm === cat.id}
                      onConfirmDelete={() => handleDelete(cat.id)}
                      onCancelDelete={() => setDeleteConfirm(null)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Income Categories */}
            {incomeCategories.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  {t('transaction.income', 'Income')}
                </h4>
                <div className="space-y-2">
                  {incomeCategories.map((cat) => (
                    <CategoryRow
                      key={cat.id}
                      category={cat}
                      onEdit={() => setEditingCategory(cat)}
                      onDelete={() => setDeleteConfirm(cat.id)}
                      isDeleting={deleteMutation.isPending && deleteConfirm === cat.id}
                      showDeleteConfirm={deleteConfirm === cat.id}
                      onConfirmDelete={() => handleDelete(cat.id)}
                      onCancelDelete={() => setDeleteConfirm(null)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-4">
          <Button variant="outline" onClick={() => setShowCreateModal(true)}>
            {t('settings.addCategory')}
          </Button>
        </div>
      </CollapsibleCard>

      {/* Create Modal */}
      <CreateCategoryModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      {/* Edit Modal */}
      <EditCategoryModal
        isOpen={!!editingCategory}
        onClose={() => setEditingCategory(null)}
        category={editingCategory}
      />
    </>
  )
}

interface CategoryRowProps {
  category: Category
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
  showDeleteConfirm: boolean
  onConfirmDelete: () => void
  onCancelDelete: () => void
}

function CategoryRow({
  category,
  onEdit,
  onDelete,
  isDeleting,
  showDeleteConfirm,
  onConfirmDelete,
  onCancelDelete,
}: CategoryRowProps) {
  const { t } = useTranslation('common')

  if (showDeleteConfirm) {
    return (
      <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <span className="text-sm text-red-800 dark:text-red-200">
          {t('category.deleteConfirm', 'Delete this category?')}
        </span>
        <div className="flex gap-2">
          <button
            onClick={onCancelDelete}
            className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            {t('cancel')}
          </button>
          <button
            onClick={onConfirmDelete}
            disabled={isDeleting}
            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            {isDeleting ? '...' : t('delete')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <div className="flex items-center gap-3">
        <span className="text-xl">{category.icon}</span>
        <span className="text-gray-900 dark:text-gray-100">{category.name}</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onEdit}
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
          title={t('edit')}
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={onDelete}
          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
          title={t('delete')}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}
