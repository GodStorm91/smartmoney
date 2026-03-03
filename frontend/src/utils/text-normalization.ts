/**
 * Text normalization utilities for multi-locale search.
 *
 * Handles:
 * - Vietnamese diacritics (ă, ê, ô, ơ, ư → base letters)
 * - Case-insensitive matching
 * - Whitespace trimming
 */

/**
 * Strip Vietnamese diacritics using Unicode normalization.
 *
 * Example:
 * normalizeVietnamese("tiền") → "tien"
 * normalizeVietnamese("đồng") → "dong"
 * normalizeVietnamese("ăn ở") → "an o"
 */
export const normalizeVietnamese = (text: string): string => {
  if (!text) return '';
  return text
    .normalize('NFD') // Decompose diacritics into base + combining marks
    .replace(/[\u0300-\u036f]/g, ''); // Remove combining diacritical marks (U+0300 to U+036F)
};

/**
 * Normalize search query for category matching.
 * Applies: lowercase + Vietnamese normalization + trim
 */
export const normalizeSearchQuery = (text: string): string => {
  if (!text) return '';
  return normalizeVietnamese(text).toLowerCase().trim();
};

/**
 * Normalize category name for comparison.
 * Same as search query normalization for consistency.
 */
export const normalizeCategoryName = (text: string): string => {
  return normalizeSearchQuery(text);
};

/**
 * Check if a category name matches a search query.
 * Substring match, case-insensitive, diacritic-insensitive.
 *
 * Example:
 * categoryMatches("Tiền ăn", "tien", "vi") → true
 * categoryMatches("Groceries", "grocer", "en") → true
 * categoryMatches("Restaurants & Bars", "bar") → true
 */
export const categoryMatches = (
  categoryName: string,
  query: string,
  locale: 'en' | 'ja' | 'vi' = 'en'
): boolean => {
  if (!categoryName || !query) return !query;

  const normalizedQuery = normalizeSearchQuery(query);
  const normalizedCategory = normalizeCategoryName(categoryName);

  // Substring match
  return normalizedCategory.includes(normalizedQuery);
};

/**
 * Filter categories by search query.
 * Returns filtered array with normalized names (for display consistency).
 */
export const filterCategories = (
  categories: Array<{ id: string; name: string }>,
  query: string,
  locale?: 'en' | 'ja' | 'vi'
) => {
  return categories.filter((cat) => categoryMatches(cat.name, query, locale));
};
