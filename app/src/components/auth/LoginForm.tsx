'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Spinner } from '@phosphor-icons/react';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(email, password);
      router.push(searchParams.get('callbackUrl') || '/');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Input */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
            Adresse email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            placeholder="vous@example.com"
            className="w-full px-4 py-2.5 bg-ui-dark border border-ui-border rounded-lg text-white placeholder-gray-500 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all disabled:opacity-50"
            required
          />
        </div>

        {/* Password Input */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            placeholder="••••••••"
            className="w-full px-4 py-2.5 bg-ui-dark border border-ui-border rounded-lg text-white placeholder-gray-500 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all disabled:opacity-50"
            required
          />
        </div>

        {/* Forgot Password Link */}
        <div className="flex justify-end">
          <Link href="/auth/forgot-password" className="text-xs text-gray-400 hover:text-brand-green transition-colors">
            Mot de passe oublié&nbsp;?
          </Link>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 bg-brand-green hover:bg-brand-dark disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Spinner size={18} className="animate-spin" />
              <span>Connexion...</span>
            </>
          ) : (
            'Se connecter'
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-ui-border" />
        <span className="text-xs text-gray-500">OU</span>
        <div className="flex-1 h-px bg-ui-border" />
      </div>

      {/* Sign Up Link */}
      <p className="text-center text-gray-400 text-sm">
        Pas encore de compte&nbsp;?{' '}
        <Link href="/auth/register" className="text-brand-green hover:text-brand-dark font-medium transition-colors">
          Créer un compte
        </Link>
      </p>
    </>
  );
}
