/**
 * Advanced Search Service with Fuzzy Matching
 *
 * Provides intelligent search scoring and ranking using fuse.js
 * Handles multi-field search with weighted scoring
 */

import Fuse from 'fuse.js';
import { TransformedMod } from '@services/curseforge/CurseForgeProxyService';
import { parseQuery, ParsedQuery } from '@utils/search/queryParser';
import { normalizeText } from '@utils/search/textNormalizer';

/**
 * Scored search result with relevance score
 */
export interface ScoredMod extends TransformedMod {
  /** Relevance score (0-100, higher is better) */
  searchScore: number;
  /** Match details for debugging */
  matchInfo?: {
    nameMatch: boolean;
    authorMatch: boolean;
    categoryMatch: boolean;
    descriptionMatch: boolean;
    fuzzyMatch: boolean;
  };
}

/**
 * Search configuration for weighted scoring
 */
interface SearchConfig {
  /** Weight for mod name matches (default: 10) */
  nameWeight: number;
  /** Weight for author matches (default: 8) */
  authorWeight: number;
  /** Weight for category matches (default: 6) */
  categoryWeight: number;
  /** Weight for description matches (default: 3) */
  descriptionWeight: number;
  /** Fuzzy match threshold (0-1, lower is more strict) */
  threshold: number;
  /** Maximum typo distance allowed */
  distance: number;
}

const DEFAULT_CONFIG: SearchConfig = {
  nameWeight: 10,
  authorWeight: 8,
  categoryWeight: 6,
  descriptionWeight: 3,
  threshold: 0.4, // Allows some typos but not too lenient
  distance: 100, // Character distance for fuzzy matching
};

/**
 * Advanced Search Service
 * Provides fuzzy search with multi-field weighted scoring
 */
export class AdvancedSearchService {
  private config: SearchConfig;

