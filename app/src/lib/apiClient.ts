import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

let apiClient: AxiosInstance | null = null;

/**
 * Create or get the API client instance
 */
export async function getApiClient(token?: string): Promise<AxiosInstance> {
  if (!apiClient) {
    apiClient = axios.create({
      baseURL: BACKEND_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add interceptor to include access token
    apiClient.interceptors.request.use(
      (config) => {
        // Try to get token from parameter or localStorage
        const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null);
        if (authToken) {
          config.headers.Authorization = `Bearer ${authToken}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add interceptor to handle 401 errors with automatic token refresh
    apiClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If 401 and haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Try to refresh the token
            const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('auth_refresh_token') : null;

            if (!refreshToken) {
              // No refresh token, redirect to login
              window.location.href = '/auth/login';
              return Promise.reject(error);
            }

            // Import here to avoid circular dependency
            const { refreshAccessToken } = await import('./curseforgeApi');
            const newAccessToken = await refreshAccessToken(refreshToken);

            // Update localStorage and cookies
            localStorage.setItem('auth_token', newAccessToken);
            const maxAge = 30 * 24 * 60 * 60;
            if (typeof document !== 'undefined') {
              document.cookie = `auth_token=${newAccessToken}; path=/; max-age=${maxAge}; SameSite=Lax`;
            }

            // Update authorization header
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

            // Retry original request with new token
            if (!apiClient) {
              return Promise.reject(new Error('API client not initialized'));
            }
            return apiClient.request(originalRequest);
          } catch (refreshError) {
            // Refresh failed, redirect to login
            window.location.href = '/auth/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  return apiClient;
}

/**
 * Make a GET request
 */
export async function apiGet<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const client = await getApiClient();
  const response = await client.get<T>(url, config);
  return response.data;
}

/**
 * Make a POST request
 */
export async function apiPost<T>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  const client = await getApiClient();
  const response = await client.post<T>(url, data, config);
  return response.data;
}

/**
 * Make a PATCH request
 */
export async function apiPatch<T>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  const client = await getApiClient();
  const response = await client.patch<T>(url, data, config);
  return response.data;
}

/**
 * Make a DELETE request
 */
export async function apiDelete<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const client = await getApiClient();
  const response = await client.delete<T>(url, config);
  return response.data;
}
