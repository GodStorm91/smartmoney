import type { CategoryTree, CategoryParent } from '@/types/category'

/**
 * Build a flat set of all expense category names (parents + children) from the tree.
 */
export function getAllExpenseCategoryNames(tree: CategoryTree | undefined): string[] {
  if (!tree) return []
  const names: string[] = []
  for (const parent of tree.expense) {
    names.push(parent.name)
    for (const child of parent.children) {
      names.push(child.name)
    }
  }
  return names
}

/**
 * Build parent->children mapping from the category tree (expense only).
 */
export function buildCategoryHierarchy(
  tree: CategoryTree | undefined
): Record<string, string[]> {
  if (!tree) return {}
  const hierarchy: Record<string, string[]> = {}
  for (const parent of tree.expense) {
    hierarchy[parent.name] = parent.children.map((c) => c.name)
  }
  return hierarchy
}

/**
 * Check if a category matches a budget allocation, considering hierarchy.
 * e.g., "Dining" is a child of "Food" -> matches budget allocation "Food".
 */
export function categoryMatchesBudget(
  category: string,
  budgetCategories: string[],
  hierarchy: Record<string, string[]>
): boolean {
  const lower = category.toLowerCase()
  for (const bc of budgetCategories) {
    if (bc.toLowerCase() === lower) return true
    // Check if category is a child of this budget category
    const children = hierarchy[bc]
    if (children?.some((c) => c.toLowerCase() === lower)) return true
  }
  return false
}

/**
 * Normalize an AI-suggested category name to match a valid category.
 * Uses substring matching, splitting by "&", and Levenshtein-based fuzzy match.
 * Mirrors the backend normalize_category_name logic.
 */
export function normalizeCategoryName(
  name: string,
  validCategories: string[]
): string {
  if (!name || validCategories.length === 0) return name

  const trimmed = name.trim()

  // Exact match (case-insensitive)
  const exact = validCategories.find(
    (c) => c.toLowerCase() === trimmed.toLowerCase()
  )
  if (exact) return exact

  // Split by "&" or "/" and check each part
  const parts = trimmed.split(/[&/]/).map((p) => p.trim().toLowerCase())
  for (const part of parts) {
    if (!part) continue
    const match = validCategories.find(
      (c) => c.toLowerCase() === part
    )
    if (match) return match
  }

  // Substring match: "Dining Out" contains "Dining"
  for (const valid of validCategories) {
    const vl = valid.toLowerCase()
    if (trimmed.toLowerCase().includes(vl) || vl.includes(trimmed.toLowerCase())) {
      return valid
    }
  }

  // Fuzzy match using Levenshtein distance
  let bestMatch = name
  let bestDist = Infinity
  const maxDist = Math.max(2, Math.floor(trimmed.length * 0.3))

  for (const valid of validCategories) {
    const dist = levenshtein(trimmed.toLowerCase(), valid.toLowerCase())
    if (dist < bestDist) {
      bestDist = dist
      bestMatch = valid
    }
  }

  return bestDist <= maxDist ? bestMatch : name
}

/**
 * Simple Levenshtein distance for fuzzy matching.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}
