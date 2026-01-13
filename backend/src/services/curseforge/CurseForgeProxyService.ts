import { CurseForgeClient, CurseForgeGameEnum, CurseForgeModsSearchSortField, CurseForgeSortOrder } from 'curseforge-api';
import { userApiKeyRepository } from '@repositories/UserApiKeyRepository';
import { cacheManager } from '@services/cache/CacheManager';
import { AdvancedSearchService } from '@services/search/AdvancedSearchService';

/**
 * Options for searching mods on CurseForge
 */
export interface SearchModsOptions {
  userId: number;
  query?: string;
  pageSize?: number;
  pageIndex?: number;
  sortBy?: 'downloads' | 'date' | 'popularity' | 'relevance';
  categoryName?: string;
}

/**
 * Transformed mod data from CurseForge API
 */
export interface TransformedMod {
  id: number;
  name: string;
  slug: string;
  summary: string;
  description: string;
  downloadCount: number;
  dateModified: string;
  dateCreated: string;
  logo: string | null;
  screenshots: string[];
  authors: Array<{ name: string; id: number }>;
  categories: string[];
  websiteUrl: string | null;
  latestFiles: TransformedFile[];
}

/**
 * Transformed file data from CurseForge API
 */
export interface TransformedFile {
  id: number;
  displayName: string;
  fileName: string;
  fileDate: string;
  fileLength: number;
  downloadUrl: string;
  gameVersions: string[];
}

/**
 * Search result with pagination info
 */
export interface CurseForgeSearchResult {
  mods: TransformedMod[];
  pagination: {
    index: number;
    pageSize: number;
    resultCount: number;
    totalCount: number;
  };
}

/**
 * Proxy service for CurseForge API
 * Handles authentication, caching, and data transformation
 *
 * @note The user's API key is retrieved from encrypted storage and used per-request
 * @note Results are cached for 10 minutes to optimize API usage
 */
export class CurseForgeProxyService {
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  private readonly SIMS4_GAME_ID = CurseForgeGameEnum.TheSims4; // 78062
  private readonly advancedSearch = new AdvancedSearchService();

