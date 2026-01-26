/**
 * i18n Configuration
 *
 * Configures i18next with browser language detection and fallback to English.
 * Supported languages: English, French, Spanish, Portuguese (Brazil), Hindi, Russian, Chinese (Simplified).
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enUS from './locales/en-US.json';
import frFR from './locales/fr-FR.json';
import esES from './locales/es-ES.json';
import ptBR from './locales/pt-BR.json';
import hiIN from './locales/hi-IN.json';
import ruRU from './locales/ru-RU.json';
import zhCN from './locales/zh-CN.json';

/**
 * Supported language codes
 */
export const SUPPORTED_LANGUAGES = ['en-US', 'fr-FR', 'es-ES', 'pt-BR', 'hi-IN', 'ru-RU', 'zh-CN'] as const;

/**
 * Type for supported language codes
 */
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Language display names for the UI
 */
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  'en-US': 'English',
  'fr-FR': 'Français',
  'es-ES': 'Español',
  'pt-BR': 'Português (Brasil)',
  'hi-IN': 'हिन्दी',
  'ru-RU': 'Русский',
  'zh-CN': '简体中文',
};

/**
 * Country codes for flag icons (ISO 3166-1 alpha-2)
 */
export const LANGUAGE_FLAGS: Record<SupportedLanguage, string> = {
  'en-US': 'US',
  'fr-FR': 'FR',
  'es-ES': 'ES',
  'pt-BR': 'BR',
  'hi-IN': 'IN',
  'ru-RU': 'RU',
  'zh-CN': 'CN',
};

/**
 * Default language when detection fails or language is not supported
 */
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en-US';

/**
 * LocalStorage key for persisting language preference
 */
export const LANGUAGE_STORAGE_KEY = 'simsforge_language';

/**
 * Translation resources bundled with the app
 */
const resources = {
  'en-US': { translation: enUS },
  'fr-FR': { translation: frFR },
  'es-ES': { translation: esES },
  'pt-BR': { translation: ptBR },
  'hi-IN': { translation: hiIN },
  'ru-RU': { translation: ruRU },
  'zh-CN': { translation: zhCN },
};

/**
 * Check if a language code is supported
 */
export function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
}

/**
 * Normalize language code to a supported language
 * Handles browser locale codes and maps them to supported locales
 */
export function normalizeLanguage(lang: string): SupportedLanguage {
  // Direct match
  if (isSupportedLanguage(lang)) {
    return lang;
  }

  // Extract base language code (e.g., 'en-GB' -> 'en')
  const baseLang = lang.split('-')[0].toLowerCase();

  // Map base language codes to supported locales
  switch (baseLang) {
    case 'en':
      return 'en-US';
    case 'fr':
      return 'fr-FR';
    case 'es':
      return 'es-ES';
    case 'pt':
      return 'pt-BR';
    case 'hi':
      return 'hi-IN';
    case 'ru':
      return 'ru-RU';
    case 'zh':
      // Prefer simplified Chinese for 'zh' without region
      return 'zh-CN';
    default:
      return DEFAULT_LANGUAGE;
  }
}

/**
 * Initialize i18next with configuration
 */
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],

    // Language detection configuration
    detection: {
      // Order of detection methods
      order: ['localStorage', 'navigator'],
      // Key used in localStorage
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      // Cache detected language in localStorage
      caches: ['localStorage'],
    },

    interpolation: {
      // React already escapes values
      escapeValue: false,
    },

    // Return key if translation not found (useful for development)
    returnEmptyString: false,

    react: {
      // Suspend while loading translations
      useSuspense: false,
    },
  });

export default i18n;
