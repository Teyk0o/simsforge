'use client';

import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import ModDetailClient from './ModDetailClient';

/**
 * Loading fallback component while mod details are being fetched.
 */
function ModsLoading() {
  const { t } = useTranslation();

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block">
          <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--ui-border)', borderTopColor: 'var(--brand-green)' }} />
        </div>
        <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>{t('mods.detail.loading')}</p>
      </div>
    </div>
  );
}

/**
 * Mods page that handles both list and detail views via query parameters.
 * Uses query param "id" to determine which mod to display.
 * Example: /mods?id=123
 * Wraps ModDetailClient in Suspense to handle useSearchParams() during static export.
 */
export default function ModsPage() {
  return (
    <Suspense fallback={<ModsLoading />}>
      <ModDetailClient />
    </Suspense>
  );
}
