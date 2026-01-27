/**
 * Date locale management module for date-fns
 * Handles dynamic import of date-fns locales with caching and synchronous access.
 * Supports: en-US, fr-FR, es-ES, pt-BR, hi-IN, ru-RU, zh-CN
 */

import type { Locale } from 'date-fns';

// Locale cache to avoid re-imports
const localeCache = new Map<string, Locale>();

/**
 * Maps application language codes to date-fns locale identifiers
 */
const languageToDateFnsLocale: Record<string, string> = {
  'en-US': 'en-US',
  'fr-FR': 'fr',
  'es-ES': 'es',
  'pt-BR': 'pt-BR',
  'hi-IN': 'hi',
  'ru-RU': 'ru',
  'zh-CN': 'zh-CN',
};

/**
 * Dynamically imports a date-fns locale and caches it
 * @param language - Language code (e.g., 'fr-FR')
 * @returns Promise<Locale> - date-fns locale object
 * @throws Error if locale cannot be imported
 */
export async function getDateLocale(language: string): Promise<Locale> {
  const dateLocaleKey = languageToDateFnsLocale[language] || 'en-US';

  // Return from cache if available
  if (localeCache.has(dateLocaleKey)) {
    return localeCache.get(dateLocaleKey)!;
  }

  try {
    // Dynamic import for tree-shaking
    let locale: Locale;
    switch (dateLocaleKey) {
      case 'fr': {
        const mod = await import('date-fns/locale/fr');
        locale = mod.fr;
        break;
      }
      case 'es': {
        const mod = await import('date-fns/locale/es');
        locale = mod.es;
        break;
      }
      case 'pt-BR': {
        const mod = await import('date-fns/locale/pt-BR');
        locale = mod.ptBR;
        break;
      }
      case 'hi': {
        const mod = await import('date-fns/locale/hi');
        locale = mod.hi;
        break;
      }
      case 'ru': {
        const mod = await import('date-fns/locale/ru');
        locale = mod.ru;
        break;
      }
      case 'zh-CN': {
        const mod = await import('date-fns/locale/zh-CN');
        locale = mod.zhCN;
        break;
      }
      case 'en-US':
      default: {
        const mod = await import('date-fns/locale/en-US');
        locale = mod.enUS;
        break;
      }
    }

    localeCache.set(dateLocaleKey, locale);
    return locale;
  } catch (error) {
    console.error(`Failed to load date locale for ${language}:`, error);
    // Fallback to en-US
    const mod = await import('date-fns/locale/en-US');
    const enLocale = mod.enUS;
    localeCache.set('en-US', enLocale);
    return enLocale;
  }
}

/**
 * Synchronously gets a cached date locale
 * Returns undefined if locale has not been preloaded
 * @param language - Language code (e.g., 'fr-FR')
 * @returns Locale or undefined
 */
export function getDateLocaleSync(language: string): Locale | undefined {
  const dateLocaleKey = languageToDateFnsLocale[language] || 'en-US';
  return localeCache.get(dateLocaleKey);
}

/**
 * Preloads a date locale into cache
 * Should be called when language is changed to ensure locale is ready
 * @param language - Language code (e.g., 'fr-FR')
 */
export async function preloadDateLocale(language: string): Promise<void> {
  await getDateLocale(language);
}
