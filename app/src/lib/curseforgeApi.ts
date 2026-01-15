/**
 * CurseForge API client
 * Provides functions for interacting with the backend CurseForge proxy API
 */

import { apiGet, apiPost } from './apiClient';
import { CurseForgeSearchResult, CurseForgeMod } from '@/types/curseforge';

/**
 * Simple encryption/decryption helper using Web Crypto API
 */
const StorageHelper = {
  async encryptData(data: string, password: string = 'simsforge-settings'): Promise<string> {
    const encoder = new TextEncoder();
    const data_encoded = encoder.encode(data);
    const password_encoded = encoder.encode(password);

    const hash_buffer = await crypto.subtle.digest('SHA-256', password_encoded);
    const key = await crypto.subtle.importKey('raw', hash_buffer, 'AES-GCM', false, ['encrypt']);

    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      data_encoded
    );

    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    let binaryString = '';
    for (let i = 0; i < combined.length; i++) {
      binaryString += String.fromCharCode(combined[i]);
    }
    return btoa(binaryString);
  },

  async decryptData(encryptedData: string, password: string = 'simsforge-settings'): Promise<string | null> {
    try {
      const encoder = new TextEncoder();
      const password_encoded = encoder.encode(password);

      const hash_buffer = await crypto.subtle.digest('SHA-256', password_encoded);
      const key = await crypto.subtle.importKey('raw', hash_buffer, 'AES-GCM', false, ['decrypt']);

      const binaryString = atob(encryptedData);
      const combined = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        combined[i] = binaryString.charCodeAt(i);
      }

      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encrypted
      );
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      return null;
    }
  },

  setLocal(key: string, value: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    }
  },

  getLocal(key: string): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  },

  removeLocal(key: string): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  }
};

/**
 * Get the CurseForge API key from local storage and decrypt it
 * @returns The decrypted API key or null if not configured
 */
async function getCurseForgeApiKey(): Promise<string | null> {
  const encryptedKey = StorageHelper.getLocal('simsforge_api_key');
  if (!encryptedKey) {
    return null;
  }
  return StorageHelper.decryptData(encryptedKey);
}

/**
 * Parameters for searching mods on CurseForge
 */
export interface SearchModsParams {
  query?: string;
  pageSize?: number;
  pageIndex?: number;
  sortBy?: 'downloads' | 'date' | 'popularity' | 'relevance';
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
  const apiKey = await getCurseForgeApiKey();
  if (!apiKey) {
    throw new Error('CurseForge API key not configured. Please add your API key in Settings.');
  }

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

  const response = await apiGet<{ success: boolean; data: CurseForgeSearchResult }>(url, {
    headers: {
      'X-CurseForge-API-Key': apiKey
    }
  });
  return response.data;
}

/**
 * Get details of a specific mod
 * @param modId CurseForge mod ID
 * @returns Mod details
 * @throws Error if API key not configured or mod not found
 */
export async function getCurseForgeMod(modId: number): Promise<CurseForgeMod> {
  const apiKey = await getCurseForgeApiKey();
  if (!apiKey) {
    throw new Error('CurseForge API key not configured. Please add your API key in Settings.');
  }

  const response = await apiGet<{ success: boolean; data: CurseForgeMod }>(
    `/api/v1/curseforge/${modId}`,
    {
      headers: {
        'X-CurseForge-API-Key': apiKey
      }
    }
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
  const apiKey = await getCurseForgeApiKey();
  if (!apiKey) {
    throw new Error('CurseForge API key not configured. Please add your API key in Settings.');
  }

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
  }>('/api/v1/curseforge/download-url', { modId, fileId }, {
    headers: {
      'X-CurseForge-API-Key': apiKey
    }
  });
  return response.data;
}

/**
 * Get all available CurseForge categories for Sims 4 mods
 * @returns Array of categories
 * @throws Error if API key not configured or API call fails
 */
export async function getCurseForgeCategories(): Promise<Array<{ id: number; name: string }>> {
  const apiKey = await getCurseForgeApiKey();
  if (!apiKey) {
    throw new Error('CurseForge API key not configured. Please add your API key in Settings.');
  }

  const response = await apiGet<{ success: boolean; data: Array<{ id: number; name: string }> }>(
    '/api/v1/curseforge/categories',
    {
      headers: {
        'X-CurseForge-API-Key': apiKey
      }
    }
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
