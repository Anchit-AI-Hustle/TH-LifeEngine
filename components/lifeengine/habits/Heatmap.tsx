import clsx from "clsx";
import type { HeatCell } from "@/lib/habits/logic";
import { formatDay } from "./palette";

const ROW_LABELS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];
const MONTH_FMT = new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "UTC" });

function monthOf(key: string) {
  const [y, m] = key.split("-").map(Number);
  return MONTH_FMT.format(new Date(Date.UTC(y, m - 1, 1)));
}

/**
 * A 12-week calendar heatmap in plain CSS grid. Purely visual: the caller
 * renders a text summary next to it, and each cell carries a title.
 */
export function Heatmap({
  columns,
  cellClass,
  describe,
  label,
}: {
  columns: HeatCell[][];
  /** Background class for a cell. */
  cellClass: (cell: HeatCell) => string;
  /** Tooltip text for a cell, e.g. "Mon, 2 Nov: 3 of 4 habits". */
  describe: (cell: HeatCell) => string;
  label: string;
}) {
  // Month label above the first column that starts in a new month.
  // Labels need about three columns of room, so skip one that would crowd the last.
  let lastLabel = -10;
  const months = columns.map((col, i) => {
    const m = monthOf(col[0].date);
    const prev = i > 0 ? monthOf(columns[i - 1][0].date) : null;
    if (m === prev || i - lastLabel < 3) return "";
    lastLabel = i;
    return m;
  });

  return (
    <figure className="w-full max-w-[20rem]" aria-label={label}>
      <div
        className="grid w-full gap-[3px] sm:gap-1"
        style={{ gridTemplateColumns: `1.75rem repeat(${columns.length}, minmax(0, 1fr))` }}
        aria-hidden
      >
        <span />
        {months.map((m, i) => (
          <span key={`m${i}`} className="whitespace-nowrap text-[10px] leading-4 text-gray-500">
            {m}
          </span>
        ))}
        {ROW_LABELS.map((row, r) => (
          <div key={`r${r}`} className="contents">
            <span className="flex items-center text-[10px] leading-none text-gray-500">{row}</span>
            {columns.map((col) => {
              const cell = col[r];
              return (
                <span
                  key={cell.date}
                  title={cell.future ? undefined : `${formatDay(cell.date)}: ${describe(cell)}`}
                  className={clsx(
                    "aspect-square w-full rounded-[3px]",
                    cell.future ? "bg-transparent ring-1 ring-inset ring-gray-100" : cellClass(cell),
                  )}
                />
              );
            })}
          </div>
        ))}
      </div>
    </figure>
  );
}
