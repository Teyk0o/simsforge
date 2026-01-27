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
  it('should contain exactly 7 languages', () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(7);
  });

  it('should contain en-US, fr-FR, es-ES, pt-BR, hi-IN, ru-RU, and zh-CN', () => {
    expect(SUPPORTED_LANGUAGES).toContain('en-US');
    expect(SUPPORTED_LANGUAGES).toContain('fr-FR');
    expect(SUPPORTED_LANGUAGES).toContain('es-ES');
    expect(SUPPORTED_LANGUAGES).toContain('pt-BR');
    expect(SUPPORTED_LANGUAGES).toContain('hi-IN');
    expect(SUPPORTED_LANGUAGES).toContain('ru-RU');
    expect(SUPPORTED_LANGUAGES).toContain('zh-CN');
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
    expect(LANGUAGE_NAMES['en-US']).toBe('English');
    expect(LANGUAGE_NAMES['fr-FR']).toBe('Français');
    expect(LANGUAGE_NAMES['es-ES']).toBe('Español');
    expect(LANGUAGE_NAMES['pt-BR']).toBe('Português (Brasil)');
    expect(LANGUAGE_NAMES['hi-IN']).toBe('हिन्दी');
    expect(LANGUAGE_NAMES['ru-RU']).toBe('Русский');
    expect(LANGUAGE_NAMES['zh-CN']).toBe('简体中文');
  });
});

describe('DEFAULT_LANGUAGE', () => {
  it('should be English (US)', () => {
    expect(DEFAULT_LANGUAGE).toBe('en-US');
  });

  it('should be a supported language', () => {
    expect(SUPPORTED_LANGUAGES).toContain(DEFAULT_LANGUAGE);
  });
});

describe('isSupportedLanguage', () => {
  it('should return true for supported languages', () => {
    expect(isSupportedLanguage('en-US')).toBe(true);
    expect(isSupportedLanguage('fr-FR')).toBe(true);
    expect(isSupportedLanguage('es-ES')).toBe(true);
    expect(isSupportedLanguage('pt-BR')).toBe(true);
    expect(isSupportedLanguage('hi-IN')).toBe(true);
    expect(isSupportedLanguage('ru-RU')).toBe(true);
    expect(isSupportedLanguage('zh-CN')).toBe(true);
  });

  it('should return false for unsupported languages', () => {
    expect(isSupportedLanguage('de')).toBe(false);
    expect(isSupportedLanguage('de-DE')).toBe(false);
    expect(isSupportedLanguage('it')).toBe(false);
    expect(isSupportedLanguage('ja')).toBe(false);
    expect(isSupportedLanguage('zh')).toBe(false);
    expect(isSupportedLanguage('zh-TW')).toBe(false); // Traditional Chinese not supported
  });

  it('should return false for invalid inputs', () => {
    expect(isSupportedLanguage('')).toBe(false);
    expect(isSupportedLanguage('EN')).toBe(false); // Case sensitive
    expect(isSupportedLanguage('en')).toBe(false); // Base language code without region
  });
});

describe('normalizeLanguage', () => {
  it('should return the language as-is if directly supported', () => {
    expect(normalizeLanguage('en-US')).toBe('en-US');
    expect(normalizeLanguage('fr-FR')).toBe('fr-FR');
    expect(normalizeLanguage('es-ES')).toBe('es-ES');
    expect(normalizeLanguage('pt-BR')).toBe('pt-BR');
    expect(normalizeLanguage('hi-IN')).toBe('hi-IN');
    expect(normalizeLanguage('ru-RU')).toBe('ru-RU');
    expect(normalizeLanguage('zh-CN')).toBe('zh-CN');
  });

  it('should normalize base language codes to full locales', () => {
    expect(normalizeLanguage('en')).toBe('en-US');
    expect(normalizeLanguage('fr')).toBe('fr-FR');
    expect(normalizeLanguage('es')).toBe('es-ES');
    expect(normalizeLanguage('pt')).toBe('pt-BR');
    expect(normalizeLanguage('hi')).toBe('hi-IN');
    expect(normalizeLanguage('ru')).toBe('ru-RU');
    expect(normalizeLanguage('zh')).toBe('zh-CN');
  });

  it('should normalize English variants to en-US', () => {
    expect(normalizeLanguage('en-GB')).toBe('en-US');
    expect(normalizeLanguage('en-CA')).toBe('en-US');
    expect(normalizeLanguage('en-AU')).toBe('en-US');
  });

  it('should normalize French variants to fr-FR', () => {
    expect(normalizeLanguage('fr-CA')).toBe('fr-FR');
    expect(normalizeLanguage('fr-BE')).toBe('fr-FR');
    expect(normalizeLanguage('fr-CH')).toBe('fr-FR');
  });

  it('should normalize Spanish variants to es-ES', () => {
    expect(normalizeLanguage('es-MX')).toBe('es-ES');
    expect(normalizeLanguage('es-AR')).toBe('es-ES');
    expect(normalizeLanguage('es-CO')).toBe('es-ES');
  });

  it('should normalize Portuguese variants to pt-BR', () => {
    expect(normalizeLanguage('pt-PT')).toBe('pt-BR');
    expect(normalizeLanguage('pt-AO')).toBe('pt-BR');
  });

  it('should normalize Chinese variants to zh-CN (Simplified)', () => {
    expect(normalizeLanguage('zh-Hans')).toBe('zh-CN');
    expect(normalizeLanguage('zh-SG')).toBe('zh-CN');
  });

  it('should fallback to default language for unsupported languages', () => {
    expect(normalizeLanguage('de')).toBe('en-US');
    expect(normalizeLanguage('de-DE')).toBe('en-US');
    expect(normalizeLanguage('ja')).toBe('en-US');
    expect(normalizeLanguage('ja-JP')).toBe('en-US');
    expect(normalizeLanguage('ko')).toBe('en-US');
    expect(normalizeLanguage('it')).toBe('en-US');
  });

  it('should normalize Traditional Chinese (zh-TW) to Simplified Chinese (zh-CN)', () => {
    // zh-TW extracts base 'zh' which maps to zh-CN (Simplified)
    expect(normalizeLanguage('zh-TW')).toBe('zh-CN');
    expect(normalizeLanguage('zh-HK')).toBe('zh-CN');
  });

  it('should fallback to default for empty or invalid input', () => {
    expect(normalizeLanguage('')).toBe('en-US');
    expect(normalizeLanguage('invalid')).toBe('en-US');
    expect(normalizeLanguage('xx-YY')).toBe('en-US');
  });
});
