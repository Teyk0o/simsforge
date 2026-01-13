'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';

function LoginPageContent() {

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-ui-dark to-gray-900 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <div className="w-12 h-12 text-brand-green">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L3 11L12 22L21 11L12 2Z" />
            </svg>
          </div>
          <span className="ml-3 font-display font-bold text-2xl tracking-tight text-white">
            Sims<span className="text-brand-green">Forge</span>
          </span>
        </div>

        {/* Card */}
        <div className="bg-ui-panel border border-ui-border rounded-2xl p-8 shadow-2xl">
          <h1 className="text-2xl font-bold text-white mb-2">Connexion</h1>
          <p className="text-gray-400 mb-6">Connectez-vous à votre compte SimsForge</p>

          <Suspense fallback={<div className="text-center text-gray-400">Chargement...</div>}>
            <LoginForm />
          </Suspense>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-xs mt-6">
          En vous connectant, vous acceptez nos{' '}
          <Link href="#" className="text-gray-400 hover:text-gray-300 underline">
            conditions d&apos;utilisation
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-ui-dark to-gray-900">Chargement...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
