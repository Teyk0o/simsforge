import { TransformedMod } from '@services/curseforge/CurseForgeProxyService';

/**
 * A mod with an additional search score property
 */
export interface ScoredMod extends TransformedMod {
  searchScore: number;
}

/**
 * Service for advanced search scoring of mods.
 * Provides relevance-based scoring to improve search results beyond
 * the basic CurseForge API search.
 */
export class AdvancedSearchService {
  /**
   * Scores mods based on relevance to the search query.
   * Higher scores indicate better matches.
   *
   * @param mods Array of mods to score
   * @param query The search query
   * @returns Mods with searchScore property added
   */
  searchAndScore(mods: TransformedMod[], query: string): ScoredMod[] {
    const normalizedQuery = this.normalizeText(query);
    const queryTerms = normalizedQuery.split(/\s+/).filter(term => term.length > 0);

    return mods.map(mod => {
      const score = this.calculateScore(mod, queryTerms);
      return { ...mod, searchScore: score };
    });
  }

  /**
   * Calculates the relevance score for a mod based on query terms.
   * @private
   */
  private calculateScore(mod: TransformedMod, queryTerms: string[]): number {
    let score = 0;
    const normalizedName = this.normalizeText(mod.name);
    const normalizedSummary = this.normalizeText(mod.summary);
    const normalizedCategories = mod.categories.map(c => this.normalizeText(c));

    for (const term of queryTerms) {
      // Exact name match (highest priority)
      if (normalizedName === term) {
        score += 100;
      }
      // Name starts with term
      else if (normalizedName.startsWith(term)) {
        score += 50;
      }
      // Name contains term
      else if (normalizedName.includes(term)) {
        score += 30;
      }

      // Summary contains term
      if (normalizedSummary.includes(term)) {
        score += 10;
      }

      // Category match
      if (normalizedCategories.some(cat => cat.includes(term))) {
        score += 15;
      }

      // Author name match
      if (mod.authors.some(a => this.normalizeText(a.name).includes(term))) {
        score += 20;
      }
    }

    // Bonus for popular mods (slight boost to trusted content)
    if (mod.downloadCount > 1000000) {
      score += 5;
    } else if (mod.downloadCount > 100000) {
      score += 3;
    } else if (mod.downloadCount > 10000) {
      score += 1;
    }

    return score;
  }

  /**
   * Normalizes text for comparison by converting to lowercase
   * and removing special characters.
   * @private
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
