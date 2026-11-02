"use client";

import { useCallback, useEffect, useState } from "react";
import { SYNCED_EVENT } from "@/lib/sync/client";
import {
  DAY_DONE,
  PLAN_PROGRESS_EVENT,
  PLAN_PROGRESS_KEY,
  readPlanProgress,
  setDayDone as storeSetDayDone,
  setItemDone as storeSetItemDone,
  type PlanProgress,
} from "./store";

/**
 * Progress for one plan. Starts empty on the server and the first render,
 * then reads storage in an effect, so markup always matches on hydration.
 * Pass null to switch it off.
 */
export function usePlanProgress(planId: string | null) {
  const [progress, setProgress] = useState<PlanProgress>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!planId) {
      setProgress({});
      setReady(false);
      return;
    }
    const load = () => setProgress(readPlanProgress(planId));
    load();
    setReady(true);
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === PLAN_PROGRESS_KEY) load();
    };
    window.addEventListener(PLAN_PROGRESS_EVENT, load);
    window.addEventListener(SYNCED_EVENT, load);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(PLAN_PROGRESS_EVENT, load);
      window.removeEventListener(SYNCED_EVENT, load);
      window.removeEventListener("storage", onStorage);
    };
  }, [planId]);

  const setItemDone = useCallback(
    (dayIndex: number, itemId: string, done: boolean, allItemIds: string[]) => {
      if (planId) setProgress(storeSetItemDone(planId, dayIndex, itemId, done, allItemIds));
    },
    [planId],
  );

  const setDayDone = useCallback(
    (dayIndex: number, done: boolean, allItemIds: string[]) => {
      if (planId) setProgress(storeSetDayDone(planId, dayIndex, done, allItemIds));
    },
    [planId],
  );

  const isDayDone = useCallback((dayIndex: number) => Boolean(progress[String(dayIndex)]?.[DAY_DONE]), [progress]);

  return { enabled: Boolean(planId), ready, progress, setItemDone, setDayDone, isDayDone };
}
