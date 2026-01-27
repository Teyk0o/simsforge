/**
 * Unit tests for dateLocales module
 * Tests locale importing, caching, and fallback behavior
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getDateLocale,
  getDateLocaleSync,
  preloadDateLocale,
} from '@/lib/dateLocales';

describe('dateLocales', () => {
  describe('getDateLocale', () => {
    it('should load English locale', async () => {
      const locale = await getDateLocale('en-US');
      expect(locale).toBeDefined();
      expect(locale.code).toBe('en-US');
    });

    it('should load French locale', async () => {
      const locale = await getDateLocale('fr-FR');
      expect(locale).toBeDefined();
      expect(locale.code).toBe('fr');
    });

    it('should load Spanish locale', async () => {
      const locale = await getDateLocale('es-ES');
      expect(locale).toBeDefined();
      expect(locale.code).toBe('es');
    });

    it('should load Portuguese Brazil locale', async () => {
      const locale = await getDateLocale('pt-BR');
      expect(locale).toBeDefined();
      expect(locale.code).toBe('pt-BR');
    });

    it('should load Hindi locale', async () => {
      const locale = await getDateLocale('hi-IN');
      expect(locale).toBeDefined();
      expect(locale.code).toBe('hi');
    });

    it('should load Russian locale', async () => {
      const locale = await getDateLocale('ru-RU');
      expect(locale).toBeDefined();
      expect(locale.code).toBe('ru');
    });

    it('should load Chinese locale', async () => {
      const locale = await getDateLocale('zh-CN');
      expect(locale).toBeDefined();
      expect(locale.code).toBe('zh-CN');
    });

    it('should cache locale after first load', async () => {
      const locale1 = await getDateLocale('fr-FR');
      const locale2 = await getDateLocale('fr-FR');
      // Same object reference (cached)
      expect(locale1).toBe(locale2);
    });

    it('should fallback to en-US for invalid language', async () => {
      const locale = await getDateLocale('invalid-XX');
      expect(locale).toBeDefined();
      expect(locale.code).toBe('en-US');
    });
  });

  describe('getDateLocaleSync', () => {
    it('should return locale after async load', async () => {
      await getDateLocale('es-ES');
      const locale = getDateLocaleSync('es-ES');
      expect(locale).toBeDefined();
      expect(locale?.code).toBe('es');
    });

    it('should return en-US after loading', async () => {
      await getDateLocale('en-US');
      const locale = getDateLocaleSync('en-US');
      expect(locale).toBeDefined();
      expect(locale?.code).toBe('en-US');
    });
  });

  describe('preloadDateLocale', () => {
    it('should preload French locale', async () => {
      await preloadDateLocale('fr-FR');
      const locale = getDateLocaleSync('fr-FR');
      expect(locale).toBeDefined();
      expect(locale?.code).toBe('fr');
    });

    it('should preload all supported languages', async () => {
      const languages = ['en-US', 'fr-FR', 'es-ES', 'pt-BR', 'hi-IN', 'ru-RU', 'zh-CN'];

      for (const lang of languages) {
        await preloadDateLocale(lang);
      }

      // Verify all are cached
      for (const lang of languages) {
        const locale = getDateLocaleSync(lang);
        expect(locale).toBeDefined();
      }
    });
  });
});