  /**
   * Searches for mods on CurseForge with advanced search scoring
   * @param options Search options including user ID, query, pagination, and sort
   * @returns Transformed mods with pagination info
   * @throws Error if API key not configured or API call fails
   *
   * @note When a text query is provided, this method fetches more results from CurseForge
   *       (up to 150 mods) and applies advanced scoring to prioritize search relevance
   *       over the original sort order. The user's sort preference is used as a secondary
   *       sort criterion for mods with equal search scores.
   */
  async searchMods(options: SearchModsOptions): Promise<CurseForgeSearchResult> {
    const { userId, query, pageSize = 50, pageIndex = 0, sortBy = 'downloads', categoryName } = options;

    // Retrieve user's encrypted API key
    const apiKey = await userApiKeyRepository.findByUserAndService(userId, 'curseforge');

    if (!apiKey) {
      throw new Error('CurseForge API key not configured. Please add your API key in Settings.');
    }

    // Generate cache key based on search parameters
    const cacheKey = `curseforge:search:${userId}:${query || 'all'}:${pageSize}:${pageIndex}:${sortBy}:${categoryName || 'all'}`;

    // Check cache first
    const cached = cacheManager.get<CurseForgeSearchResult>(cacheKey);
    if (cached) {
      return cached;
    }

    // Create CurseForge client with user's API key
    const client = new CurseForgeClient(apiKey);

    // Convert sort parameter to CurseForge enum
    const sortField = this.getSortField(sortBy);

    // Convert category name to ID if provided
    let categoryId: number | undefined;
    if (categoryName) {
      categoryId = await this.getCategoryIdByName(userId, categoryName);
    }

    // Determine fetch strategy based on whether we have a text query
    const hasTextQuery = query && query.trim().length > 0;

    // When text search is active, fetch more results for better scoring
    // Otherwise, use standard pagination
    const fetchSize = hasTextQuery ? 150 : Math.min(pageSize, 50);
    const offset = hasTextQuery ? 0 : pageIndex * pageSize;

    const searchParams: any = {
      pageSize: Math.min(fetchSize, 50), // CurseForge API max is 50
      index: offset,
      sortField,
      sortOrder: CurseForgeSortOrder.Descending
    };

    // Only add searchFilter if provided
    if (query) {
      searchParams.searchFilter = query;
    }

    // Only add categoryId if it exists
    if (categoryId !== undefined) {
      searchParams.categoryId = categoryId;
    }

    // Fetch first batch
    let result = await client.searchMods(this.SIMS4_GAME_ID, searchParams);
    let allMods = result.data.map(mod => this.transformMod(mod));

    // Keep track of total count from CurseForge API for pagination
    let totalCountFromAPI = result.pagination.totalCount;

    // If we need more mods for advanced search, fetch additional pages
    if (hasTextQuery && fetchSize > 50) {
      const additionalFetches = Math.ceil((fetchSize - 50) / 50);
      const fetchPromises = [];

      for (let i = 1; i <= additionalFetches; i++) {
        const params = {
          ...searchParams,
          index: i * 50,
        };
        fetchPromises.push(client.searchMods(this.SIMS4_GAME_ID, params));
      }

      const additionalResults = await Promise.all(fetchPromises);
      additionalResults.forEach(res => {
        allMods.push(...res.data.map(mod => this.transformMod(mod)));
      });
    }

    // Apply advanced search scoring if we have a text query
    let finalMods = allMods;
    if (hasTextQuery) {
      const scoredMods = this.advancedSearch.searchAndScore(allMods, query);

      // Sort by search score (primary), then by user's sort preference (secondary)
      // UNLESS sortBy is 'relevance', in which case only use search score
      finalMods = scoredMods.sort((a, b) => {
        // Primary sort: search score (descending)
        if (b.searchScore !== a.searchScore) {
          return b.searchScore - a.searchScore;
        }

        // If sortBy is 'relevance', don't apply secondary sort
        if (sortBy === 'relevance') {
          return 0;
        }

        // Secondary sort: user's preference (for other sort options)
        switch (sortBy) {
          case 'downloads':
            return b.downloadCount - a.downloadCount;
          case 'date':
            return new Date(b.dateModified).getTime() - new Date(a.dateModified).getTime();
          case 'popularity':
            return b.downloadCount - a.downloadCount; // Popularity ≈ downloads
          default:
            return 0;
        }
      });
    }

    // Apply pagination to final results
    // Note: When there's no text query, pagination is already handled by the API offset
    // Only apply client-side pagination when we have a text query (advanced search)
    let paginatedMods = finalMods;
    if (hasTextQuery) {
      const startIndex = pageIndex * pageSize;
      const endIndex = startIndex + pageSize;
      paginatedMods = finalMods.slice(startIndex, endIndex);
    }

    // Use API's totalCount for non-text queries, use finalMods.length for text queries (advanced search)
    const finalTotalCount = hasTextQuery ? finalMods.length : totalCountFromAPI;

    const transformed: CurseForgeSearchResult = {
      mods: paginatedMods,
      pagination: {
        index: pageIndex,
        pageSize: pageSize,
        resultCount: paginatedMods.length,
        totalCount: finalTotalCount
      }
    };

    // Cache the results
    cacheManager.set(cacheKey, transformed, this.CACHE_TTL);

    return transformed;
  }

  /**
   * Converts a category name to its corresponding category ID
   * @param userId User ID (for API key retrieval)
   * @param categoryName The name of the category (e.g., "Teen", "Clothing")
   * @returns The category ID, or undefined if not found
   * @private
   */
  private async getCategoryIdByName(userId: number, categoryName: string): Promise<number | undefined> {
    const categories = await this.getCategories(userId);
    const category = categories.find(cat => cat.name.toLowerCase() === categoryName.toLowerCase());
    return category?.id;
  }

