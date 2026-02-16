export interface CategoryOption {
  id: string
  labelKey: string
  icon: string
  value: string
}

export const EXPENSE_CATEGORIES: CategoryOption[] = [
  { id: 'food', labelKey: 'category.food', icon: '🍽️', value: 'Food' },
  { id: 'housing', labelKey: 'category.housing', icon: '🏠', value: 'Housing' },
  { id: 'transport', labelKey: 'category.transport', icon: '🚗', value: 'Transportation' },
  { id: 'utilities', labelKey: 'category.utilities', icon: '💡', value: 'Utilities' },
  { id: 'communication', labelKey: 'category.communication', icon: '📱', value: 'Communication' },
  { id: 'entertainment', labelKey: 'category.entertainment', icon: '🎬', value: 'Entertainment' },
  { id: 'shopping', labelKey: 'category.shopping', icon: '🛍️', value: 'Shopping' },
  { id: 'health', labelKey: 'category.health', icon: '🏥', value: 'Health' },
  { id: 'education', labelKey: 'category.education', icon: '📚', value: 'Education' },
  { id: 'proxy_purchase', labelKey: 'category.proxy_purchase', icon: '🛒', value: 'Proxy Purchase' },
  { id: 'other', labelKey: 'category.other', icon: '📦', value: 'Other' },
]

export const INCOME_CATEGORIES: CategoryOption[] = [
  { id: 'salary', labelKey: 'category.salary', icon: '💰', value: 'Income' },
  { id: 'bonus', labelKey: 'category.bonus', icon: '🎁', value: 'Income' },
  { id: 'investment', labelKey: 'category.investment', icon: '📈', value: 'Income' },
  { id: 'freelance', labelKey: 'category.freelance', icon: '💼', value: 'Income' },
  { id: 'refund', labelKey: 'category.refund', icon: '🔄', value: 'Income' },
  { id: 'proxy_income', labelKey: 'category.proxy_income', icon: '🤝', value: 'Proxy Income' },
  { id: 'other_income', labelKey: 'category.other', icon: '📦', value: 'Income' },
]