  constructor(config: Partial<SearchConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Score and rank mods based on search query
   *
   * @param mods - Array of mods to search through
   * @param query - Search query (supports filters like author:, category:)
   * @returns Scored and sorted mods (highest score first)
   */
  public searchAndScore(mods: TransformedMod[], query: string): ScoredMod[] {
    if (!query || query.trim().length === 0) {
      // No query - return all mods with neutral score
      return mods.map(mod => ({
        ...mod,
        searchScore: 50,
      }));
    }

    // Parse query to extract filters
    const parsed = parseQuery(query);

    // Score each mod
    const scoredMods = mods.map(mod => this.scoreMod(mod, parsed));

    // Sort by score (descending)
    return scoredMods.sort((a, b) => b.searchScore - a.searchScore);
  }

  /**
   * Score a single mod against parsed query
   *
   * @param mod - Mod to score
   * @param parsed - Parsed query with filters
   * @returns Scored mod with match information
   */
  private scoreMod(mod: TransformedMod, parsed: ParsedQuery): ScoredMod {
    let score = 0;
    const matchInfo = {
      nameMatch: false,
      authorMatch: false,
      categoryMatch: false,
      descriptionMatch: false,
      fuzzyMatch: false,
    };

    // Filter: Author match (must match if specified)
    if (parsed.author) {
      const authorMatch = this.matchAuthor(mod, parsed.author);
      if (!authorMatch) {
        // Author filter specified but doesn't match - very low score
        return { ...mod, searchScore: 0, matchInfo };
      }
      matchInfo.authorMatch = true;
      score += this.config.authorWeight * 10; // Boost for exact filter match
    }

    // Filter: Category match (must match if specified)
    if (parsed.category) {
      const categoryMatch = this.matchCategory(mod, parsed.category);
      if (!categoryMatch) {
        // Category filter specified but doesn't match - very low score
        return { ...mod, searchScore: 0, matchInfo };
      }
      matchInfo.categoryMatch = true;
      score += this.config.categoryWeight * 10; // Boost for exact filter match
    }

    // Text search (if present)
    if (parsed.text && parsed.text.length > 0) {
      // 1. Exact name match (highest priority)
      if (this.isExactMatch(mod.name, parsed.text)) {
        matchInfo.nameMatch = true;
        score += this.config.nameWeight * 10;
      }
      // 2. Partial name match
      else if (this.isPartialMatch(mod.name, parsed.text)) {
        matchInfo.nameMatch = true;
        score += this.config.nameWeight * 5;
      }
      // 3. Fuzzy name match
      else if (this.isFuzzyMatch(mod.name, parsed.text)) {
        matchInfo.nameMatch = true;
        matchInfo.fuzzyMatch = true;
        score += this.config.nameWeight * 3;
      }

      // 4. Author name match (if not already filtered)
      if (!parsed.author && this.matchAuthorText(mod, parsed.text)) {
        matchInfo.authorMatch = true;
        score += this.config.authorWeight * 5;
      }

      // 5. Category match (if not already filtered)
      if (!parsed.category && this.matchCategoryText(mod, parsed.text)) {
        matchInfo.categoryMatch = true;
        score += this.config.categoryWeight * 5;
      }

      // 6. Description/summary match
      if (this.isPartialMatch(mod.summary, parsed.text) || this.isPartialMatch(mod.description, parsed.text)) {
        matchInfo.descriptionMatch = true;
        score += this.config.descriptionWeight * 3;
      }

      // 7. Fuzzy match in description
      if (this.isFuzzyMatch(mod.summary, parsed.text) || this.isFuzzyMatch(mod.description, parsed.text)) {
        matchInfo.descriptionMatch = true;
        matchInfo.fuzzyMatch = true;
        score += this.config.descriptionWeight * 1;
      }
    }

    // Normalize score to 0-100 range
    const normalizedScore = Math.min(100, Math.max(0, score));

    return {
      ...mod,
      searchScore: normalizedScore,
      matchInfo,
    };
  }

  /**
   * Check if author matches the filter
   */
  private matchAuthor(mod: TransformedMod, authorFilter: string): boolean {
    const normalizedFilter = normalizeText(authorFilter);
    return mod.authors.some(author =>
      normalizeText(author.name).includes(normalizedFilter)
    );
  }

  /**
   * Check if category matches the filter
   */
  private matchCategory(mod: TransformedMod, categoryFilter: string): boolean {
    const normalizedFilter = normalizeText(categoryFilter);
    return mod.categories.some(category =>
      normalizeText(category).includes(normalizedFilter)
    );
  }

  /**
   * Check if any author matches the text query
   */
  private matchAuthorText(mod: TransformedMod, text: string): boolean {
    const normalizedText = normalizeText(text);
    return mod.authors.some(author =>
      normalizeText(author.name).includes(normalizedText)
    );
  }

  /**
   * Check if any category matches the text query
   */
  private matchCategoryText(mod: TransformedMod, text: string): boolean {
    const normalizedText = normalizeText(text);
    return mod.categories.some(category =>
      normalizeText(category).includes(normalizedText)
    );
  }

  /**
   * Check for exact match (after normalization)
   */
  private isExactMatch(target: string, query: string): boolean {
    return normalizeText(target) === normalizeText(query);
  }

  /**
   * Check for partial match (substring)
   */
  private isPartialMatch(target: string, query: string): boolean {
    const normalizedTarget = normalizeText(target);
    const normalizedQuery = normalizeText(query);
    return normalizedTarget.includes(normalizedQuery);
  }

  /**
   * Check for fuzzy match using fuse.js
   * Allows typos and minor variations
   */
  private isFuzzyMatch(target: string, query: string): boolean {
    if (!target || !query) return false;

    const fuse = new Fuse([normalizeText(target)], {
      threshold: this.config.threshold,
      distance: this.config.distance,
      includeScore: true,
    });

    const result = fuse.search(normalizeText(query));
    return result.length > 0;
  }

  /**
   * Create a searchable index for mods (for future caching)
   * This can be used to build a pre-computed search index
   */
  public createSearchIndex(mods: TransformedMod[]): Fuse<TransformedMod> {
    return new Fuse(mods, {
      keys: [
        { name: 'name', weight: this.config.nameWeight },
        { name: 'authors.name', weight: this.config.authorWeight },
        { name: 'categories', weight: this.config.categoryWeight },
        { name: 'summary', weight: this.config.descriptionWeight },
        { name: 'description', weight: this.config.descriptionWeight },
      ],
      threshold: this.config.threshold,
      distance: this.config.distance,
      includeScore: true,
      useExtendedSearch: true,
      ignoreLocation: true, // Don't prioritize matches at the beginning
    });
  }

  /**
   * Search using pre-built Fuse index
   * Faster for large datasets with repeated searches
   */
  public searchWithIndex(index: Fuse<TransformedMod>, query: string): ScoredMod[] {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const parsed = parseQuery(query);
    const results = index.search(parsed.text);

    return results.map(result => ({
      ...result.item,
      searchScore: result.score ? Math.round((1 - result.score) * 100) : 0,
    }));
  }
}
