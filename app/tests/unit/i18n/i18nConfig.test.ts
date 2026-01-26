/**
 * Unit tests for i18n configuration and utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_NAMES,
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
  normalizeLanguage,
} from '@/i18n';

describe('SUPPORTED_LANGUAGES', () => {
  it('should contain exactly 4 languages', () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(4);
  });

  it('should contain en, fr, es, and pt-BR', () => {
    expect(SUPPORTED_LANGUAGES).toContain('en');
    expect(SUPPORTED_LANGUAGES).toContain('fr');
    expect(SUPPORTED_LANGUAGES).toContain('es');
    expect(SUPPORTED_LANGUAGES).toContain('pt-BR');
  });
});

describe('LANGUAGE_NAMES', () => {
  it('should have display names for all supported languages', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(LANGUAGE_NAMES[lang]).toBeDefined();
      expect(typeof LANGUAGE_NAMES[lang]).toBe('string');
      expect(LANGUAGE_NAMES[lang].length).toBeGreaterThan(0);
    }
  });

  it('should have correct display names', () => {
    expect(LANGUAGE_NAMES['en']).toBe('English');
    expect(LANGUAGE_NAMES['fr']).toBe('Français');
    expect(LANGUAGE_NAMES['es']).toBe('Español');
    expect(LANGUAGE_NAMES['pt-BR']).toBe('Português (Brasil)');
  });
});

describe('DEFAULT_LANGUAGE', () => {
  it('should be English', () => {
    expect(DEFAULT_LANGUAGE).toBe('en');
  });

  it('should be a supported language', () => {
    expect(SUPPORTED_LANGUAGES).toContain(DEFAULT_LANGUAGE);
  });
});

describe('isSupportedLanguage', () => {
  it('should return true for supported languages', () => {
    expect(isSupportedLanguage('en')).toBe(true);
    expect(isSupportedLanguage('fr')).toBe(true);
    expect(isSupportedLanguage('es')).toBe(true);
    expect(isSupportedLanguage('pt-BR')).toBe(true);
  });

  it('should return false for unsupported languages', () => {
    expect(isSupportedLanguage('de')).toBe(false);
    expect(isSupportedLanguage('it')).toBe(false);
    expect(isSupportedLanguage('ja')).toBe(false);
    expect(isSupportedLanguage('zh')).toBe(false);
  });

  it('should return false for invalid inputs', () => {
    expect(isSupportedLanguage('')).toBe(false);
    expect(isSupportedLanguage('EN')).toBe(false); // Case sensitive
    expect(isSupportedLanguage('en-US')).toBe(false); // Variant not directly supported
  });
});

describe('normalizeLanguage', () => {
  it('should return the language as-is if directly supported', () => {
    expect(normalizeLanguage('en')).toBe('en');
    expect(normalizeLanguage('fr')).toBe('fr');
    expect(normalizeLanguage('es')).toBe('es');
    expect(normalizeLanguage('pt-BR')).toBe('pt-BR');
  });

  it('should normalize Portuguese variants to pt-BR', () => {
    expect(normalizeLanguage('pt')).toBe('pt-BR');
    expect(normalizeLanguage('pt-PT')).toBe('pt-BR');
    expect(normalizeLanguage('pt-AO')).toBe('pt-BR');
  });

  it('should extract base language from regional variants', () => {
    expect(normalizeLanguage('en-US')).toBe('en');
    expect(normalizeLanguage('en-GB')).toBe('en');
    expect(normalizeLanguage('fr-CA')).toBe('fr');
    expect(normalizeLanguage('fr-FR')).toBe('fr');
    expect(normalizeLanguage('es-MX')).toBe('es');
    expect(normalizeLanguage('es-AR')).toBe('es');
  });

  it('should fallback to default language for unsupported languages', () => {
    expect(normalizeLanguage('de')).toBe('en');
    expect(normalizeLanguage('de-DE')).toBe('en');
    expect(normalizeLanguage('ja')).toBe('en');
    expect(normalizeLanguage('zh-CN')).toBe('en');
    expect(normalizeLanguage('ko')).toBe('en');
  });

  it('should fallback to default for empty or invalid input', () => {
    expect(normalizeLanguage('')).toBe('en');
    expect(normalizeLanguage('invalid')).toBe('en');
    expect(normalizeLanguage('xx-YY')).toBe('en');
  });
});
