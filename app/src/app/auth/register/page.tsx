'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Spinner } from '@phosphor-icons/react';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      setIsLoading(false);
      return;
    }

    try {
      await register(formData.email, formData.password, formData.username);
      setSuccess('Compte créé avec succès! Redirection vers le dashboard...');
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (error: any) {
      setError(error.message || 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

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
          <h1 className="text-2xl font-bold text-white mb-2">Créer un compte</h1>
          <p className="text-gray-400 mb-6">Rejoignez la communauté SimsForge</p>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-4 bg-brand-green/10 border border-brand-green/30 rounded-lg">
              <p className="text-brand-green text-sm">{success}</p>
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
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
                placeholder="vous@example.com"
                className="w-full px-4 py-2.5 bg-ui-dark border border-ui-border rounded-lg text-white placeholder-gray-500 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all disabled:opacity-50"
                required
              />
            </div>

            {/* Username Input */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                Nom d&apos;utilisateur
              </label>
              <input
                id="username"
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                disabled={isLoading}
                placeholder="simmer_pro"
                className="w-full px-4 py-2.5 bg-ui-dark border border-ui-border rounded-lg text-white placeholder-gray-500 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all disabled:opacity-50"
                required
              />
              <p className="text-xs text-gray-500 mt-1">3-50 caractères, lettres, chiffres et underscore</p>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-ui-dark border border-ui-border rounded-lg text-white placeholder-gray-500 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all disabled:opacity-50"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 8 caractères</p>
            </div>

            {/* Confirm Password Input */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Confirmer le mot de passe
              </label>
              <input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={isLoading}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-ui-dark border border-ui-border rounded-lg text-white placeholder-gray-500 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all disabled:opacity-50"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-brand-green hover:bg-brand-dark disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 mt-6"
            >
              {isLoading ? (
                <>
                  <Spinner size={18} className="animate-spin" />
                  <span>Création en cours...</span>
                </>
              ) : (
                'Créer un compte'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-ui-border" />
            <span className="text-xs text-gray-500">OU</span>
            <div className="flex-1 h-px bg-ui-border" />
          </div>

          {/* Login Link */}
          <p className="text-center text-gray-400 text-sm">
            Vous avez déjà un compte?{' '}
            <Link href="/auth/login" className="text-brand-green hover:text-brand-dark font-medium transition-colors">
              Se connecter
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-xs mt-6">
          En créant un compte, vous acceptez nos{' '}
          <Link href="#" className="text-gray-400 hover:text-gray-300 underline">
            conditions d&apos;utilisation
          </Link>
        </p>
      </div>
    </div>
  );
}
