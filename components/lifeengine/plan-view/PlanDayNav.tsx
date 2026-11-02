"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type DayNavItem = { label: string; sublabel?: string; short?: string; isToday?: boolean };

export const tabId = (prefix: string, index: number) => `${prefix}-tab-${index}`;
export const panelId = (prefix: string) => `${prefix}-panel`;

/**
 * Day picker. One tab list that is a horizontally scrolling chip row on
 * phones and tablets and, with layout="responsive", a sticky vertical list
 * from lg up. Arrow keys, Home and End move between days.
 */
export function PlanDayNav({
  items,
  current,
  onSelect,
  idPrefix,
  layout = "responsive",
  label = "Plan days",
}: {
  items: DayNavItem[];
  current: number;
  onSelect: (index: number) => void;
  idPrefix: string;
  layout?: "responsive" | "horizontal";
  label?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const vertical = layout === "responsive";

  // Keep the selected day visible inside the scrolling list without moving the page.
  useEffect(() => {
    const list = listRef.current;
    const tab = list?.querySelector<HTMLElement>(`#${CSS.escape(tabId(idPrefix, current))}`);
    if (!list || !tab) return;
    if (list.scrollWidth > list.clientWidth) {
      const left = tab.offsetLeft - list.offsetLeft;
      const target = left - (list.clientWidth - tab.offsetWidth) / 2;
      list.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
    }
    if (list.scrollHeight > list.clientHeight) {
      const top = tab.offsetTop - list.offsetTop;
      if (top < list.scrollTop || top + tab.offsetHeight > list.scrollTop + list.clientHeight) {
        list.scrollTo({ top: Math.max(0, top - list.clientHeight / 2), behavior: "smooth" });
      }
    }
  }, [current, idPrefix]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = items.length - 1;
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = current >= last ? 0 : current + 1;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = current <= 0 ? last : current - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next === null) return;
    event.preventDefault();
    onSelect(next);
    requestAnimationFrame(() => document.getElementById(tabId(idPrefix, next!))?.focus());
  };

  return (
    <nav aria-label={label} className="print:hidden">
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className={clsx(
          "flex gap-2 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          vertical &&
            "lg:max-h-[calc(100vh-4rem)] lg:flex-col lg:gap-1 lg:overflow-y-auto lg:overflow-x-visible lg:rounded-2xl lg:border lg:border-gray-200 lg:bg-white lg:p-2 lg:shadow-sm",
        )}
      >
        {items.map((item, index) => {
          const selected = index === current;
          return (
            <button
              key={index}
              id={tabId(idPrefix, index)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId(idPrefix)}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(index)}
              className={clsx(
                "relative flex min-h-[48px] min-w-0 shrink-0 flex-col items-start justify-center rounded-xl border px-3.5 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100",
                selected
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50",
                vertical && "lg:w-full lg:border-transparent lg:ring-0",
                vertical && selected && "lg:border-transparent lg:bg-indigo-50",
                vertical && !selected && "lg:bg-transparent",
              )}
            >
              <span className="flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold">
                {item.label}
                {item.isToday && (
                  <span className={clsx("h-1.5 w-1.5 rounded-full", selected ? "bg-indigo-600" : "bg-indigo-500")} aria-hidden />
                )}
              </span>
              {(item.short || item.sublabel || item.isToday) && (
                <span className={clsx("max-w-[11rem] truncate whitespace-nowrap text-xs lg:max-w-full", selected ? "text-indigo-600" : "text-gray-500")}>
                  {item.isToday ? "Today" : null}
                  {item.isToday && (item.short || item.sublabel) ? " · " : null}
                  {vertical ? (
                    <>
                      <span className="lg:hidden">{item.short ?? item.sublabel}</span>
                      <span className="hidden lg:inline">{item.sublabel ?? item.short}</span>
                    </>
                  ) : (
                    item.short ?? item.sublabel
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** Small previous/next icon buttons for the day title. */
export function DayStepper({
  current,
  total,
  onPrev,
  onNext,
}: {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const base =
    "flex h-10 w-10 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100";
  return (
    <div className="flex shrink-0 items-center gap-2 print:hidden">
      <span className="hidden text-sm tabular-nums text-gray-500 sm:inline">
        {current + 1} of {total}
      </span>
      <button type="button" className={base} onClick={onPrev} disabled={current === 0} aria-label="Previous day">
        <ChevronLeft className="h-5 w-5" aria-hidden />
      </button>
      <button type="button" className={base} onClick={onNext} disabled={current >= total - 1} aria-label="Next day">
        <ChevronRight className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );
}

/** Full-width previous/next at the end of a day, so a long day does not end in a dead end. */
export function DayPager({
  items,
  current,
  onSelect,
}: {
  items: DayNavItem[];
  current: number;
  onSelect: (index: number) => void;
}) {
  const prev = current > 0 ? items[current - 1] : null;
  const next = current < items.length - 1 ? items[current + 1] : null;
  if (!prev && !next) return null;
  const card =
    "flex min-h-[56px] min-w-0 flex-1 items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100";
  return (
    <div className="mt-6 flex gap-3 print:hidden">
      {prev ? (
        <button type="button" className={card} onClick={() => onSelect(current - 1)}>
          <ChevronLeft className="h-5 w-5 shrink-0 text-gray-400" aria-hidden />
          <span className="min-w-0 text-left">
            <span className="block text-xs text-gray-500">Previous</span>
            <span className="block truncate text-sm font-semibold text-gray-900">{prev.label}</span>
          </span>
        </button>
      ) : (
        <span className="flex-1" />
      )}
      {next ? (
        <button type="button" className={clsx(card, "justify-end")} onClick={() => onSelect(current + 1)}>
          <span className="min-w-0 text-right">
            <span className="block text-xs text-gray-500">Next</span>
            <span className="block truncate text-sm font-semibold text-gray-900">{next.label}</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" aria-hidden />
        </button>
      ) : (
        <span className="flex-1" />
      )}
    </div>
  );
}
