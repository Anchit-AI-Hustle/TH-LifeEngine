"use client";

import { useId, useState } from "react";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { durationMinutes, formatClock, formatDuration, parseClock } from "@/lib/sleep/logic";
import type { SleepEntry } from "@/lib/sleep/types";
import { formatDayNumber, formatNight, formatWeekday } from "./format";

/**
 * Bar chart of nightly durations with a dashed goal line, in plain CSS.
 * The bars are hidden from assistive tech; a table (behind a toggle) carries
 * the same data, and the caption under the chart summarises it.
 */
export function SleepChart({ nights, entries, goalMinutes }: { nights: string[]; entries: SleepEntry[]; goalMinutes: number }) {
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();
  const byNight = new Map(entries.map((e) => [e.night, e]));
  const rows = nights.map((night) => {
    const e = byNight.get(night);
    return { night, entry: e, minutes: e ? durationMinutes(e.bedtime, e.wake) : 0 };
  });
  const maxMinutes = Math.max(goalMinutes + 60, ...rows.map((r) => r.minutes));
  const scaleHours = Math.ceil(maxMinutes / 120) * 2;
  const scale = scaleHours * 60;
  const ticks = Array.from({ length: scaleHours / 2 + 1 }, (_, i) => i * 2);
  const dense = nights.length > 10;
  const goalPct = (goalMinutes / scale) * 100;

  return (
    <figure>
      <div className="flex gap-2" aria-hidden>
        {/* y axis */}
        <div className="relative h-44 w-7 shrink-0">
          {ticks.map((h) => (
            <span
              key={h}
              className="absolute right-0 translate-y-1/2 text-[10px] leading-none tabular-nums text-gray-400"
              style={{ bottom: `${(h / scaleHours) * 100}%` }}
            >
              {h}h
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative h-44 border-b border-gray-200">
            {ticks.slice(1).map((h) => (
              <span key={h} className="absolute inset-x-0 border-t border-gray-100" style={{ bottom: `${(h / scaleHours) * 100}%` }} />
            ))}
            <span className="absolute inset-x-0 z-10 border-t-2 border-dashed border-emerald-500" style={{ bottom: `${goalPct}%` }} />
            <div className={clsx("absolute inset-0 flex items-end", dense ? "gap-[2px] sm:gap-1" : "gap-2 sm:gap-3")}>
              {rows.map((r) => (
                <div key={r.night} className="flex h-full min-w-0 flex-1 items-end justify-center">
                  {r.entry ? (
                    <span
                      title={`${formatNight(r.night)}: ${formatDuration(r.minutes)}`}
                      className={clsx(
                        "w-full rounded-t-md transition-[height] duration-500",
                        dense ? "max-w-[14px]" : "max-w-[40px]",
                        r.minutes >= goalMinutes - 15 ? "bg-indigo-500" : "bg-amber-400",
                      )}
                      style={{ height: `${Math.max(2, (r.minutes / scale) * 100)}%` }}
                    />
                  ) : (
                    <span className={clsx("h-1 w-full rounded-full bg-gray-200", dense ? "max-w-[14px]" : "max-w-[40px]")} />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className={clsx("mt-1.5 flex", dense ? "gap-[2px] sm:gap-1" : "gap-2 sm:gap-3")}>
            {rows.map((r, i) => (
              <span key={r.night} className="min-w-0 flex-1 text-center text-[10px] leading-tight text-gray-500">
                {dense ? (i % 5 === 0 || i === rows.length - 1 ? formatDayNumber(r.night) : "") : formatWeekday(r.night)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <figcaption className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" aria-hidden />
          Met goal
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" aria-hidden />
          Short of goal
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 border-t-2 border-dashed border-emerald-500" aria-hidden />
          Goal {formatDuration(goalMinutes)}
        </span>
      </figcaption>

      <button
        type="button"
        aria-expanded={showTable}
        aria-controls={tableId}
        onClick={() => setShowTable(!showTable)}
        className="mt-2 inline-flex min-h-[40px] items-center gap-1 rounded-lg text-sm font-medium text-gray-700 hover:text-gray-900"
      >
        {showTable ? "Hide table" : "View as a table"}
        <ChevronDown className={clsx("h-4 w-4 transition-transform", showTable && "rotate-180")} aria-hidden />
      </button>
      {showTable ? (
        <div id={tableId} className="mt-2 overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-left text-sm" aria-label="Sleep per night">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th scope="col" className="px-3 py-2">Night</th>
                <th scope="col" className="px-3 py-2">Asleep</th>
                <th scope="col" className="px-3 py-2">Bedtime</th>
                <th scope="col" className="px-3 py-2">Wake</th>
              </tr>
            </thead>
            <tbody>
              {[...rows].reverse().map((r) => (
                <tr key={r.night} className="border-t border-gray-100">
                  <th scope="row" className="whitespace-nowrap px-3 py-2 font-medium text-gray-900">{formatNight(r.night)}</th>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-gray-700">{r.entry ? formatDuration(r.minutes) : "Not logged"}</td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-gray-700">{r.entry ? formatClock(parseClock(r.entry.bedtime)) : ""}</td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-gray-700">{r.entry ? formatClock(parseClock(r.entry.wake)) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </figure>
  );
}
