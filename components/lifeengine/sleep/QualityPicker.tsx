"use client";

import { forwardRef } from "react";
import clsx from "clsx";
import type { SleepQuality } from "@/lib/sleep/types";
import { QUALITY_LABELS } from "./format";

const QUALITIES: SleepQuality[] = [1, 2, 3, 4, 5];

/**
 * "How well did you sleep?" as five radio tiles. Starts unselected (value
 * null) so nobody saves a 3 they never chose. The ref points at the
 * fieldset so a form can scroll to it or focus its first option.
 */
export const QualityPicker = forwardRef<
  HTMLFieldSetElement,
  {
    name: string;
    value: SleepQuality | null;
    onChange: (q: SleepQuality) => void;
    /** Shown under the tiles, in red, when the person tried to save without a rating. */
    error?: string | null;
    legend?: string;
    compact?: boolean;
  }
>(function QualityPicker({ name, value, onChange, error, legend = "How well did you sleep?", compact = false }, ref) {
  const errorId = `${name}-error`;
  return (
    <fieldset ref={ref} aria-describedby={error ? errorId : undefined} aria-invalid={error ? true : undefined}>
      <legend className="text-[13px] font-semibold text-gray-700">{legend}</legend>
      <div className="mt-2 grid grid-cols-5 gap-2">
        {QUALITIES.map((q) => {
          const selected = value === q;
          return (
            <label key={q} className="relative">
              <input
                type="radio"
                name={name}
                value={q}
                checked={selected}
                onChange={() => onChange(q)}
                className="peer sr-only"
              />
              <span
                className={clsx(
                  "flex cursor-pointer flex-col items-center justify-center rounded-xl border px-1 py-1.5 text-center transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500 peer-focus-visible:ring-offset-2",
                  compact ? "min-h-[48px]" : "min-h-[52px]",
                  selected
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500"
                    : error
                      ? "border-red-300 text-gray-600 hover:bg-gray-50"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50",
                )}
              >
                <span className="text-base font-semibold tabular-nums leading-none">{q}</span>
                <span className="mt-1 text-[11px] leading-none">{QUALITY_LABELS[q]}</span>
              </span>
            </label>
          );
        })}
      </div>
      {error ? (
        <p id={errorId} className="mt-2 text-xs font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
});

export const QUALITY_MISSING = "Choose how well you slept, from 1 (poor) to 5 (great).";
/** The short note under the tiles; the full sentence goes in the form's summary by the save button. */
export const QUALITY_REQUIRED = "Required: pick 1 to 5.";
