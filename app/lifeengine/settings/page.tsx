"use client";

import { useState } from "react";
import { Cpu, Sparkles, Trash2, Check } from "lucide-react";
import clsx from "clsx";
import { useAppVersion } from "@/components/providers/AppVersionProvider";
import { PageHeader } from "@/components/ui/PageHeader";

const ENGINES = [
  {
    value: "current" as const,
    title: "AI plan",
    body: "Best results. Writes a plan around the person's goals, health notes and routine. Takes a minute or two.",
    icon: Sparkles,
  },
  {
    value: "oss" as const,
    title: "Quick plan (no AI)",
    body: "Ready in seconds. Builds the plan from the app's own yoga, exercise and meal library.",
    icon: Cpu,
  },
];

export default function SettingsPage() {
  const { version, setVersion } = useAppVersion();
  const [confirming, setConfirming] = useState(false);

  const clearBrowserData = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Storage can be blocked (private mode); there is nothing to clear then.
    }
    window.location.reload();
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" description="Choose how plans are generated and manage data saved in this browser." />

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-gray-900">How plans are made</h2>
        <p className="mt-1 text-sm text-gray-500">Used when you create a plan. You can switch at any time.</p>
        <div role="radiogroup" aria-label="How plans are made" className="mt-4 grid gap-3 sm:grid-cols-2">
          {ENGINES.map((engine) => {
            const selected = version === engine.value;
            const Icon = engine.icon;
            return (
              <button
                key={engine.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setVersion(engine.value)}
                className={clsx(
                  "relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors",
                  selected ? "border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                )}
              >
                <span className="flex w-full items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <Icon className={clsx("h-4 w-4", selected ? "text-indigo-600" : "text-gray-400")} aria-hidden />
                    {engine.title}
                  </span>
                  {selected && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white">
                      <Check className="h-3 w-3" aria-hidden />
                    </span>
                  )}
                </span>
                <span className="text-sm text-gray-600">{engine.body}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-red-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-gray-900">Data in this browser</h2>
        <p className="mt-1 text-sm text-gray-500">
          Clears profiles, drafts, tracker entries and preferences saved on this device. Plans stored on the server are not
          affected. This cannot be undone.
        </p>
        {confirming ? (
          <div className="mt-4 flex flex-col gap-3 rounded-xl bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-red-800">Clear everything saved in this browser?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={clearBrowserData}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Yes, clear it
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            Clear browser data
          </button>
        )}
      </section>
    </div>
  );
}
