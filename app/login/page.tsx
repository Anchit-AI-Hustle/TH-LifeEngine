'use client';

import { useRef, useState, FormEvent } from 'react';
import { Lock, LoaderCircle } from 'lucide-react';
import { safeNextPath } from '@/lib/auth/next-path';

export default function LoginPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void signIn(pin);
  };

  const signIn = async (pin: string) => {
    if (isLoading) return;
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
    // The input is disabled until this render commits, so focus on the next frame.
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-emerald-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-500 text-lg font-bold text-white shadow-lg shadow-indigo-500/20">
            TH+
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">LifeEngine</h1>
          <p className="mt-1 text-sm text-gray-600">Personal wellness planner</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xl shadow-gray-200/60 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="pin" className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-800">
                <Lock className="h-4 w-4 text-gray-400" aria-hidden />
                Enter your 4-digit PIN
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
                onChange={(e) => {
                  const next = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setPin(next);
                  if (error) setError('');
                  if (next.length === 4) void signIn(next);
                }}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-center text-2xl tracking-[0.75em] text-gray-900 outline-none transition placeholder:tracking-[0.5em] placeholder:text-gray-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 aria-[invalid=true]:border-red-400"
                placeholder="••••"
                aria-describedby={error ? 'pin-error pin-help' : 'pin-help'}
                aria-invalid={error ? true : undefined}
                disabled={isLoading}
              />
            </div>

            {error && (
              <div id="pin-error" role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || pin.length !== 4}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
              {isLoading ? 'Checking…' : 'Sign in'}
            </button>
          </form>

          <p id="pin-help" className="mt-6 border-t border-gray-100 pt-5 text-xs leading-relaxed text-gray-500">
            Your PIN is checked on the server. After 5 wrong tries, sign-in locks for 15 minutes.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">© {new Date().getFullYear()} TH+ LifeEngine</p>
      </div>
    </div>
  );
}
