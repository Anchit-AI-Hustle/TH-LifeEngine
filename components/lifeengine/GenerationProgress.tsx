"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  ArrowRight,
  CalendarRange,
  Check,
  CircleAlert,
  Flower2,
  Info,
  ListChecks,
  LoaderCircle,
  Pencil,
  RotateCcw,
  Salad,
  Save,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";

interface GenerationProgressProps {
  /** Called once when the estimated time has run out (the request may still be going). */
  onComplete?: () => void;
  status?: "running" | "error" | "success";
  title?: string;
  /** Replaces the current stage name, for flows that report their own milestones. */
  statusText?: string;
  /** How long a typical run takes, in seconds. Drives the bar and the time left. */
  estimatedSeconds?: number;
  error?: string;
  /** Shows a Cancel button while running. */
  onCancel?: () => void;
  /** Shows a Try again button in the error state. */
  onRetry?: () => void;
  /** Shows an Edit details button in the error state. */
  onEdit?: () => void;
  successText?: string;
  /** Shows an Open plan link in the success state. */
  successHref?: string;
}

/** Share of the total time each stage takes; they add up to 1. */
const STAGES: { name: string; icon: LucideIcon; share: number }[] = [
  { name: "Reading your profile", icon: UserRound, share: 0.09 },
  { name: "Laying out the days", icon: CalendarRange, share: 0.07 },
  { name: "Yoga and movement", icon: Flower2, share: 0.34 },
  { name: "Meals and recipes", icon: Salad, share: 0.24 },
  { name: "Steps and details", icon: ListChecks, share: 0.15 },
  { name: "Saving your plan", icon: Save, share: 0.11 },
];

function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function timeLeft(seconds: number) {
  if (seconds <= 5) return "Almost done";
  if (seconds < 60) return "Less than a minute left";
  const m = Math.round(seconds / 60);
  return `About ${m} min left`;
}

export function GenerationProgress({
  onComplete,
  status = "running",
  title,
  statusText,
  estimatedSeconds = 165,
  error,
  onCancel,
  onRetry,
  onEdit,
  successText,
  successHref,
}: GenerationProgressProps) {
  const [elapsed, setElapsed] = useState(0);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  // Restart the clock every time a run starts (including a retry).
  useEffect(() => {
    if (status !== "running") return;
    setElapsed(0);
    const start = Date.now();
    let reported = false;
    const interval = setInterval(() => {
      const secs = (Date.now() - start) / 1000;
      setElapsed(secs);
      if (!reported && secs >= estimatedSeconds) {
        reported = true;
        completeRef.current?.();
      }
    }, 500);
    return () => clearInterval(interval);
  }, [status, estimatedSeconds]);

  const fraction = Math.min(1, elapsed / estimatedSeconds);
  const overdue = elapsed > estimatedSeconds;
  const progress = status === "success" ? 100 : Math.min(95, Math.round(fraction * 95));

  let stageIndex = STAGES.length - 1;
  let acc = 0;
  for (let i = 0; i < STAGES.length; i++) {
    acc += STAGES[i].share;
    if (fraction < acc) {
      stageIndex = i;
      break;
    }
  }
  if (status === "success") stageIndex = STAGES.length;

  if (status === "error") {
    return (
      <section
        role="alert"
        aria-labelledby="gen-error-title"
        className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <CircleAlert className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="gen-error-title" className="text-base font-semibold text-gray-900">
              We couldn&apos;t create your plan
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Nothing you entered was lost. Check the details and try again. A shorter plan usually finishes faster.
            </p>
            {error && (
              <p className="mt-3 break-words rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            {(onRetry || onEdit) && (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden />
                    Try again
                  </button>
                )}
                {onEdit && (
                  <button
                    type="button"
                    onClick={onEdit}
                    className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                    Edit details
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  const done = status === "success";
  const currentLabel = done
    ? successText ?? "Your plan is ready"
    : statusText ?? (overdue ? "Taking a little longer than usual" : STAGES[stageIndex].name);

  return (
    <section
      aria-labelledby="gen-title"
      aria-busy={!done}
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex items-start gap-4">
        <span
          className={clsx(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            done ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600",
          )}
        >
          {done ? <Check className="h-5 w-5" aria-hidden /> : <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="gen-title" className="text-base font-semibold text-gray-900">
            {done ? "Plan created" : title ?? "Creating your plan"}
          </h2>
          <p role="status" aria-live="polite" className="mt-0.5 text-sm text-gray-600">
            {currentLabel}
          </p>
        </div>
        {!done && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="-mr-1 inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
          >
            <X className="h-4 w-4" aria-hidden />
            Cancel
          </button>
        )}
      </div>

      <div className="mt-5">
        <div
          role="progressbar"
          aria-label="Plan progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          className="h-2 overflow-hidden rounded-full bg-gray-100"
        >
          <div
            className={clsx("h-full rounded-full transition-[width] duration-700 ease-out", done ? "bg-emerald-500" : "bg-indigo-600")}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-gray-500">
          <span className="font-medium tabular-nums text-gray-700">{progress}%</span>
          {!done && (
            <span className="tabular-nums">
              {formatClock(elapsed)} elapsed
              <span aria-hidden> · </span>
              {overdue ? "Still working" : timeLeft(estimatedSeconds - elapsed)}
            </span>
          )}
        </div>
      </div>

      <ol className="mt-5 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
        {STAGES.map((stage, idx) => {
          const state = idx < stageIndex ? "done" : idx === stageIndex ? "current" : "todo";
          const Icon = stage.icon;
          return (
            <li key={stage.name} className="flex items-center gap-2.5 text-sm">
              <span
                className={clsx(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                  state === "done" && "bg-indigo-600 text-white",
                  state === "current" && "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200",
                  state === "todo" && "bg-gray-100 text-gray-400",
                )}
                aria-hidden
              >
                {state === "done" ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              </span>
              <span
                className={clsx(
                  "min-w-0",
                  state === "done" && "text-gray-700",
                  state === "current" && "font-medium text-gray-900",
                  state === "todo" && "text-gray-400",
                )}
              >
                {stage.name}
                <span className="sr-only">{state === "done" ? " (done)" : state === "current" ? " (in progress)" : ""}</span>
              </span>
            </li>
          );
        })}
      </ol>

      {done ? (
        successHref && (
          <div className="mt-5">
            <Link
              href={successHref}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Open plan
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        )
      ) : (
        <p className="mt-5 flex items-start gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-xs text-gray-600">
          <Info className="mt-px h-4 w-4 shrink-0 text-gray-400" aria-hidden />
          <span>Keep this tab open while the plan is written. It usually takes {estimatedSeconds >= 90 ? "2 to 3 minutes" : "under a minute"}.</span>
        </p>
      )}
    </section>
  );
}
