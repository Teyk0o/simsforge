'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import i18n, {
  SUPPORTED_LANGUAGES,
  LANGUAGE_NAMES,
  LANGUAGE_FLAGS,
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  normalizeLanguage,
  type SupportedLanguage,
} from '@/i18n';
import { preloadDateLocale } from '@/lib/dateLocales';

/**
 * Language context type definition
 */
interface LanguageContextType {
  /** Current active language code */
  language: SupportedLanguage;
  /** Change the application language */
  setLanguage: (lang: SupportedLanguage) => void;
  /** List of supported language codes */
  supportedLanguages: readonly SupportedLanguage[];
  /** Map of language codes to display names */
  languageNames: Record<SupportedLanguage, string>;
  /** Map of language codes to country flag codes */
  languageFlags: Record<SupportedLanguage, string>;
  /** Whether the language system is ready */
  isReady: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/**
 * Provider component for language management
 *
 * Handles language detection from OS/browser, persistence to localStorage,
 * and provides methods to change language throughout the app.
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { i18n: i18nInstance } = useTranslation();
  const [language, setLanguageState] = useState<SupportedLanguage>(DEFAULT_LANGUAGE);
  const [isReady, setIsReady] = useState(false);

  // Initialize language on mount
  useEffect(() => {
    const initLanguage = async () => {
      // Safe localStorage access (for test environment compatibility)
      const getSavedLanguage = (): string | null => {
        try {
          if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
            return localStorage.getItem(LANGUAGE_STORAGE_KEY);
          }
        } catch (error) {
          console.warn('localStorage access failed:', error);
        }
        return null;
      };

      const savedLang = getSavedLanguage();

      let initialLang: SupportedLanguage;

      if (savedLang) {
        initialLang = normalizeLanguage(savedLang);
        setLanguageState(initialLang);

        // Ensure i18n is synced
        if (i18nInstance.language !== initialLang) {
          i18nInstance.changeLanguage(initialLang);
        }
      } else {
        // Use detected language from i18n (browser/OS language)
        initialLang = normalizeLanguage(i18nInstance.language || navigator.language);
        setLanguageState(initialLang);

        // Save to localStorage for future sessions
        try {
          if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
            localStorage.setItem(LANGUAGE_STORAGE_KEY, initialLang);
          }
        } catch (error) {
          console.warn('localStorage write failed:', error);
        }

        // Ensure i18n is synced
        if (i18nInstance.language !== initialLang) {
          i18nInstance.changeLanguage(initialLang);
        }
      }

      // Preload date locale for initial language
      try {
        await preloadDateLocale(initialLang);
      } catch (error) {
        console.error('Failed to preload initial date locale:', error);
      }

      setIsReady(true);
    };

    initLanguage();
  }, [i18nInstance]);

  /**
   * Change the application language
   */
  const setLanguage = useCallback(
    (lang: SupportedLanguage) => {
      setLanguageState(lang);

      // Safe localStorage write (for test environment compatibility)
      try {
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
          localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
        }
      } catch (error) {
        console.warn('localStorage write failed:', error);
      }

      i18nInstance.changeLanguage(lang);

      // Update HTML lang attribute for accessibility
      if (typeof document !== 'undefined') {
        document.documentElement.lang = lang;
      }

      // Preload date locale for the new language
      preloadDateLocale(lang).catch((error) => {
        console.error('Failed to preload date locale:', error);
      });
    },
    [i18nInstance]
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        supportedLanguages: SUPPORTED_LANGUAGES,
        languageNames: LANGUAGE_NAMES,
        languageFlags: LANGUAGE_FLAGS,
        isReady,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook to access language context
 *
 * @returns Language context with current language, setter, and metadata
 * @throws Error if used outside of LanguageProvider
 *
 * @example
 * const { language, setLanguage, languageNames } = useLanguage();
 * // Change language
 * setLanguage('fr');
 * // Get display name
 * const displayName = languageNames[language]; // "Français"
 */
export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Re-export types and constants for convenience
export { SUPPORTED_LANGUAGES, LANGUAGE_NAMES, DEFAULT_LANGUAGE, type SupportedLanguage };
