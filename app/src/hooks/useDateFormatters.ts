/**
 * React hook for localized date formatting
 * Automatically uses current language from LanguageContext
 * Provides formatRelativeDate and formatDate functions
 */

import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import type { Locale } from 'date-fns';
import { useLanguage } from '@/context/LanguageContext';
import { getDateLocale } from '@/lib/dateLocales';

interface DateFormatters {
  /** Formats date relative to now (e.g., "5 days ago") */
  formatRelativeDate: (isoDateStr: string) => string;
  /** Formats date as absolute (e.g., "January 10, 2025") */
  formatDate: (isoDateStr: string) => string;
  /** Whether locale is loaded and ready */
  isLocaleLoaded: boolean;
}

/**
 * Hook to get localized date formatters
 * Automatically detects and loads locale based on current language
 * @returns DateFormatters object with format functions and loading state
 */
export function useDateFormatters(): DateFormatters {
  const { language } = useLanguage();
  const [locale, setLocale] = useState<Locale | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // Load locale when language changes
  useEffect(() => {
    setIsLoading(true);
    getDateLocale(language)
      .then((newLocale) => {
        setLocale(newLocale);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load date locale:', error);
        setIsLoading(false);
      });
  }, [language]);

  // Memoize formatter functions
  const formatters = useMemo<DateFormatters>(
    () => ({
      formatRelativeDate: (isoDateStr: string): string => {
        try {
          const date = new Date(isoDateStr);
          if (isNaN(date.getTime())) {
            return 'Invalid date';
          }

          // Use relative format for dates within the last 30 days
          const now = new Date();
          const daysDiff = Math.floor(
            (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysDiff <= 30) {
            return formatDistanceToNow(date, {
              addSuffix: true,
              locale,
            });
          }

          // Fall back to absolute format for older dates
          return format(date, 'PPP', { locale });
        } catch (error) {
          console.error('Error formatting relative date:', error);
          return 'Invalid date';
        }
      },

      formatDate: (isoDateStr: string): string => {
        try {
          const date = new Date(isoDateStr);
          if (isNaN(date.getTime())) {
            return 'Invalid date';
          }
          return format(date, 'PPP', { locale });
        } catch (error) {
          console.error('Error formatting date:', error);
          return 'Invalid date';
        }
      },

      isLocaleLoaded: !isLoading && locale !== undefined,
    }),
    [locale, isLoading]
  );

  return formatters;
}
