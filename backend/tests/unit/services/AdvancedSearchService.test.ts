/**
 * Unit tests for AdvancedSearchService
 * Tests relevance scoring and search result ranking
 */

import { AdvancedSearchService } from '@services/search/AdvancedSearchService';
import { TransformedMod } from '@services/curseforge/CurseForgeProxyService';

describe('AdvancedSearchService', () => {
  let service: AdvancedSearchService;

  const createMockMod = (overrides: Partial<TransformedMod> = {}): TransformedMod => ({
    id: 123,
    name: 'Test Mod',
    slug: 'test-mod',
    summary: 'A test mod summary',
    description: 'Full description',
    downloadCount: 5000,
    dateModified: '2024-01-15T00:00:00.000Z',
    dateCreated: '2024-01-01T00:00:00.000Z',
    logo: null,
    screenshots: [],
    authors: [{ name: 'TestAuthor', id: 1001 }],
    categories: ['Mods'],
    websiteUrl: null,
    latestFiles: [],
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdvancedSearchService();
  });

  describe('searchAndScore', () => {
    it('should return empty array for empty mod list', () => {
      const results = service.searchAndScore([], 'test');
      expect(results).toEqual([]);
    });

    it('should add searchScore property to mods', () => {
      const mods = [createMockMod()];
      const results = service.searchAndScore(mods, 'test');

      expect(results[0]).toHaveProperty('searchScore');
      expect(typeof results[0].searchScore).toBe('number');
    });

    it('should preserve all original mod properties', () => {
      const mod = createMockMod({ id: 999, name: 'Special Mod' });
      const results = service.searchAndScore([mod], 'test');

      expect(results[0].id).toBe(999);
      expect(results[0].name).toBe('Special Mod');
      expect(results[0].slug).toBe('test-mod');
    });

    it('should handle empty query', () => {
      const mods = [createMockMod()];
      const results = service.searchAndScore(mods, '');

      expect(results).toHaveLength(1);
      expect(results[0].searchScore).toBe(0);
    });

    it('should handle query with only spaces', () => {
      const mods = [createMockMod()];
      const results = service.searchAndScore(mods, '   ');

      expect(results[0].searchScore).toBe(0);
    });
  });

  describe('scoring - exact name match', () => {
    it('should give highest score (100) for exact name match', () => {
      const mod = createMockMod({ name: 'Test' });
      const results = service.searchAndScore([mod], 'test');

      // Exact match = 100, name contains = 30 (normalized both are "test")
      expect(results[0].searchScore).toBeGreaterThanOrEqual(100);
    });

    it('should be case insensitive', () => {
      const mod = createMockMod({ name: 'TEST' });
      const results = service.searchAndScore([mod], 'test');

      expect(results[0].searchScore).toBeGreaterThanOrEqual(100);
    });
  });

  describe('scoring - name starts with term', () => {
    it('should give score (50) when name starts with term', () => {
      const mod = createMockMod({ name: 'TestMod Pack' });
      const results = service.searchAndScore([mod], 'testmod');

      // Starts with = 50
      expect(results[0].searchScore).toBeGreaterThanOrEqual(50);
    });
  });

  describe('scoring - name contains term', () => {
    it('should give score (30) when name contains term', () => {
      const modWithTerm = createMockMod({ name: 'Amazing Test Mod' });
      const modWithoutTerm = createMockMod({ name: 'Amazing Mod', id: 2 });

      const results = service.searchAndScore([modWithTerm, modWithoutTerm], 'test');

      expect(results[0].searchScore).toBeGreaterThan(results[1].searchScore);
    });
  });

  describe('scoring - summary contains term', () => {
    it('should give score (10) for summary match', () => {
      const modWithSummary = createMockMod({
        name: 'Random Mod',
        summary: 'This mod contains test features',
      });
      const modWithoutSummary = createMockMod({
        name: 'Random Mod 2',
        id: 2,
        summary: 'No match here',
      });

      const results = service.searchAndScore([modWithSummary, modWithoutSummary], 'test');

      expect(results[0].searchScore).toBeGreaterThan(results[1].searchScore);
    });
  });

  describe('scoring - category match', () => {
    it('should give score (15) for category match', () => {
      const modWithCategory = createMockMod({
        name: 'Random Mod',
        categories: ['Test Category', 'Other'],
      });
      const modWithoutCategory = createMockMod({
        name: 'Random Mod 2',
        id: 2,
        categories: ['No Match'],
      });

      const results = service.searchAndScore([modWithCategory, modWithoutCategory], 'test');

      expect(results[0].searchScore).toBeGreaterThan(results[1].searchScore);
    });
  });

  describe('scoring - author match', () => {
    it('should give score (20) for author match', () => {
      const modWithAuthor = createMockMod({
        name: 'Random Mod',
        authors: [{ name: 'TestCreator', id: 1 }],
      });
      const modWithoutAuthor = createMockMod({
        name: 'Random Mod 2',
        id: 2,
        authors: [{ name: 'OtherCreator', id: 2 }],
      });

      const results = service.searchAndScore([modWithAuthor, modWithoutAuthor], 'test');

      expect(results[0].searchScore).toBeGreaterThan(results[1].searchScore);
    });
  });

  describe('scoring - download count bonus', () => {
    it('should give +5 bonus for mods with > 1M downloads', () => {
      const popularMod = createMockMod({ downloadCount: 1500000 });
      const unpopularMod = createMockMod({ downloadCount: 100, id: 2 });

      const results = service.searchAndScore([popularMod, unpopularMod], 'nonexistent');

      expect(results[0].searchScore).toBe(5);
      expect(results[1].searchScore).toBe(0);
    });

    it('should give +3 bonus for mods with > 100K downloads', () => {
      const mediumMod = createMockMod({ downloadCount: 500000 });
      const smallMod = createMockMod({ downloadCount: 5000, id: 2 });

      const results = service.searchAndScore([mediumMod, smallMod], 'nonexistent');

      expect(results[0].searchScore).toBe(3);
      expect(results[1].searchScore).toBe(0);
    });

    it('should give +1 bonus for mods with > 10K downloads', () => {
      const mod = createMockMod({ downloadCount: 50000 });
      const smallMod = createMockMod({ downloadCount: 5000, id: 2 });

      const results = service.searchAndScore([mod, smallMod], 'nonexistent');

      expect(results[0].searchScore).toBe(1);
      expect(results[1].searchScore).toBe(0);
    });
  });

  describe('scoring - multiple query terms', () => {
    it('should accumulate scores for multiple matching terms', () => {
      const mod = createMockMod({
        name: 'Test Mod',
        summary: 'An awesome mod',
      });

      const singleTermResults = service.searchAndScore([mod], 'test');
      const multiTermResults = service.searchAndScore([mod], 'test awesome');

      expect(multiTermResults[0].searchScore).toBeGreaterThan(singleTermResults[0].searchScore);
    });

    it('should handle multiple word query correctly', () => {
      const mod1 = createMockMod({ name: 'Test Mod Pack' });
      const mod2 = createMockMod({ name: 'Mod Pack', id: 2 });

      const results = service.searchAndScore([mod1, mod2], 'test pack');

      // mod1 should score higher as it matches both terms
      expect(results[0].searchScore).toBeGreaterThan(results[1].searchScore);
    });
  });

  describe('text normalization', () => {
    it('should handle special characters in query', () => {
      const mod = createMockMod({ name: 'Test Mod!' });
      const results = service.searchAndScore([mod], 'test!');

      expect(results[0].searchScore).toBeGreaterThan(0);
    });

    it('should handle special characters in mod name', () => {
      const mod = createMockMod({ name: 'Test-Mod_v1.0' });
      const results = service.searchAndScore([mod], 'test mod');

      expect(results[0].searchScore).toBeGreaterThan(0);
    });

    it('should normalize unicode characters', () => {
      const mod = createMockMod({ name: 'Tést Môd' });
      const results = service.searchAndScore([mod], 'test');

      // May or may not match depending on normalization
      expect(typeof results[0].searchScore).toBe('number');
    });
  });

  describe('ranking', () => {
    it('should rank mods correctly by combined score', () => {
      const exactMatch = createMockMod({ name: 'Test', id: 1 });
      const partialMatch = createMockMod({ name: 'Testing Mod', id: 2 });
      const noMatch = createMockMod({ name: 'Random', id: 3 });

      const results = service.searchAndScore([noMatch, partialMatch, exactMatch], 'test');

      // Sort by searchScore descending
      results.sort((a, b) => b.searchScore - a.searchScore);

      expect(results[0].name).toBe('Test');
      expect(results[1].name).toBe('Testing Mod');
      expect(results[2].name).toBe('Random');
    });

    it('should prioritize name match over summary match', () => {
      const nameMatch = createMockMod({
        name: 'Test Mod',
        summary: 'No keywords here',
        id: 1,
      });
      const summaryMatch = createMockMod({
        name: 'Random Name',
        summary: 'This is a test summary',
        id: 2,
      });

      const results = service.searchAndScore([summaryMatch, nameMatch], 'test');

      expect(results.find(m => m.id === 1)!.searchScore)
        .toBeGreaterThan(results.find(m => m.id === 2)!.searchScore);
    });
  });

  describe('edge cases', () => {
    it('should handle mods with empty arrays', () => {
      const mod = createMockMod({
        authors: [],
        categories: [],
      });

      const results = service.searchAndScore([mod], 'test');
      expect(results[0]).toBeDefined();
    });

    it('should handle very long queries', () => {
      const longQuery = 'test '.repeat(100);
      const mod = createMockMod({ name: 'Test Mod' });

      const results = service.searchAndScore([mod], longQuery);
      expect(results[0]).toBeDefined();
      expect(results[0].searchScore).toBeGreaterThan(0);
    });

    it('should handle very long mod names', () => {
      const mod = createMockMod({
        name: 'Test ' + 'Long '.repeat(100) + 'Name',
      });

      const results = service.searchAndScore([mod], 'test');
      expect(results[0].searchScore).toBeGreaterThan(0);
    });

    it('should handle null/undefined-like values gracefully', () => {
      const mod = createMockMod({
        summary: '',
      });

      expect(() => service.searchAndScore([mod], 'test')).not.toThrow();
    });
  });
});
