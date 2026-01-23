'use client';

import React, { Suspense } from 'react';
import Layout from '@/components/layouts/Layout';
import LibraryContent from './library-content';

/**
 * Library page component with Suspense boundary for useSearchParams()
 */
export default function LibraryPage() {
  return (
    <Layout>
      <Suspense fallback={<LibraryLoadingFallback />}>
        <LibraryContent />
      </Suspense>
    </Layout>
  );
}

/**
 * Loading fallback component displayed while library content loads
 */
function LibraryLoadingFallback() {
  return (
    <main
      className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-ui-dark"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div
        className="flex items-center justify-center h-full"
        style={{ color: 'var(--text-secondary)' }}
      >
        Loading library...
      </div>
    </main>
  );
}
