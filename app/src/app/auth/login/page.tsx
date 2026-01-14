'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';

function LoginPageContent() {

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: `linear-gradient(to bottom right, #111827, var(--ui-dark), #111827)`,
      }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <div className="w-12 h-12 text-brand-green">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L3 11L12 22L21 11L12 2Z" />
            </svg>
          </div>
          <span className="ml-3 font-display font-bold text-2xl tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Sims<span className="text-brand-green">Forge</span>
          </span>
        </div>

        {/* Card */}
        <div className="border rounded-2xl p-8 shadow-2xl" style={{ backgroundColor: 'var(--ui-panel)', borderColor: 'var(--ui-border)' }}>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Connexion</h1>
          <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>Connectez-vous à votre compte SimsForge</p>

          <Suspense fallback={<div className="text-center" style={{ color: 'var(--text-secondary)' }}>Chargement...</div>}>
            <LoginForm />
          </Suspense>
        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-secondary)' }}>
          En vous connectant, vous acceptez nos{' '}
          <Link href="#" className="underline transition-colors hover:text-brand-green" style={{ color: 'var(--text-secondary)' }}>
            conditions d&apos;utilisation
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center" style={{ background: `linear-gradient(to bottom right, #111827, var(--ui-dark), #111827)` }}>Chargement...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
