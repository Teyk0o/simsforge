/**
 * Unit tests for API client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

// Mock axios
vi.mock('axios', () => {
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
    },
  };
});

describe('apiClient', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('should create axios instance with correct baseURL', async () => {
    const { getApiClient } = await import('@/lib/apiClient');
    await getApiClient();

    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: expect.any(String),
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('should register request and response interceptors', async () => {
    const { getApiClient } = await import('@/lib/apiClient');
    const client = await getApiClient();

    expect(client.interceptors.request.use).toHaveBeenCalled();
    expect(client.interceptors.response.use).toHaveBeenCalled();
  });

  it('should reuse existing client on subsequent calls', async () => {
    const { getApiClient } = await import('@/lib/apiClient');
    const client1 = await getApiClient();
    const client2 = await getApiClient();

    expect(client1).toBe(client2);
    expect(axios.create).toHaveBeenCalledTimes(1);
  });

  it('apiGet should call client.get and return data', async () => {
    const { apiGet, getApiClient } = await import('@/lib/apiClient');
    const client = await getApiClient();
    (client.get as any).mockResolvedValue({ data: { result: 'test' } });

    const result = await apiGet('/test');
    expect(result).toEqual({ result: 'test' });
    expect(client.get).toHaveBeenCalledWith('/test', undefined);
  });

  it('apiPost should call client.post and return data', async () => {
    const { apiPost, getApiClient } = await import('@/lib/apiClient');
    const client = await getApiClient();
    (client.post as any).mockResolvedValue({ data: { created: true } });

    const result = await apiPost('/items', { name: 'test' });
    expect(result).toEqual({ created: true });
    expect(client.post).toHaveBeenCalledWith('/items', { name: 'test' }, undefined);
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
