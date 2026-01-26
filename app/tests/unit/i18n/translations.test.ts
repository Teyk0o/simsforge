/**
 * Unit tests for translation files consistency
 *
 * Ensures all language files have the same keys and structure
 */

import { describe, it, expect } from 'vitest';
import en from '@/i18n/locales/en.json';
import fr from '@/i18n/locales/fr.json';
import es from '@/i18n/locales/es.json';
import ptBR from '@/i18n/locales/pt-BR.json';

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
  const enKeys = extractKeys(en);
  const frKeys = extractKeys(fr);
  const esKeys = extractKeys(es);
  const ptBRKeys = extractKeys(ptBR);

  it('should have English as the reference with all keys', () => {
    expect(enKeys.length).toBeGreaterThan(0);
  });

  it('should have French with the same keys as English', () => {
    expect(frKeys).toEqual(enKeys);
  });

  it('should have Spanish with the same keys as English', () => {
    expect(esKeys).toEqual(enKeys);
  });

  it('should have Portuguese (Brazil) with the same keys as English', () => {
    expect(ptBRKeys).toEqual(enKeys);
  });
});

describe('Translation values', () => {
  it('should have non-empty strings for all English values', () => {
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

    checkNonEmpty(en);
  });

  it('should have non-empty strings for all French values', () => {
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

    checkNonEmpty(fr);
  });

  it('should have non-empty strings for all Spanish values', () => {
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

    checkNonEmpty(es);
  });

  it('should have non-empty strings for all Portuguese values', () => {
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

    checkNonEmpty(ptBR);
  });
});

describe('Translation key naming conventions', () => {
  it('should use camelCase or snake_case for keys', () => {
    const keys = extractKeys(en);

    for (const key of keys) {
      const segments = key.split('.');

      for (const segment of segments) {
        // Should not contain spaces or special characters (except underscores)
        expect(segment).toMatch(/^[a-zA-Z][a-zA-Z0-9_]*$/);
      }
    }
  });
});
