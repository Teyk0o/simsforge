'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import i18n, {
  SUPPORTED_LANGUAGES,
  LANGUAGE_NAMES,
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  normalizeLanguage,
  type SupportedLanguage,
} from '@/i18n';

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
    const initLanguage = () => {
      // Check for saved preference in localStorage first
      const savedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY);

      if (savedLang) {
        const normalized = normalizeLanguage(savedLang);
        setLanguageState(normalized);

        // Ensure i18n is synced
        if (i18nInstance.language !== normalized) {
          i18nInstance.changeLanguage(normalized);
        }
      } else {
        // Use detected language from i18n (browser/OS language)
        const detected = normalizeLanguage(i18nInstance.language || navigator.language);
        setLanguageState(detected);

        // Save to localStorage for future sessions
        localStorage.setItem(LANGUAGE_STORAGE_KEY, detected);

        // Ensure i18n is synced
        if (i18nInstance.language !== detected) {
          i18nInstance.changeLanguage(detected);
        }
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
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      i18nInstance.changeLanguage(lang);

      // Update HTML lang attribute for accessibility
      document.documentElement.lang = lang;
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
