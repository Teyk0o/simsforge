/**
 * i18n Configuration
 *
 * Configures i18next with browser language detection and fallback to English.
 * Supported languages: English (en), French (fr), Spanish (es), Portuguese Brazil (pt-BR).
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import ptBR from './locales/pt-BR.json';

/**
 * Supported language codes
 */
export const SUPPORTED_LANGUAGES = ['en', 'fr', 'es', 'pt-BR'] as const;

/**
 * Type for supported language codes
 */
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Language display names for the UI
 */
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
  'pt-BR': 'Português (Brasil)',
};

/**
 * Default language when detection fails or language is not supported
 */
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

/**
 * LocalStorage key for persisting language preference
 */
export const LANGUAGE_STORAGE_KEY = 'simsforge_language';

/**
 * Translation resources bundled with the app
 */
const resources = {
  en: { translation: en },
  fr: { translation: fr },
  es: { translation: es },
  'pt-BR': { translation: ptBR },
};

/**
 * Check if a language code is supported
 */
export function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
}

/**
 * Normalize language code to a supported language
 * Handles cases like 'pt' -> 'pt-BR', 'en-US' -> 'en'
 */
export function normalizeLanguage(lang: string): SupportedLanguage {
  // Direct match
  if (isSupportedLanguage(lang)) {
    return lang;
  }

  // Handle pt variants -> pt-BR
  if (lang.startsWith('pt')) {
    return 'pt-BR';
  }

  // Handle base language codes (e.g., 'en-US' -> 'en')
  const baseLang = lang.split('-')[0];
  if (isSupportedLanguage(baseLang)) {
    return baseLang;
  }

  return DEFAULT_LANGUAGE;
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
