"use client";

import { forwardRef, useEffect, useState, type FormEvent } from "react";
import clsx from "clsx";
import { AlertTriangle, BedDouble, Check, Sunrise } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { TAG_LABELS, checkEntry, formatDuration, parseClock } from "@/lib/sleep/logic";
import type { SleepQuality, SleepTag } from "@/lib/sleep/types";
import { QUALITY_LABELS, formatNight } from "./format";

export type SleepDraft = {
  night: string;
  bedtime: string;
  wake: string;
  quality: SleepQuality;
  tags: SleepTag[];
  notes: string;
};

const TAGS = Object.keys(TAG_LABELS) as SleepTag[];
const QUALITIES: SleepQuality[] = [1, 2, 3, 4, 5];

/** Log or edit one night. */
export const SleepForm = forwardRef<HTMLFormElement, {
  mode: "create" | "edit";
  initial: SleepDraft;
  today: string;
  /** Nights that already have an entry (other than the one being edited). */
  takenNights: Set<string>;
  onSave: (draft: SleepDraft) => void;
  onCancel?: () => void;
}>(function SleepForm({ mode, initial, today, takenNights, onSave, onCancel }, ref) {
  const [draft, setDraft] = useState<SleepDraft>(initial);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setDraft(initial);
    setSubmitted(false);
  }, [initial]);

  const check = checkEntry(draft, today);
  const overnight = check.minutes > 0 && parseClock(draft.wake) < parseClock(draft.bedtime);
  const replaces = takenNights.has(draft.night);
  const set = <K extends keyof SleepDraft>(key: K, value: SleepDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (check.error) return;
    onSave({ ...draft, notes: draft.notes.trim() });
  };

  return (
    <form ref={ref} onSubmit={submit} noValidate className="space-y-5" aria-label={mode === "create" ? "Log a night" : "Edit night"}>
      <Field label="Night of" helper="The evening you went to bed.">
        <Input type="date" value={draft.night} max={today} required onChange={(e) => set("night", e.target.value)} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Bedtime">
          <Input type="time" value={draft.bedtime} required onChange={(e) => set("bedtime", e.target.value)} />
        </Field>
        <Field label="Wake time">
          <Input type="time" value={draft.wake} required onChange={(e) => set("wake", e.target.value)} />
        </Field>
      </div>

      <div
        className={clsx(
          "flex items-center gap-3 rounded-xl px-4 py-3",
          check.error && submitted ? "bg-red-50" : "bg-gray-50",
        )}
        aria-live="polite"
      >
        <BedDouble className="h-5 w-5 shrink-0 text-indigo-600" aria-hidden />
        <div className="min-w-0 text-sm">
          {check.minutes > 0 && !check.error ? (
            <>
              <span className="font-semibold tabular-nums text-gray-900">{formatDuration(check.minutes)}</span>
              <span className="text-gray-600"> asleep</span>
              {overnight ? (
                <span className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                  <Sunrise className="h-3.5 w-3.5" aria-hidden />
                  Wakes the next morning
                </span>
              ) : null}
            </>
          ) : (
            <span className={check.error && submitted ? "text-red-700" : "text-gray-600"}>
              {check.error ?? "Enter your times"}
            </span>
          )}
        </div>
      </div>
      {check.warning && !check.error ? (
        <p className="flex items-start gap-2 text-xs text-amber-700">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {check.warning}
        </p>
      ) : null}

      <fieldset>
        <legend className="text-[13px] font-semibold text-gray-700">How well did you sleep?</legend>
        <div className="mt-2 grid grid-cols-5 gap-2">
          {QUALITIES.map((q) => {
            const selected = draft.quality === q;
            return (
              <label key={q} className="relative">
                <input
                  type="radio"
                  name="sleep-quality"
                  value={q}
                  checked={selected}
                  onChange={() => set("quality", q)}
                  className="peer sr-only"
                />
                <span
                  className={clsx(
                    "flex min-h-[52px] cursor-pointer flex-col items-center justify-center rounded-xl border px-1 py-1.5 text-center transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500 peer-focus-visible:ring-offset-2",
                    selected ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500" : "border-gray-200 text-gray-600 hover:bg-gray-50",
                  )}
                >
                  <span className="text-base font-semibold tabular-nums leading-none">{q}</span>
                  <span className="mt-1 text-[11px] leading-none">{QUALITY_LABELS[q]}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-[13px] font-semibold text-gray-700">Anything that might have affected it?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {TAGS.map((tag) => {
            const on = draft.tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={on}
                onClick={() => set("tags", on ? draft.tags.filter((t) => t !== tag) : [...draft.tags, tag])}
                className={clsx(
                  "inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors",
                  on ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200" : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                )}
              >
                {on ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
                {TAG_LABELS[tag]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <Field label="Notes" helper="Optional. Dreams, wake-ups, room too warm.">
        <Textarea value={draft.notes} maxLength={500} rows={2} onChange={(e) => set("notes", e.target.value)} />
      </Field>

      {replaces ? (
        <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {formatNight(draft.night)} is already logged. Saving replaces that entry.
        </p>
      ) : null}
      {submitted && check.error ? (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {check.error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit">{mode === "create" ? "Save night" : "Save changes"}</Button>
      </div>
    </form>
  );
});
