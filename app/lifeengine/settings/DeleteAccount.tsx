"use client";

import { FormEvent, useState } from "react";
import { UserX } from "lucide-react";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { clearLocal } from "@/lib/sync/client";

/**
 * Deletes the signed-in account after the person types their number and PIN
 * again. Removes profiles, plans, habits, sleep, fitness and diet data, then
 * signs out. Cannot be undone.
 */
export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (mobile.replace(/\D/g, "").length < 10) return setError("Type the mobile number you sign in with.");
    if (!/^\d{4}$/.test(pin)) return setError("Type your 4-digit PIN.");
    setBusy(true);
    try {
      const res = await fetch("/api/me/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: mobile.trim(), pin }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setPin("");
        setError(data.error || "Your account could not be deleted. Please try again.");
        return;
      }
      clearLocal();
      try {
        sessionStorage.clear();
      } catch {
        // storage blocked: nothing to clear
      }
      window.location.replace("/login?deleted=1");
    } catch {
      setError("The network request failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-6 rounded-2xl border border-red-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="delete-account-title">
      <h2 id="delete-account-title" className="text-base font-semibold text-gray-900">
        Delete my account
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        Removes your account and everything saved in it: profiles, plans, diet plans, habits, sleep and fitness logs, on every
        device. This cannot be undone.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
        >
          <UserX className="h-4 w-4" aria-hidden />
          Delete my account…
        </button>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-4 rounded-xl bg-red-50 p-4" noValidate>
          <p className="text-sm font-medium text-red-800">To confirm, type the mobile number and PIN you sign in with.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mobile number">
              <Input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="98765 43210"
              />
            </Field>
            <Field label="PIN">
              <Input
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
              />
            </Field>
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setPin("");
                setError(null);
              }}
              className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="min-h-[44px] rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {busy ? "Deleting…" : "Delete my account for good"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
