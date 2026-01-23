/**
 * Unit tests for text normalizer utilities
 */

import { describe, it, expect } from 'vitest';
import {
  removeAccents,
  normalizeSearchText,
  detectFilters,
  getSearchHelpText,
} from '@/lib/utils/search/textNormalizer';

describe('removeAccents', () => {
  it('should remove accents from text', () => {
    expect(removeAccents('café')).toBe('cafe');
    expect(removeAccents('résumé')).toBe('resume');
    expect(removeAccents('naïve')).toBe('naive');
  });

  it('should leave non-accented text unchanged', () => {
    expect(removeAccents('hello world')).toBe('hello world');
    expect(removeAccents('test123')).toBe('test123');
  });

  it('should handle empty string', () => {
    expect(removeAccents('')).toBe('');
  });

  it('should handle various diacritics', () => {
    expect(removeAccents('über')).toBe('uber');
    expect(removeAccents('año')).toBe('ano');
    expect(removeAccents('façade')).toBe('facade');
  });
});

describe('normalizeSearchText', () => {
  it('should lowercase text', () => {
    expect(normalizeSearchText('HELLO')).toBe('hello');
  });

  it('should remove accents', () => {
    expect(normalizeSearchText('Café')).toBe('cafe');
  });

  it('should trim whitespace', () => {
    expect(normalizeSearchText('  hello  ')).toBe('hello');
  });

  it('should collapse multiple spaces', () => {
    expect(normalizeSearchText('hello   world')).toBe('hello world');
  });

  it('should replace underscores with spaces', () => {
    expect(normalizeSearchText('hello_world')).toBe('hello world');
  });

  it('should keep colons and hyphens (for filters)', () => {
    expect(normalizeSearchText('author:test')).toBe('author:test');
    expect(normalizeSearchText('my-mod')).toBe('my-mod');
  });

  it('should remove special characters', () => {
    expect(normalizeSearchText('hello! @world#')).toBe('hello world');
  });

  it('should return empty string for falsy input', () => {
    expect(normalizeSearchText('')).toBe('');
  });
});

describe('detectFilters', () => {
  it('should detect author filter', () => {
    const result = detectFilters('author:TurboDriver');
    expect(result.hasAuthorFilter).toBe(true);
    expect(result.hasAnyFilter).toBe(true);
  });

  it('should detect category filter', () => {
    expect(detectFilters('category:furniture').hasCategoryFilter).toBe(true);
    expect(detectFilters('cat:builds').hasCategoryFilter).toBe(true);
  });

  it('should detect tag filter', () => {
    const result = detectFilters('tag:realistic');
    expect(result.hasTagFilter).toBe(true);
    expect(result.hasAnyFilter).toBe(true);
  });

  it('should detect no filters in regular query', () => {
    const result = detectFilters('modern sofa');
    expect(result.hasAuthorFilter).toBe(false);
    expect(result.hasCategoryFilter).toBe(false);
    expect(result.hasTagFilter).toBe(false);
    expect(result.hasAnyFilter).toBe(false);
  });

  it('should detect multiple filters', () => {
    const result = detectFilters('author:Test category:furniture');
    expect(result.hasAuthorFilter).toBe(true);
    expect(result.hasCategoryFilter).toBe(true);
    expect(result.hasAnyFilter).toBe(true);
  });
});

describe('getSearchHelpText', () => {
  it('should return default help for empty query', () => {
    const result = getSearchHelpText('');
    expect(result).toContain('author:');
    expect(result).toContain('category:');
  });

  it('should return default help for whitespace-only query', () => {
    const result = getSearchHelpText('   ');
    expect(result).not.toBeNull();
  });

  it('should return null when user already uses filters', () => {
    expect(getSearchHelpText('author:Test some mod')).toBeNull();
  });

  it('should suggest filters for single-word queries > 3 chars', () => {
    const result = getSearchHelpText('furniture');
    expect(result).toContain('author:');
  });

  it('should return null for multi-word queries without filters', () => {
    expect(getSearchHelpText('modern sofa set')).toBeNull();
  });

  it('should return null for short single-word queries', () => {
    expect(getSearchHelpText('mod')).toBeNull();
  });
});
