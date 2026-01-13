/**
 * CurseForge API client
 * Provides functions for interacting with the backend CurseForge proxy API
 */

import { apiGet, apiPost, apiDelete } from './apiClient';
import { CurseForgeSearchResult, CurseForgeMod } from '@/types/curseforge';

/**
 * Parameters for searching mods on CurseForge
 */
export interface SearchModsParams {
  query?: string;
  pageSize?: number;
  pageIndex?: number;
  sortBy?: 'downloads' | 'date' | 'popularity';
  categoryName?: string;
}

/**
 * Search for mods on CurseForge
 * @param params Search parameters
 * @returns Search results with pagination
 * @throws Error if API key not configured or API call fails
 */
export async function searchCurseForgeMods(
  params: SearchModsParams
): Promise<CurseForgeSearchResult> {
  const queryParams = new URLSearchParams();

  // Always include query param (can be empty string for browsing all mods)
  queryParams.append('query', params.query || '');

  if (params.pageSize) {
    queryParams.append('pageSize', params.pageSize.toString());
  }
  if (params.pageIndex !== undefined) {
    queryParams.append('pageIndex', params.pageIndex.toString());
  }
  if (params.sortBy) {
    queryParams.append('sortBy', params.sortBy);
  }
  if (params.categoryName) {
    queryParams.append('categoryName', params.categoryName);
  }

  const queryString = queryParams.toString();
  const url = `/api/v1/curseforge/search?${queryString}`;

  const response = await apiGet<{ success: boolean; data: CurseForgeSearchResult }>(url);
  return response.data;
}

/**
 * Get details of a specific mod
 * @param modId CurseForge mod ID
 * @returns Mod details
 * @throws Error if API key not configured or mod not found
 */
export async function getCurseForgeMod(modId: number): Promise<CurseForgeMod> {
  const response = await apiGet<{ success: boolean; data: CurseForgeMod }>(
    `/api/v1/curseforge/${modId}`
  );
  return response.data;
}

/**
 * Save or update a CurseForge API key
 * @param apiKey The API key to save
 * @throws Error if API call fails
 */
export async function saveCurseForgeApiKey(apiKey: string): Promise<void> {
  await apiPost('/api/v1/settings/api-keys', {
    serviceName: 'curseforge',
    apiKey
  });
}

/**
 * Get list of configured API key services for current user
 * @returns List of service names that have API keys configured
 * @throws Error if API call fails
 */
export async function getConfiguredServices(): Promise<{ services: string[] }> {
  const response = await apiGet<{ success: boolean; data: { services: string[] } }>(
    '/api/v1/settings/api-keys'
  );
  return response.data;
}

/**
 * Get download URL for a mod file from CurseForge
 * @param modId CurseForge mod ID
 * @param fileId Optional: specific file version to download
 * @returns Download URL and file info
 * @throws Error if API key not configured or file not found
 */
export async function getModDownloadUrl(modId: number, fileId?: number): Promise<{
  modId: number;
  modName: string;
  fileId: number;
  fileName: string;
  downloadUrl: string;
  fileSize: number;
}> {
  const response = await apiPost<{
    success: boolean;
    data: {
      modId: number;
      modName: string;
      fileId: number;
      fileName: string;
      downloadUrl: string;
      fileSize: number;
    };
  }>('/api/v1/curseforge/download-url', { modId, fileId });
  return response.data;
}

/**
 * Delete a stored API key
 * @param serviceName Service name (e.g., 'curseforge')
 * @throws Error if API call fails or key not found
 */
export async function deleteApiKey(serviceName: string): Promise<void> {
  await apiDelete(`/api/v1/settings/api-keys/${serviceName}`);
}

/**
 * Get all available CurseForge categories for Sims 4 mods
 * @returns Array of categories
 * @throws Error if API key not configured or API call fails
 */
export async function getCurseForgeCategories(): Promise<Array<{ id: number; name: string }>> {
  const response = await apiGet<{ success: boolean; data: Array<{ id: number; name: string }> }>(
    '/api/v1/curseforge/categories'
  );
  return response.data;
}

/**
 * Refresh access token using refresh token
 * @param refreshToken The refresh token
 * @returns New access token
 * @throws Error if refresh fails
 */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/refresh`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to refresh access token: ${response.status}`);
  }

  try {
    const data = await response.json();
    return data.data.accessToken;
  } catch (error) {
    throw new Error('Failed to parse token refresh response');
  }
}
