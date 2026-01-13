/**
 * Text Normalization Utilities for Advanced Search
 *
 * Provides functions to normalize, clean, and prepare text for fuzzy matching
 * and case-insensitive search operations.
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
 * - Removes special characters (keeps alphanumeric, spaces, and hyphens)
 *
 * @param text - Input text to normalize
 * @returns Normalized text ready for search matching
 */
export function normalizeText(text: string): string {
  if (!text) return '';

  return removeAccents(text)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Multiple spaces → single space
    .replace(/[^\w\s-]/g, '') // Remove special chars except alphanumeric, space, hyphen
    .replace(/_/g, ' '); // Underscores → spaces
}

/**
 * Generate common text variations to improve search matching
 * - Original text
 * - Singular form (removes trailing 's')
 * - Plural form (adds 's')
 *
 * @param text - Input text
 * @returns Array of text variations
 */
export function generateTextVariations(text: string): string[] {
  const normalized = normalizeText(text);
  const variations = new Set([normalized]);

  const words = normalized.split(' ');

  // Generate variations for each word
  words.forEach(word => {
    if (word.length > 3) {
      // Singular: remove trailing 's'
      if (word.endsWith('s') && !word.endsWith('ss')) {
        variations.add(word.slice(0, -1));
      }
      // Plural: add 's'
      if (!word.endsWith('s')) {
        variations.add(word + 's');
      }
    }
  });

  return Array.from(variations);
}

/**
 * Normalize text for indexing (used in search scoring)
 * Similar to normalizeText but preserves more structure
 *
 * @param text - Input text
 * @returns Normalized text for indexing
 */
export function normalizeForIndex(text: string): string {
  if (!text) return '';

  return removeAccents(text)
    .toLowerCase()
    .trim();
}

/**
 * Check if a search term matches a target text with normalization
 *
 * @param searchTerm - The search query
 * @param targetText - The text to search in
 * @returns true if match found
 */
export function isNormalizedMatch(searchTerm: string, targetText: string): boolean {
  const normalizedSearch = normalizeText(searchTerm);
  const normalizedTarget = normalizeText(targetText);

  return normalizedTarget.includes(normalizedSearch);
}

/**
 * Extract searchable tokens from text for indexing
 * Splits text into individual words and normalizes them
 *
 * @param text - Input text
 * @returns Array of normalized tokens
 */
export function extractTokens(text: string): string[] {
  const normalized = normalizeText(text);
  return normalized.split(' ').filter(token => token.length > 0);
}