  /**
   * Gets details of a specific mod
   * @param userId User ID (for API key retrieval)
   * @param modId CurseForge mod ID
   * @returns Transformed mod details
   * @throws Error if API key not configured or mod not found
   */
  async getMod(userId: number, modId: number): Promise<TransformedMod> {
    const apiKey = await userApiKeyRepository.findByUserAndService(userId, 'curseforge');

    if (!apiKey) {
      throw new Error('CurseForge API key not configured');
    }

    // Check cache
    const cacheKey = `curseforge:mod:${modId}`;
    const cached = cacheManager.get<TransformedMod>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from API
    const client = new CurseForgeClient(apiKey);
    const mod = await client.getMod(modId);

    // Also fetch detailed info to get the full description
    try {
      const response = await fetch(`https://api.curseforge.com/v1/mods/${modId}`, {
        headers: {
          'X-API-Key': apiKey,
        },
      });
      if (response.ok) {
        const data = await response.json() as any;
        if (data.data?.description) {
          (mod as any).description = data.data.description;
        }
      }
    } catch (error) {
      // Silently fail if full description fetch fails
    }

    const transformed = this.transformMod(mod);

    // Cache result
    cacheManager.set(cacheKey, transformed, this.CACHE_TTL);

    return transformed;
  }

  /**
   * Converts sort parameter to CurseForge API enum
   * @private
   */
  private getSortField(sortBy: string): CurseForgeModsSearchSortField {
    switch (sortBy) {
      case 'downloads':
        return CurseForgeModsSearchSortField.TotalDownloads;
      case 'date':
        return CurseForgeModsSearchSortField.LastUpdated;
      case 'popularity':
        return CurseForgeModsSearchSortField.Popularity;
      case 'relevance':
        // When no text query, relevance fallback to popularity
        return CurseForgeModsSearchSortField.Popularity;
      default:
        return CurseForgeModsSearchSortField.TotalDownloads;
    }
  }

  /**
   * Gets all available categories for Sims 4 mods from CurseForge
   * @param userId User ID (for API key retrieval)
   * @returns Array of categories
   * @throws Error if API key not configured or API call fails
   */
  async getCategories(userId: number): Promise<Array<{ id: number; name: string }>> {
    const apiKey = await userApiKeyRepository.findByUserAndService(userId, 'curseforge');

    if (!apiKey) {
      throw new Error('CurseForge API key not configured');
    }

    // Check cache
    const cacheKey = 'curseforge:categories:sims4';
    const cached = cacheManager.get<Array<{ id: number; name: string }>>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch categories from API
    const client = new CurseForgeClient(apiKey);
    const categoriesResponse = await client.getCategories(this.SIMS4_GAME_ID);

    // Transform to our format (id and name only)
    const categories = categoriesResponse.map((cat: any) => ({
      id: cat.id,
      name: cat.name
    }));

    // Cache the results for 1 hour (categories don't change often)
    cacheManager.set(cacheKey, categories, 60 * 60 * 1000);

    return categories;
  }

  /**
   * Transforms CurseForge mod data to our internal format
   * @private
   */
  private transformMod(mod: any): TransformedMod {
    return {
      id: mod.id,
      name: mod.name,
      slug: mod.slug,
      summary: mod.summary,
      description: mod.description || mod.links?.sourceUrl || '',
      downloadCount: mod.downloadCount || 0,
      dateModified: mod.dateModified ? new Date(mod.dateModified).toISOString() : new Date().toISOString(),
      dateCreated: mod.dateCreated ? new Date(mod.dateCreated).toISOString() : new Date().toISOString(),
      logo: mod.logo?.url || null,
      screenshots: mod.screenshots?.map((s: any) => s.url) || [],
      authors: mod.authors?.map((a: any) => ({
        name: a.name,
        id: a.id
      })) || [],
      categories: mod.categories?.map((c: any) => c.name) || [],
      websiteUrl: mod.links?.websiteUrl || null,
      latestFiles: mod.latestFiles?.map((f: any) => ({
        id: f.id,
        displayName: f.displayName,
        fileName: f.fileName,
        fileDate: f.fileDate ? new Date(f.fileDate).toISOString() : new Date().toISOString(),
        fileLength: f.fileLength || 0,
        downloadUrl: f.downloadUrl || '',
        gameVersions: f.gameVersions || []
      })) || []
    };
  }
}

export const curseForgeProxyService = new CurseForgeProxyService();
