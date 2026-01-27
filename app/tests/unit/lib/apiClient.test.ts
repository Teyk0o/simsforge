/**
 * Unit tests for API client
 * Tests client creation, interceptors, and HTTP helpers
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

// Capture interceptor callbacks
let requestInterceptor: Function;
let requestErrorInterceptor: Function;
let responseInterceptor: Function;
let responseErrorInterceptor: Function;

// Mock axios
vi.mock('axios', () => {
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    interceptors: {
      request: {
        use: vi.fn((onFulfilled, onRejected) => {
          requestInterceptor = onFulfilled;
          requestErrorInterceptor = onRejected;
        }),
      },
      response: {
        use: vi.fn((onFulfilled, onRejected) => {
          responseInterceptor = onFulfilled;
          responseErrorInterceptor = onRejected;
        }),
      },
    },
  };
  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
    },
  };
});

// Mock curseforgeApi for token refresh
vi.mock('@/lib/curseforgeApi', () => ({
  refreshAccessToken: vi.fn(),
}));

describe('apiClient', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    // Reset localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });
  });

  describe('getApiClient', () => {
    it('should create axios instance with correct config', async () => {
      const { getApiClient } = await import('@/lib/apiClient');
      await getApiClient();

      expect(axios.create).toHaveBeenCalledWith({
        baseURL: expect.any(String),
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should register request and response interceptors', async () => {
      const { getApiClient } = await import('@/lib/apiClient');
      const client = await getApiClient();

      expect(client.interceptors.request.use).toHaveBeenCalledTimes(1);
      expect(client.interceptors.response.use).toHaveBeenCalledTimes(1);
    });

    it('should reuse existing client on subsequent calls', async () => {
      const { getApiClient } = await import('@/lib/apiClient');
      await getApiClient();
      await getApiClient();

      expect(axios.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('request interceptor', () => {
    it('should add Authorization header when token is provided', async () => {
      const { getApiClient } = await import('@/lib/apiClient');
      await getApiClient('my-token');

      const config = { headers: {} as any };
      const result = requestInterceptor(config);

      expect(result.headers.Authorization).toBe('Bearer my-token');
    });

    it('should read token from localStorage when no token param', async () => {
      (localStorage.getItem as any).mockReturnValue('stored-token');

      const { getApiClient } = await import('@/lib/apiClient');
      await getApiClient();

      const config = { headers: {} as any };
      const result = requestInterceptor(config);

      expect(localStorage.getItem).toHaveBeenCalledWith('auth_token');
      expect(result.headers.Authorization).toBe('Bearer stored-token');
    });

    it('should not add Authorization header when no token available', async () => {
      (localStorage.getItem as any).mockReturnValue(null);

      const { getApiClient } = await import('@/lib/apiClient');
      await getApiClient();

      const config = { headers: {} as any };
      const result = requestInterceptor(config);

      expect(result.headers.Authorization).toBeUndefined();
    });

    it('should reject on request error', async () => {
      const { getApiClient } = await import('@/lib/apiClient');
      await getApiClient();

      const error = new Error('request failed');
      await expect(requestErrorInterceptor(error)).rejects.toThrow('request failed');
    });
  });

  describe('response interceptor', () => {
    it('should pass through successful responses', async () => {
      const { getApiClient } = await import('@/lib/apiClient');
      await getApiClient();

      const response = { status: 200, data: { ok: true } };
      expect(responseInterceptor(response)).toEqual(response);
    });

    it('should reject non-401 errors directly', async () => {
      const { getApiClient } = await import('@/lib/apiClient');
      await getApiClient();

      const error = {
        response: { status: 500 },
        config: { headers: {} },
      };

      await expect(responseErrorInterceptor(error)).rejects.toEqual(error);
    });

    it('should attempt token refresh on 401', async () => {
      (localStorage.getItem as any).mockReturnValue('refresh-token-value');

      const { refreshAccessToken } = await import('@/lib/curseforgeApi');
      (refreshAccessToken as any).mockResolvedValue('new-access-token');

      const { getApiClient } = await import('@/lib/apiClient');
      const client = await getApiClient();
      (client.request as any).mockResolvedValue({ data: 'retried' });

      const error = {
        response: { status: 401 },
        config: { headers: {}, _retry: false },
      };

      await responseErrorInterceptor(error);

      expect(refreshAccessToken).toHaveBeenCalledWith('refresh-token-value');
      expect(localStorage.setItem).toHaveBeenCalledWith('auth_token', 'new-access-token');
      expect(client.request).toHaveBeenCalled();
    });

    it('should redirect to login when no refresh token on 401', async () => {
      (localStorage.getItem as any).mockReturnValue(null);

      const { getApiClient } = await import('@/lib/apiClient');
      await getApiClient();

      // Mock window.location
      Object.defineProperty(globalThis, 'window', {
        value: { location: { href: '' } },
        writable: true,
      });

      const error = {
        response: { status: 401 },
        config: { headers: {}, _retry: false },
      };

      await expect(responseErrorInterceptor(error)).rejects.toEqual(error);
      expect(window.location.href).toBe('/auth/login');
    });

    it('should redirect to login when token refresh fails', async () => {
      (localStorage.getItem as any).mockReturnValue('refresh-token');

      const { refreshAccessToken } = await import('@/lib/curseforgeApi');
      (refreshAccessToken as any).mockRejectedValue(new Error('refresh failed'));

      const { getApiClient } = await import('@/lib/apiClient');
      await getApiClient();

      Object.defineProperty(globalThis, 'window', {
        value: { location: { href: '' } },
        writable: true,
      });

      const error = {
        response: { status: 401 },
        config: { headers: {}, _retry: false },
      };

      await expect(responseErrorInterceptor(error)).rejects.toThrow('refresh failed');
      expect(window.location.href).toBe('/auth/login');
    });

    it('should not retry if already retried', async () => {
      const { getApiClient } = await import('@/lib/apiClient');
      await getApiClient();

      const error = {
        response: { status: 401 },
        config: { headers: {}, _retry: true },
      };

      await expect(responseErrorInterceptor(error)).rejects.toEqual(error);
    });

    it('should set cookie after successful token refresh', async () => {
      (localStorage.getItem as any).mockReturnValue('refresh-token');

      const { refreshAccessToken } = await import('@/lib/curseforgeApi');
      (refreshAccessToken as any).mockResolvedValue('fresh-token');

      const { getApiClient } = await import('@/lib/apiClient');
      const client = await getApiClient();
      (client.request as any).mockResolvedValue({ data: 'ok' });

      Object.defineProperty(globalThis, 'document', {
        value: { cookie: '' },
        writable: true,
        configurable: true,
      });

      const error = {
        response: { status: 401 },
        config: { headers: {}, _retry: false },
      };

      await responseErrorInterceptor(error);

      expect(document.cookie).toContain('auth_token=fresh-token');
    });
  });

  describe('HTTP helpers', () => {
    it('apiGet should call client.get and return data', async () => {
      const { apiGet, getApiClient } = await import('@/lib/apiClient');
      const client = await getApiClient();
      (client.get as any).mockResolvedValue({ data: { result: 'test' } });

      const result = await apiGet('/test');
      expect(result).toEqual({ result: 'test' });
    });

    it('apiPost should call client.post and return data', async () => {
      const { apiPost, getApiClient } = await import('@/lib/apiClient');
      const client = await getApiClient();
      (client.post as any).mockResolvedValue({ data: { created: true } });

      const result = await apiPost('/items', { name: 'test' });
      expect(result).toEqual({ created: true });
    });

    it('apiPatch should call client.patch and return data', async () => {
      const { apiPatch, getApiClient } = await import('@/lib/apiClient');
      const client = await getApiClient();
      (client.patch as any).mockResolvedValue({ data: { updated: true } });

      const result = await apiPatch('/items/1', { name: 'updated' });
      expect(result).toEqual({ updated: true });
    });

    it('apiDelete should call client.delete and return data', async () => {
      const { apiDelete, getApiClient } = await import('@/lib/apiClient');
      const client = await getApiClient();
      (client.delete as any).mockResolvedValue({ data: { deleted: true } });

      const result = await apiDelete('/items/1');
      expect(result).toEqual({ deleted: true });
    });
  });
});
