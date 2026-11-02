'use client';

import { useEffect, useRef, useState, FormEvent } from 'react';
import { LoaderCircle, Lock, Smartphone } from 'lucide-react';
import clsx from 'clsx';
import { safeNextPath } from '@/lib/auth/next-path';
import { normalizeMobile, MOBILE_HELP } from '@/lib/auth/phone';
import { pinProblem } from '@/lib/auth/pinRules';

type Mode = 'signin' | 'signup';
type Field = 'mobile' | 'pin' | 'confirm';
type Errors = Partial<Record<Field | 'form', string>>;

const digits = (v: string) => v.replace(/\D/g, '').slice(0, 4);

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('signin');
  const [mobile, setMobile] = useState('');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [exists, setExists] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const mobileRef = useRef<HTMLInputElement>(null);
  const pinRef = useRef<HTMLInputElement>(null);
  // Set synchronously, so an autofill that fills the PIN and submits in the
  // same tick still sends one request (each wrong one spends one of 5 tries).
  const inFlight = useRef(false);

  // /login?mode=signup opens the sign-up tab.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('mode') === 'signup') setMode('signup');
  }, []);

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrors({});
    setExists(false);
    setPin('');
    setConfirm('');
    requestAnimationFrame(() => (normalizeMobile(mobile) ? pinRef : mobileRef).current?.focus());
  };

  const validate = (m: string, p: string, c: string): Errors => {
    const e: Errors = {};
    const e164 = normalizeMobile(m);
    if (!e164) e.mobile = m.trim() ? MOBILE_HELP : 'Enter your mobile number.';
    if (!/^\d{4}$/.test(p)) e.pin = mode === 'signup' ? 'Choose a PIN of exactly 4 numbers.' : 'Enter your 4-digit PIN.';
    else if (mode === 'signup') {
      const problem = pinProblem(p, e164 ?? undefined);
      if (problem) e.pin = problem;
      else if (c !== p) e.confirm = c ? 'The two PINs do not match.' : 'Type the same PIN again.';
    }
    return e;
  };

  const submit = async (m = mobile, p = pin, c = confirm) => {
    if (inFlight.current) return;
    const found = validate(m, p, c);
    setErrors(found);
    setExists(false);
    if (Object.keys(found).length) {
      requestAnimationFrame(() => (found.mobile ? mobileRef : pinRef).current?.focus());
      return;
    }
    inFlight.current = true;
    setIsLoading(true);
    try {
      const response = await fetch(mode === 'signup' ? '/api/auth/signup' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: m, pin: p }),
      });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; field?: Field; exists?: boolean }
        | null;
      if (response.ok && data?.ok) {
        const next = new URLSearchParams(window.location.search).get('redirect');
        window.location.assign(safeNextPath(next, window.location.origin));
        return;
      }
      const message = data?.error || 'That did not work. Please try again.';
      setErrors(data?.field === 'mobile' ? { mobile: message } : data?.field === 'pin' ? { pin: message } : { form: message });
      setExists(!!data?.exists);
    } catch {
      setErrors({ form: 'Could not reach the server. Check your connection and try again.' });
    }
    inFlight.current = false;
    setPin('');
    setConfirm('');
    setIsLoading(false);
    // Inputs are disabled until this render commits, so focus on the next frame.
    requestAnimationFrame(() => pinRef.current?.focus());
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit();
  };

  const signup = mode === 'signup';
  const inputClass = (bad?: string) =>
    clsx(
      'w-full rounded-xl border bg-white px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:ring-4 disabled:bg-gray-50',
      bad ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-100',
    );
  const pinClass = (bad?: string) => clsx(inputClass(bad), 'text-center text-2xl tracking-[0.75em] placeholder:tracking-[0.5em] placeholder:text-gray-300');

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
          <div role="tablist" aria-label="Sign in or create an account" className="mb-6 grid grid-cols-2 rounded-xl bg-gray-100 p-1 text-sm font-medium">
            {(['signin', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => mode !== m && switchMode(m)}
                className={clsx(
                  'rounded-lg px-3 py-2 transition',
                  mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800',
                )}
              >
                {m === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="mobile" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-800">
                <Smartphone className="h-4 w-4 text-gray-400" aria-hidden />
                Mobile number
              </label>
              <input
                ref={mobileRef}
                id="mobile"
                name="mobile"
                type="tel"
                inputMode="tel"
                autoComplete="username"
                autoFocus
                maxLength={20}
                placeholder="98765 43210"
                value={mobile}
                onChange={(e) => {
                  setMobile(e.target.value.replace(/[^\d+\s()-]/g, ''));
                  if (errors.mobile || errors.form) setErrors({ ...errors, mobile: undefined, form: undefined });
                }}
                className={inputClass(errors.mobile)}
                aria-invalid={errors.mobile ? true : undefined}
                aria-describedby={errors.mobile ? 'mobile-error' : 'mobile-help'}
                disabled={isLoading}
              />
              {errors.mobile ? (
                <p id="mobile-error" role="alert" className="mt-1.5 text-sm text-red-600">
                  {errors.mobile}
                </p>
              ) : (
                <p id="mobile-help" className="mt-1.5 text-xs text-gray-500">
                  India by default. Use + and the country code for other countries.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="pin" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-800">
                <Lock className="h-4 w-4 text-gray-400" aria-hidden />
                {signup ? 'Choose a 4-digit PIN' : '4-digit PIN'}
              </label>
              <input
                ref={pinRef}
                id="pin"
                name="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                autoComplete={signup ? 'new-password' : 'current-password'}
                placeholder="••••"
                value={pin}
                onChange={(e) => {
                  const next = digits(e.target.value);
                  setPin(next);
                  if (errors.pin || errors.form) setErrors({ ...errors, pin: undefined, form: undefined });
                  // Signing in: the 4th digit submits, once the number looks complete.
                  if (!signup && next.length === 4 && normalizeMobile(mobile)) void submit(mobile, next, confirm);
                }}
                className={pinClass(errors.pin)}
                aria-invalid={errors.pin ? true : undefined}
                aria-describedby={errors.pin ? 'pin-error' : undefined}
                disabled={isLoading}
              />
              {errors.pin && (
                <p id="pin-error" role="alert" className="mt-1.5 text-sm text-red-600">
                  {errors.pin}
                </p>
              )}
            </div>

            {signup && (
              <div>
                <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-gray-800">
                  Type the PIN again
                </label>
                <input
                  id="confirm"
                  name="confirm"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  autoComplete="new-password"
                  placeholder="••••"
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(digits(e.target.value));
                    if (errors.confirm) setErrors({ ...errors, confirm: undefined });
                  }}
                  className={pinClass(errors.confirm)}
                  aria-invalid={errors.confirm ? true : undefined}
                  aria-describedby={errors.confirm ? 'confirm-error' : undefined}
                  disabled={isLoading}
                />
                {errors.confirm && (
                  <p id="confirm-error" role="alert" className="mt-1.5 text-sm text-red-600">
                    {errors.confirm}
                  </p>
                )}
              </div>
            )}

            {errors.form && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errors.form}
              </div>
            )}

            {exists && (
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
              >
                Sign in with this number instead
              </button>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
              {isLoading ? (signup ? 'Creating account…' : 'Signing in…') : signup ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 border-t border-gray-100 pt-5 text-xs leading-relaxed text-gray-500">
            {signup
              ? 'Your PIN is stored only as a salted, server-keyed hash. Your plans and profiles are private to your account.'
              : 'After 5 wrong PINs, sign-in for that number locks for 15 minutes. Forgot your PIN? Reset by SMS is not available yet.'}
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} TH+ LifeEngine ·{' '}
          <a href="/privacy" className="underline underline-offset-2 hover:text-gray-700">
            Privacy
          </a>
        </p>
      </div>
    </div>
  );
}
