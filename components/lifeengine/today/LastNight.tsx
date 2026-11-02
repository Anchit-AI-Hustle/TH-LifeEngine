"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, ArrowRight, BedDouble, CheckCircle2, CloudCheck, Moon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { QUALITY_MISSING, QUALITY_REQUIRED, QualityPicker } from "@/components/lifeengine/sleep/QualityPicker";
import { QUALITY_LABELS, formatNight } from "@/components/lifeengine/sleep/format";
import { checkEntry, durationMinutes, formatClock, formatDuration, parseClock } from "@/lib/sleep/logic";
import type { SleepEntry, SleepQuality } from "@/lib/sleep/types";
import { CardHeader, cardClass, textLink } from "./ui";

export type QuickLog = { bedtime: string; wake: string; quality: SleepQuality };

/** Bedtime, wake time and a rating for one night: everything else can be added on the Sleep page. */
export function QuickSleepLog({
  night,
  today,
  defaults,
  onSave,
  idPrefix = "quick-sleep",
}: {
  night: string;
  today: string;
  defaults: { bedtime: string; wake: string };
  onSave: (log: QuickLog) => void;
  idPrefix?: string;
}) {
  const [bedtime, setBedtime] = useState(defaults.bedtime);
  const [wake, setWake] = useState(defaults.wake);
  const [quality, setQuality] = useState<SleepQuality | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const qualityRef = useRef<HTMLFieldSetElement>(null);
  const bedRef = useRef<HTMLInputElement>(null);

  const check = checkEntry({ night, bedtime, wake }, today);
  const problems = [check.error, quality === null ? QUALITY_MISSING : null].filter((p): p is string => Boolean(p));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (check.error) {
      bedRef.current?.focus();
      return;
    }
    if (quality === null) {
      qualityRef.current?.querySelector<HTMLInputElement>("input")?.focus();
      return;
    }
    onSave({ bedtime, wake, quality });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4" aria-label={`Log ${formatNight(night)}`}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Bedtime">
          <Input ref={bedRef} id={`${idPrefix}-bed`} type="time" value={bedtime} required onChange={(e) => setBedtime(e.target.value)} />
        </Field>
        <Field label="Wake time">
          <Input id={`${idPrefix}-wake`} type="time" value={wake} required onChange={(e) => setWake(e.target.value)} />
        </Field>
      </div>
      <p className="flex items-center gap-2 text-sm text-gray-600" aria-live="polite">
        <BedDouble className="h-4 w-4 shrink-0 text-indigo-600" aria-hidden />
        {check.minutes > 0 && !check.error ? (
          <span>
            <span className="font-semibold tabular-nums text-gray-900">{formatDuration(check.minutes)}</span> asleep
          </span>
        ) : (
          <span className={clsx(submitted && check.error && "text-red-700")}>{check.error ?? "Enter your times"}</span>
        )}
      </p>
      <QualityPicker
        ref={qualityRef}
        name={`${idPrefix}-quality`}
        value={quality}
        onChange={setQuality}
        error={submitted && quality === null ? QUALITY_REQUIRED : null}
        compact
      />
      {submitted && problems.length > 0 ? (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{problems.length === 1 ? "One thing before saving: " : "Before saving: "}{problems.join(" ")}</span>
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-1.5 text-xs text-gray-500">
          <CloudCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Synced to your account
        </p>
        <Button type="submit">Save night</Button>
      </div>
    </form>
  );
}

/** Last night at a glance, or a quick way to log it. */
export function LastNightCard({
  entry,
  night,
  today,
  goalMinutes,
  defaults,
  justSaved,
  onSave,
}: {
  entry: SleepEntry | undefined;
  night: string;
  today: string;
  goalMinutes: number;
  defaults: { bedtime: string; wake: string };
  justSaved: boolean;
  onSave: (log: QuickLog) => void;
}) {
  const minutes = entry ? durationMinutes(entry.bedtime, entry.wake) : 0;
  const gap = goalMinutes - minutes;
  return (
    <section aria-labelledby="last-night-title" className={cardClass}>
      <CardHeader
        id="last-night-title"
        title="Last night"
        description={entry ? formatNight(night) : `${formatNight(night)} is not logged yet. It takes a few seconds.`}
        aside={
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Moon className="h-5 w-5" aria-hidden />
          </span>
        }
      />
      {entry ? (
        <>
          <p className="mt-4 text-2xl font-semibold tabular-nums text-gray-900">{formatDuration(minutes)}</p>
          <p className="mt-1 text-sm tabular-nums text-gray-600">
            {formatClock(parseClock(entry.bedtime))} to {formatClock(parseClock(entry.wake))}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
              Quality {entry.quality}/5 · {QUALITY_LABELS[entry.quality]}
            </span>
            <span
              className={clsx(
                "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                gap > 15 ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700",
              )}
            >
              {gap > 15 ? `${formatDuration(gap)} under your ${formatDuration(goalMinutes)} goal` : "On target"}
            </span>
          </div>
          {justSaved ? (
            <p role="status" className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              Saved. Synced to your account.
            </p>
          ) : null}
          <div className="mt-3">
            <Link href="/lifeengine/sleep" className={textLink}>
              {justSaved ? "Add tags or notes" : "Sleep log and insights"}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </>
      ) : (
        <div className="mt-4">
          <QuickSleepLog night={night} today={today} defaults={defaults} onSave={onSave} />
        </div>
      )}
    </section>
  );
}
