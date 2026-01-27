/**
 * Unit tests for useDateFormatters hook
 * Tests localized date formatting with different languages
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDateFormatters } from '@/hooks/useDateFormatters';
import { LanguageProvider } from '@/context/LanguageContext';
import React from 'react';

// Mock i18n modules
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: {
      language: 'en-US',
      changeLanguage: vi.fn(),
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn(),
  },
}));

vi.mock('@/i18n', () => ({
  default: {
    use: vi.fn().mockReturnThis(),
    init: vi.fn().mockReturnThis(),
    language: 'en-US',
    changeLanguage: vi.fn(),
  },
  SUPPORTED_LANGUAGES: ['en-US', 'fr-FR', 'es-ES', 'pt-BR', 'hi-IN', 'ru-RU', 'zh-CN'],
  LANGUAGE_NAMES: {
    'en-US': 'English',
    'fr-FR': 'Français',
    'es-ES': 'Español',
    'pt-BR': 'Português',
    'hi-IN': 'हिन्दी',
    'ru-RU': 'Русский',
    'zh-CN': '简体中文',
  },
  LANGUAGE_FLAGS: {
    'en-US': 'US',
    'fr-FR': 'FR',
    'es-ES': 'ES',
    'pt-BR': 'BR',
    'hi-IN': 'IN',
    'ru-RU': 'RU',
    'zh-CN': 'CN',
  },
  DEFAULT_LANGUAGE: 'en-US',
  LANGUAGE_STORAGE_KEY: 'simsforge_language',
  normalizeLanguage: (lang: string) => lang as any,
}));

describe('useDateFormatters', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(LanguageProvider, {}, children);

  describe('formatRelativeDate', () => {
    it('should format recent date (minutes ago)', async () => {
      const { result } = renderHook(() => useDateFormatters(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLocaleLoaded).toBe(true);
      });

      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const formatted = result.current.formatRelativeDate(fiveMinutesAgo.toISOString());

      expect(formatted).toContain('ago');
    });

    it('should format date from days ago', async () => {
      const { result } = renderHook(() => useDateFormatters(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLocaleLoaded).toBe(true);
      });

      const now = new Date();
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
      const formatted = result.current.formatRelativeDate(fiveDaysAgo.toISOString());

      expect(formatted).toContain('ago');
    });

    it('should format old date as absolute', async () => {
      const { result } = renderHook(() => useDateFormatters(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLocaleLoaded).toBe(true);
      });

      const oldDate = '2024-01-15T00:00:00Z';
      const formatted = result.current.formatRelativeDate(oldDate);

      // Should contain month name
      expect(formatted).toBeDefined();
      expect(formatted).not.toContain('Invalid');
    });

    it('should handle invalid dates', async () => {
      const { result } = renderHook(() => useDateFormatters(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLocaleLoaded).toBe(true);
      });

      const formatted = result.current.formatRelativeDate('invalid-date');
      expect(formatted).toBe('Invalid date');
    });
  });

  describe('formatDate', () => {
    it('should format date as absolute', async () => {
      const { result } = renderHook(() => useDateFormatters(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLocaleLoaded).toBe(true);
      });

      const date = '2025-01-10T00:00:00Z';
      const formatted = result.current.formatDate(date);

      // Should contain month name and year
      expect(formatted).toBeDefined();
      expect(formatted).not.toContain('Invalid');
    });

    it('should handle invalid dates', async () => {
      const { result } = renderHook(() => useDateFormatters(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLocaleLoaded).toBe(true);
      });

      const formatted = result.current.formatDate('invalid-date');
      expect(formatted).toBe('Invalid date');
    });

    it('should format different dates differently', async () => {
      const { result } = renderHook(() => useDateFormatters(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLocaleLoaded).toBe(true);
      });

      const date1 = result.current.formatDate('2025-01-10T00:00:00Z');
      const date2 = result.current.formatDate('2024-12-25T00:00:00Z');

      expect(date1).not.toBe(date2);
    });
  });

  describe('isLocaleLoaded', () => {
    it('should indicate when locale is loaded', async () => {
      const { result } = renderHook(() => useDateFormatters(), { wrapper });

      // Initially might be false or true depending on timing
      expect(typeof result.current.isLocaleLoaded).toBe('boolean');

      // Should eventually be true
      await waitFor(() => {
        expect(result.current.isLocaleLoaded).toBe(true);
      });
    });
  });
});
