/**
 * Unit tests for translation files consistency
 *
 * Ensures all language files have the same keys and structure
 */

import { describe, it, expect } from 'vitest';
import enUS from '@/i18n/locales/en-US.json';
import frFR from '@/i18n/locales/fr-FR.json';
import esES from '@/i18n/locales/es-ES.json';
import ptBR from '@/i18n/locales/pt-BR.json';
import hiIN from '@/i18n/locales/hi-IN.json';
import ruRU from '@/i18n/locales/ru-RU.json';
import zhCN from '@/i18n/locales/zh-CN.json';

type TranslationObject = Record<string, unknown>;

/**
 * Recursively extract all keys from a nested object
 */
function extractKeys(obj: TranslationObject, prefix = ''): string[] {
  const keys: string[] = [];

  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...extractKeys(value as TranslationObject, fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys.sort();
}

describe('Translation files structure', () => {
  const enUSKeys = extractKeys(enUS);
  const frFRKeys = extractKeys(frFR);
  const esESKeys = extractKeys(esES);
  const ptBRKeys = extractKeys(ptBR);
  const hiINKeys = extractKeys(hiIN);
  const ruRUKeys = extractKeys(ruRU);
  const zhCNKeys = extractKeys(zhCN);

  it('should have English (US) as the reference with all keys', () => {
    expect(enUSKeys.length).toBeGreaterThan(0);
  });

  it('should have French with the same keys as English', () => {
    expect(frFRKeys).toEqual(enUSKeys);
  });

  it('should have Spanish with the same keys as English', () => {
    expect(esESKeys).toEqual(enUSKeys);
  });

  it('should have Portuguese (Brazil) with the same keys as English', () => {
    expect(ptBRKeys).toEqual(enUSKeys);
  });

  it('should have Hindi with the same keys as English', () => {
    expect(hiINKeys).toEqual(enUSKeys);
  });

  it('should have Russian with the same keys as English', () => {
    expect(ruRUKeys).toEqual(enUSKeys);
  });

  it('should have Chinese (Simplified) with the same keys as English', () => {
    expect(zhCNKeys).toEqual(enUSKeys);
  });
});

describe('Translation values', () => {
  const checkNonEmpty = (obj: TranslationObject, path = ''): void => {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (typeof value === 'object' && value !== null) {
        checkNonEmpty(value as TranslationObject, currentPath);
      } else if (typeof value === 'string') {
        expect(value.trim().length, `Empty value at ${currentPath}`).toBeGreaterThan(0);
      }
    }
  };

  it('should have non-empty strings for all English (US) values', () => {
    checkNonEmpty(enUS);
  });

  it('should have non-empty strings for all French values', () => {
    checkNonEmpty(frFR);
  });

  it('should have non-empty strings for all Spanish values', () => {
    checkNonEmpty(esES);
  });

  it('should have non-empty strings for all Portuguese values', () => {
    checkNonEmpty(ptBR);
  });

  it('should have non-empty strings for all Hindi values', () => {
    checkNonEmpty(hiIN);
  });

  it('should have non-empty strings for all Russian values', () => {
    checkNonEmpty(ruRU);
  });

  it('should have non-empty strings for all Chinese values', () => {
    checkNonEmpty(zhCN);
  });
});

describe('Translation key naming conventions', () => {
  it('should use camelCase or snake_case for keys', () => {
    const keys = extractKeys(enUS);

    for (const key of keys) {
      const segments = key.split('.');

      for (const segment of segments) {
        // Should not contain spaces or special characters (except underscores)
        expect(segment).toMatch(/^[a-zA-Z][a-zA-Z0-9_]*$/);
      }
    }
  });
});
