"use client";

import { forwardRef, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import clsx from "clsx";
import { AlertTriangle, BedDouble, Check, CloudCheck, Sunrise } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { TAG_LABELS, checkEntry, formatDuration, parseClock } from "@/lib/sleep/logic";
import type { SleepQuality, SleepTag } from "@/lib/sleep/types";
import { formatNight } from "./format";
import { QUALITY_MISSING, QUALITY_REQUIRED, QualityPicker } from "./QualityPicker";

export type SleepDraft = {
  night: string;
  bedtime: string;
  wake: string;
  /** null until the person picks one: a new night starts unrated. */
  quality: SleepQuality | null;
  tags: SleepTag[];
  notes: string;
};

/** What onSave receives: always rated. */
export type SavedSleepDraft = SleepDraft & { quality: SleepQuality };

const TAGS = Object.keys(TAG_LABELS) as SleepTag[];

/** Log or edit one night. */
export const SleepForm = forwardRef<HTMLFormElement, {
  mode: "create" | "edit";
  initial: SleepDraft;
  today: string;
  /** Nights that already have an entry (other than the one being edited). */
  takenNights: Set<string>;
  onSave: (draft: SavedSleepDraft) => void;
  onCancel?: () => void;
  /** A confirmation shown right next to the save button (e.g. "Saved Sun, 1 Nov"). */
  status?: ReactNode;
}>(function SleepForm({ mode, initial, today, takenNights, onSave, onCancel, status }, ref) {
  const [draft, setDraft] = useState<SleepDraft>(initial);
  const [submitted, setSubmitted] = useState(false);
  const qualityRef = useRef<HTMLFieldSetElement>(null);
  const bedtimeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(initial);
    setSubmitted(false);
  }, [initial]);

  const check = checkEntry(draft, today);
  const overnight = check.minutes > 0 && parseClock(draft.wake) < parseClock(draft.bedtime);
  const replaces = takenNights.has(draft.night);
  const set = <K extends keyof SleepDraft>(key: K, value: SleepDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const qualityError = submitted && draft.quality === null ? QUALITY_REQUIRED : null;
  const problems = [check.error, draft.quality === null ? QUALITY_MISSING : null].filter((p): p is string => Boolean(p));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (check.error) {
      bedtimeRef.current?.focus();
      return;
    }
    if (draft.quality === null) {
      qualityRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      qualityRef.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
      return;
    }
    onSave({ ...draft, quality: draft.quality, notes: draft.notes.trim() });
  };

  return (
    <form ref={ref} onSubmit={submit} noValidate className="space-y-5" aria-label={mode === "create" ? "Log a night" : "Edit night"}>
      <Field label="Night of" helper="The evening you went to bed.">
        <Input type="date" value={draft.night} max={today} required onChange={(e) => set("night", e.target.value)} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Bedtime">
          <Input ref={bedtimeRef} type="time" value={draft.bedtime} required onChange={(e) => set("bedtime", e.target.value)} />
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

      <QualityPicker
        ref={qualityRef}
        name={mode === "create" ? "sleep-quality" : "sleep-quality-edit"}
        value={draft.quality}
        onChange={(q) => set("quality", q)}
        error={qualityError}
      />

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
      {submitted && problems.length > 0 ? (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="font-medium">{problems.length === 1 ? "One thing before saving:" : "Two things before saving:"}</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <p className="flex items-center gap-1.5 text-xs text-gray-500 sm:mr-auto">
            <CloudCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Synced to your account
          </p>
          {onCancel ? (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          <Button type="submit">{mode === "create" ? "Save night" : "Save changes"}</Button>
        </div>
        {status}
      </div>
    </form>
  );
});
