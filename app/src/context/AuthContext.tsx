'use client';

import React, { createContext, useState, useCallback, useEffect } from 'react';

/**
 * Set auth token cookie for middleware access
 */
function setAuthCookie(token: string) {
  if (typeof document !== 'undefined') {
    // 30 days expiration
    const maxAge = 30 * 24 * 60 * 60;
    document.cookie = `auth_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }
}

/**
 * Clear auth token cookie
 */
function clearAuthCookie() {
  if (typeof document !== 'undefined') {
    document.cookie = 'auth_token=; path=/; max-age=0';
  }
}

/**
 * User session data
 */
export interface User {
  id: string;
  email: string;
  username: string;
  role: string;
}

/**
 * Auth context
 */
export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Initialize auth state synchronously from localStorage
 * Handles SSR/Client mismatch by returning empty state on server
 */
function initializeAuthState(): { user: User | null; token: string | null } {
  if (typeof window === 'undefined') {
    // SSR - return empty state
    return { user: null, token: null };
  }

  const storedToken = localStorage.getItem('auth_token');
  const storedUser = localStorage.getItem('auth_user');

  if (storedToken && storedUser) {
    try {
      return {
        token: storedToken,
        user: JSON.parse(storedUser),
      };
    } catch (error) {
      // Invalid stored user data, clear it
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_token');
      return { user: null, token: null };
    }
  }

  return { user: null, token: null };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialAuth = initializeAuthState();
  const [user, setUser] = useState<User | null>(initialAuth.user);
  const [token, setToken] = useState<string | null>(initialAuth.token);
  const [isLoading, setIsLoading] = useState(typeof window === 'undefined' ? false : true);

  /**
   * On client side, verify auth state from localStorage and mark as ready
   * This prevents hydration mismatch by ensuring consistent rendering
   */
  useEffect(() => {
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Login failed');
      }

      const data = await response.json();
      const accessToken = data.data.tokens.accessToken;
      const refreshToken = data.data.tokens.refreshToken;
      const userData: User = {
        id: data.data.user.id.toString(),
        email: data.data.user.email,
        username: data.data.user.username,
        role: data.data.user.role,
      };

      // Store in localStorage
      localStorage.setItem('auth_token', accessToken);
      localStorage.setItem('auth_refresh_token', refreshToken);
      localStorage.setItem('auth_user', JSON.stringify(userData));

      // Set auth cookie for middleware
      setAuthCookie(accessToken);

      setToken(accessToken);
      setUser(userData);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(
    async (email: string, password: string, username: string) => {
      setIsLoading(true);

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/register`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, username }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error?.message || 'Registration failed'
          );
        }

        // Auto-login after register
        await login(email, password);
      } finally {
        setIsLoading(false);
      }
    },
    [login]
  );

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_refresh_token');
    localStorage.removeItem('auth_user');
    clearAuthCookie();
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
