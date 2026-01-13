/**
 * Query Parser for Advanced Search
 *
 * Parses search queries to extract special filters and normalize text
 * Supports filters like: author:, category:, tag:, etc.
 */

import { normalizeText } from './textNormalizer';

/**
 * Parsed search query with extracted filters
 */
export interface ParsedQuery {
  /** The main search text (without filters) */
  text: string;
  /** Author filter (author:TurboDriver) */
  author?: string;
  /** Category filter (category:furniture) */
  category?: string;
  /** Tag filter (tag:adult) */
  tag?: string;
  /** Original raw query */
  raw: string;
}

/**
 * Regular expression patterns for filter extraction
 */
const FILTER_PATTERNS = {
  author: /author:\s*([^\s]+)/gi,
  category: /category:\s*([^\s]+)/gi,
  cat: /cat:\s*([^\s]+)/gi, // Alias for category
  tag: /tag:\s*([^\s]+)/gi,
};

/**
 * Parse a search query and extract filters
 *
 * @param query - Raw search query
 * @returns Parsed query with extracted filters
 *
 * @example
 * parseQuery('author:TurboDriver wicked whims')
 * // Returns: { text: 'wicked whims', author: 'TurboDriver', raw: '...' }
 *
 * @example
 * parseQuery('category:furniture modern sofa')
 * // Returns: { text: 'modern sofa', category: 'furniture', raw: '...' }
 */
export function parseQuery(query: string): ParsedQuery {
  if (!query || typeof query !== 'string') {
    return { text: '', raw: '' };
  }

  const parsed: ParsedQuery = {
    text: query,
    raw: query,
  };

  // Extract author filter
  const authorMatch = query.match(FILTER_PATTERNS.author);
  if (authorMatch) {
    parsed.author = authorMatch[0].split(':')[1].trim();
    parsed.text = parsed.text.replace(FILTER_PATTERNS.author, '').trim();
  }

  // Extract category filter
  const categoryMatch = query.match(FILTER_PATTERNS.category);
  if (categoryMatch) {
    parsed.category = categoryMatch[0].split(':')[1].trim();
    parsed.text = parsed.text.replace(FILTER_PATTERNS.category, '').trim();
  }

  // Extract category filter (alias: cat:)
  const catMatch = query.match(FILTER_PATTERNS.cat);
  if (catMatch && !parsed.category) {
    parsed.category = catMatch[0].split(':')[1].trim();
    parsed.text = parsed.text.replace(FILTER_PATTERNS.cat, '').trim();
  }

  // Extract tag filter
  const tagMatch = query.match(FILTER_PATTERNS.tag);
  if (tagMatch) {
    parsed.tag = tagMatch[0].split(':')[1].trim();
    parsed.text = parsed.text.replace(FILTER_PATTERNS.tag, '').trim();
  }

  // Normalize the remaining text
  parsed.text = normalizeText(parsed.text);

  return parsed;
}

/**
 * Check if a query contains any special filters
 *
 * @param query - Raw search query
 * @returns true if query contains filters
 */
export function hasFilters(query: string): boolean {
  if (!query) return false;

  return (
    FILTER_PATTERNS.author.test(query) ||
    FILTER_PATTERNS.category.test(query) ||
    FILTER_PATTERNS.cat.test(query) ||
    FILTER_PATTERNS.tag.test(query)
  );
}

/**
 * Build a user-friendly description of active filters
 *
 * @param parsed - Parsed query
 * @returns Human-readable filter description
 *
 * @example
 * getFilterDescription({ text: 'furniture', author: 'Ravasheen', ... })
 * // Returns: 'Searching "furniture" by author "Ravasheen"'
 */
export function getFilterDescription(parsed: ParsedQuery): string {
  const parts: string[] = [];

  if (parsed.text) {
    parts.push(`Searching "${parsed.text}"`);
  }

  if (parsed.author) {
    parts.push(`by author "${parsed.author}"`);
  }

  if (parsed.category) {
    parts.push(`in category "${parsed.category}"`);
  }

  if (parsed.tag) {
    parts.push(`with tag "${parsed.tag}"`);
  }

  return parts.join(' ') || 'No active filters';
}
