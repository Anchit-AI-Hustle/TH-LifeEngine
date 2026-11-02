'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import clsx from 'clsx';
import { clearLocal, flushPending } from '@/lib/sync/client';

export default function LogoutButton({ className }: { className?: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    setFailed(false);
    try {
      // Save the last changes to the account while the session still exists.
      await flushPending();
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (response.ok) {
        // The account keeps its copy; this device should not.
        clearLocal();
        // A full navigation drops every bit of client state from the session.
        window.location.assign('/login');
        return;
      }
      setFailed(true);
    } catch {
      setFailed(true);
    }
    setIsLoading(false);
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoading}
      className={clsx(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-60',
        className,
      )}
    >
      <LogOut className="h-[18px] w-[18px] shrink-0" aria-hidden />
      <span>{isLoading ? 'Signing out…' : failed ? 'Sign out failed, retry' : 'Sign out'}</span>
    </button>
  );
}
