'use client';

import { useRef, useState, FormEvent } from 'react';
import { safeNextPath } from '@/lib/auth/next-path';

export default function LoginPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) {
      setError('Type your 4-digit PIN, numbers only.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

      if (response.ok && data?.ok) {
        const next = new URLSearchParams(window.location.search).get('redirect');
        window.location.assign(safeNextPath(next, window.location.origin));
        return;
      }
      setError(data?.error || 'Sign-in did not work. Please try again.');
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    }
    setPin('');
    setIsLoading(false);
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
            <span className="text-3xl">🧘</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            TH LifeEngine
          </h1>
          <p className="text-gray-600">
            AI-Powered Wellness Planning
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Sign In
          </h2>
          <p className="text-gray-600 mb-6">Enter your 4-digit PIN.</p>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
                PIN
              </label>
              <input
                ref={inputRef}
                id="pin"
                name="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                autoComplete="current-password"
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-center text-2xl tracking-[0.75em]"
                aria-describedby={error ? 'pin-error' : undefined}
                aria-invalid={error ? true : undefined}
                disabled={isLoading}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div
                id="pin-error"
                role="alert"
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
              >
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || pin.length !== 4}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Checking...' : 'Sign In'}
            </button>
          </form>

          {/* Security Note */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Your PIN is checked on the server. After 5 wrong tries, sign-in locks for 15 minutes.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-600">
          <p>© 2025 TH LifeEngine. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
