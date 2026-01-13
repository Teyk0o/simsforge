/**
 * Text Normalization Utilities for Advanced Search (Frontend)
 *
 * Provides functions to normalize and prepare text for search operations
 * before sending to the backend API.
 */

/**
 * Remove accents and diacritics from text
 *
 * @param text - Input text with potential accents
 * @returns Text with accents removed (café → cafe)
 */
export function removeAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Normalize text for search matching
 * - Converts to lowercase
 * - Removes accents
 * - Trims whitespace
 * - Normalizes multiple spaces to single space
 * - Removes special characters (keeps alphanumeric, spaces, hyphens, and colons for filters)
 *
 * @param text - Input text to normalize
 * @returns Normalized text ready for search
 */
export function normalizeSearchText(text: string): string {
  if (!text) return '';

  return removeAccents(text)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Multiple spaces → single space
    .replace(/[^\w\s:-]/g, '') // Keep alphanumeric, space, hyphen, colon (for filters)
    .replace(/_/g, ' '); // Underscores → spaces
}

/**
 * Validate if a query contains special search filters
 * Used to provide UI hints or help text
 *
 * @param query - Search query
 * @returns Object with filter presence flags
 */
export function detectFilters(query: string): {
  hasAuthorFilter: boolean;
  hasCategoryFilter: boolean;
  hasTagFilter: boolean;
  hasAnyFilter: boolean;
} {
  const authorPattern = /author:\s*\w+/i;
  const categoryPattern = /(category|cat):\s*\w+/i;
  const tagPattern = /tag:\s*\w+/i;

  const hasAuthorFilter = authorPattern.test(query);
  const hasCategoryFilter = categoryPattern.test(query);
  const hasTagFilter = tagPattern.test(query);

  return {
    hasAuthorFilter,
    hasCategoryFilter,
    hasTagFilter,
    hasAnyFilter: hasAuthorFilter || hasCategoryFilter || hasTagFilter,
  };
}

/**
 * Build search help text based on query
 * Provides contextual hints for using search filters
 *
 * @param query - Current search query
 * @returns Help text string or null
 */
export function getSearchHelpText(query: string): string | null {
  if (!query || query.trim().length === 0) {
    return 'Try: "author:TurboDriver" or "category:furniture modern sofa"';
  }

  const filters = detectFilters(query);

  if (filters.hasAnyFilter) {
    return null; // User already knows about filters
  }

  // Suggest filters for common queries
  const normalized = normalizeSearchText(query);

  if (normalized.split(' ').length === 1 && normalized.length > 3) {
    return 'Tip: Add "author:" or "category:" to narrow results';
  }

  return null;
}
