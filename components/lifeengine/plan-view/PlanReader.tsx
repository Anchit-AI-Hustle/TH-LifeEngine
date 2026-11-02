"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { usePlanProgress } from "@/lib/planProgress/usePlanProgress";
import { DayPager, DayStepper, PlanDayNav, panelId, tabId, type DayNavItem } from "./PlanDayNav";
import { DayProgressContext, planIdFromPath, type DayProgressContextValue } from "./progress";

/**
 * Day navigation plus the selected day's panel. Opens on today when the plan
 * has dates, and the Left/Right arrow keys step through days when focus is
 * not in a form field.
 */
export function PlanReader({
  items,
  idPrefix,
  renderDay,
  layout = "responsive",
  sticky = true,
  onChange,
  progressId,
}: {
  items: DayNavItem[];
  idPrefix: string;
  renderDay: (index: number, parts: { headingId: string; stepper: ReactNode }) => ReactNode;
  layout?: "responsive" | "horizontal";
  sticky?: boolean;
  /** Told about the selected day, including the first one (today when the plan has dates). */
  onChange?: (index: number) => void;
  /**
   * Where "Done" ticks are saved. Defaults to the plan id in the URL on the
   * plan pages; pass null to hide the ticks (for example in a preview).
   */
  progressId?: string | null;
}) {
  const pathname = usePathname();
  const planId = progressId === undefined ? planIdFromPath(pathname) : progressId;
  const tracker = usePlanProgress(planId);
  const todayIndex = items.findIndex((item) => item.isToday);
  const [selected, setSelected] = useState(todayIndex >= 0 ? todayIndex : 0);
  const current = Math.min(selected, Math.max(0, items.length - 1));
  const panelRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    onChangeRef.current?.(current);
  }, [current]);

  const select = useCallback(
    (index: number, opts: { scroll?: boolean } = {}) => {
      const next = Math.max(0, Math.min(items.length - 1, index));
      setSelected(next);
      // If the reader has scrolled past the top of the day, bring the new day's start into view.
      if (opts.scroll !== false) {
        requestAnimationFrame(() => {
          const panel = panelRef.current;
          if (panel && panel.getBoundingClientRect().top < 0) panel.scrollIntoView({ block: "start", behavior: "smooth" });
        });
      }
    },
    [items.length],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true'], [role='tablist'], summary")) return;
      // An open dialog owns the keyboard (closed ones can stay in the DOM, hidden).
      const dialogs = Array.from(document.querySelectorAll<HTMLElement>("[aria-modal='true']"));
      if (dialogs.some((el) => (el.checkVisibility ? el.checkVisibility({ visibilityProperty: true } as any) : el.getClientRects().length > 0))) return;
      event.preventDefault();
      select(current + (event.key === "ArrowRight" ? 1 : -1));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [current, select]);

  const navItems = useMemo(
    () => (tracker.enabled ? items.map((item, index) => ({ ...item, done: tracker.isDayDone(index) })) : items),
    [items, tracker],
  );

  const { setItemDone, setDayDone } = tracker;
  const dayDone = tracker.progress[String(current)];
  const progressValue = useMemo<DayProgressContextValue | null>(
    () =>
      tracker.enabled
        ? {
            dayIndex: current,
            done: dayDone ?? {},
            setItemDone: (itemId, done, allItemIds) => setItemDone(current, itemId, done, allItemIds),
            setDayDone: (done, allItemIds) => setDayDone(current, done, allItemIds),
          }
        : null,
    [tracker.enabled, current, dayDone, setItemDone, setDayDone],
  );

  if (!items.length) return null;
  const headingId = `${idPrefix}-day-title`;
  const stepper = (
    <DayStepper current={current} total={items.length} onPrev={() => select(current - 1)} onNext={() => select(current + 1)} />
  );

  return (
    <div className={clsx(layout === "responsive" && "lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start lg:gap-8 xl:grid-cols-[15rem_minmax(0,1fr)]")}>
      <div
        className={clsx(
          sticky && "sticky top-14 z-20 -mx-4 border-b border-gray-200 bg-[var(--bg)]/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 print:static",
          sticky && layout === "responsive" && "lg:top-8 lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none",
          sticky && layout === "horizontal" && "lg:top-0 lg:-mx-8 lg:px-8",
        )}
      >
        <PlanDayNav
          items={navItems}
          current={current}
          onSelect={(index) => select(index, { scroll: true })}
          idPrefix={idPrefix}
          layout={layout}
        />
      </div>
      <div
        ref={panelRef}
        id={panelId(idPrefix)}
        role="tabpanel"
        aria-labelledby={tabId(idPrefix, current)}
        className={clsx("mt-4 min-w-0 scroll-mt-32 lg:scroll-mt-8", layout === "responsive" && "lg:mt-0")}
      >
        <DayProgressContext.Provider value={progressValue}>{renderDay(current, { headingId, stepper })}</DayProgressContext.Provider>
        <DayPager items={items} current={current} onSelect={(index) => select(index)} />
      </div>
    </div>
  );
}
