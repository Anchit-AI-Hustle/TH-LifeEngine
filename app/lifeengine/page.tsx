"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatLongDay } from "@/components/lifeengine/habits/palette";
import { FirstRun, StartSomething } from "@/components/lifeengine/today/GetStarted";
import { LastNightCard, type QuickLog } from "@/components/lifeengine/today/LastNight";
import { TodayHabits } from "@/components/lifeengine/today/TodayHabits";
import { TodayPlanCard } from "@/components/lifeengine/today/TodayPlanCard";
import { WeekSummary } from "@/components/lifeengine/today/WeekSummary";
import { useTodayPlan } from "@/components/lifeengine/today/useTodayPlan";
import { dateKey, dayTotals, habitStreaks, plural, toggleHabitDay } from "@/lib/habits/logic";
import { loadHabits, newId, saveHabits } from "@/lib/habits/store";
import { HABIT_TEMPLATES } from "@/lib/habits/templates";
import type { Habit, HabitTemplate, HabitsState } from "@/lib/habits/types";
import { addDays, durationMinutes, formatDuration, lastNightEntry, upsertEntry } from "@/lib/sleep/logic";
import { loadSleep, newId as newSleepId, saveSleep } from "@/lib/sleep/store";
import type { SleepState } from "@/lib/sleep/types";
import { SYNCED_EVENT } from "@/lib/sync/client";

/** Templates offered first to someone with no habits. */
const STARTER_IDS = ["water", "walk-after-meals", "pranayama", "sleep-by-11", "morning-sun", "fruit"];

function greeting(now: Date) {
  const h = now.getHours();
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function TodayPage() {
  const [habits, setHabits] = useState<HabitsState | null>(null);
  const [sleep, setSleep] = useState<SleepState | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [notice, setNotice] = useState<{ id: number; text: string } | null>(null);
  const [announce, setAnnounce] = useState("");
  const [sleepSaved, setSleepSaved] = useState(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { plan, retry } = useTodayPlan();

  // Storage and the clock are read only in the browser, after mount.
  useEffect(() => {
    const load = () => {
      setHabits(loadHabits().state);
      setSleep(loadSleep().state);
      setNow(new Date());
    };
    load();
    const refreshDay = () => setNow(new Date());
    window.addEventListener(SYNCED_EVENT, load);
    window.addEventListener("focus", refreshDay);
    document.addEventListener("visibilitychange", refreshDay);
    return () => {
      window.removeEventListener(SYNCED_EVENT, load);
      window.removeEventListener("focus", refreshDay);
      document.removeEventListener("visibilitychange", refreshDay);
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!announce) return;
    const t = setTimeout(() => setAnnounce(""), 4000);
    return () => clearTimeout(t);
  }, [announce]);

  const today = now ? dateKey(now) : "";
  const lastNight = today ? addDays(today, -1) : "";

  const showNotice = useCallback((text: string) => {
    setNotice({ id: Date.now(), text });
    setAnnounce(text);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 4000);
  }, []);

  const dismissNotice = useCallback(() => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice(null);
  }, []);

  const commitHabits = (next: HabitsState) => {
    setHabits(next);
    if (!saveHabits(next)) setSaveFailed(true);
  };

  const active = useMemo(() => habits?.habits.filter((h) => !h.archived) ?? [], [habits]);

  const suggestions = useMemo(() => {
    const ids = new Set(active.map((h) => h.templateId).filter(Boolean));
    const names = new Set(active.map((h) => h.name.toLowerCase()));
    const unused = HABIT_TEMPLATES.filter((t) => !ids.has(t.id) && !names.has(t.name.toLowerCase()));
    const rank = (id: string) => (STARTER_IDS.includes(id) ? STARTER_IDS.indexOf(id) : STARTER_IDS.length);
    return [...unused].sort((a, b) => rank(a.id) - rank(b.id)).slice(0, 3);
  }, [active]);

  const toggle = (habit: Habit) => {
    if (!habits || !today) return;
    const next = toggleHabitDay(habit, today);
    commitHabits({ ...habits, habits: habits.habits.map((h) => (h.id === habit.id ? next : h)) });
    dismissNotice();
    if (!next.done.includes(today)) {
      setAnnounce(`${habit.name} unticked for today.`);
      return;
    }
    const streak = habitStreaks(next, today);
    const others = active.filter((h) => h.id !== habit.id);
    const allDone = others.every((h) => h.done.includes(today));
    setAnnounce(`${habit.name} done. ${plural(streak.current, streak.unit)} streak.${allDone ? " All habits done for today." : ""}`);
  };

  const addTemplate = (t: HabitTemplate) => {
    if (!habits || !today) return;
    const habit: Habit = {
      id: newId(),
      name: t.name,
      icon: t.icon,
      color: t.color,
      target: t.target,
      reminder: t.reminder,
      createdOn: today,
      archived: false,
      done: [],
      challenges: [],
      templateId: t.id,
    };
    commitHabits({ ...habits, habits: [...habits.habits, habit] });
    showNotice(`Added "${t.name}". Tick it off when it is done.`);
  };

  const logSleep = (log: QuickLog) => {
    if (!sleep || !lastNight) return;
    const entries = upsertEntry(sleep.entries, {
      id: newSleepId(),
      night: lastNight,
      bedtime: log.bedtime,
      wake: log.wake,
      quality: log.quality,
      tags: [],
      notes: "",
      updatedAt: new Date().toISOString(),
    });
    const next = { ...sleep, entries };
    setSleep(next);
    if (!saveSleep(next)) setSaveFailed(true);
    setSleepSaved(true);
    setAnnounce(`Last night saved: ${formatDuration(durationMinutes(log.bedtime, log.wake))} asleep.`);
  };

  const loading = !habits || !sleep || !now;
  const hasLocal = active.length > 0 || (sleep?.entries.length ?? 0) > 0;
  const firstRun = !loading && !hasLocal && plan.status === "none";
  const waitingForPlan = !loading && !hasLocal && plan.status === "loading";

  const sleepEntry = sleep && today ? lastNightEntry(sleep.entries, today) : undefined;
  const description = useMemo(() => {
    if (loading || waitingForPlan) return "Your day at a glance.";
    if (firstRun) return "Nothing here yet. Three small steps below set up your day.";
    const parts: string[] = [];
    if (active.length) {
      const { done, total } = dayTotals(active, today);
      parts.push(
        done === total ? (total === 1 ? "Your habit is done" : `All ${plural(total, "habit")} done`) : `${done} of ${plural(total, "habit")} done`,
      );
    }
    parts.push(sleepEntry ? `${formatDuration(durationMinutes(sleepEntry.bedtime, sleepEntry.wake))} of sleep last night` : "Last night not logged yet");
    return `${parts.join(" · ")}.`;
  }, [loading, waitingForPlan, firstRun, active, today, sleepEntry]);

  const defaults = sleep?.entries[0]
    ? { bedtime: sleep.entries[0].bedtime, wake: sleep.entries[0].wake }
    : { bedtime: "23:00", wake: "07:00" };

  return (
    <div>
      <PageHeader eyebrow={now ? formatLongDay(today) : "Today"} title={now ? greeting(now) : "Today"} description={description} />

      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
      {saveFailed ? (
        <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>This browser is not saving changes (storage may be full or blocked). They will be lost when you leave the page.</span>
        </div>
      ) : null}
      {notice ? (
        <div
          key={notice.id}
          className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 animate-[fade-in_200ms_ease-out]"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
          <span>{notice.text}</span>
        </div>
      ) : null}

      {loading || waitingForPlan ? (
        <div className="grid gap-6 lg:grid-cols-3" aria-busy="true" aria-label="Loading your day">
          <div className="h-72 animate-pulse rounded-2xl bg-gray-100 lg:col-span-2" />
          <div className="h-72 animate-pulse rounded-2xl bg-gray-100" />
        </div>
      ) : firstRun ? (
        <FirstRun suggestions={suggestions} onAddHabit={addTemplate} night={lastNight} today={today} onLogSleep={logSleep} />
      ) : (
        <div className="space-y-8">
          {/* Phones: habits, last night, plan, week. Tablets: last night and week side by side, plan last. Desktop: two columns. */}
          <div className="grid items-start gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="min-w-0 md:col-span-2">
              <TodayHabits habits={active} today={today} suggestions={suggestions} onToggle={toggle} onAdd={addTemplate} />
            </div>
            <div className="min-w-0">
              <LastNightCard
                entry={sleepEntry}
                night={lastNight}
                today={today}
                goalMinutes={sleep.goalMinutes}
                defaults={defaults}
                justSaved={sleepSaved}
                onSave={logSleep}
              />
            </div>
            <div className="min-w-0 md:order-last md:col-span-2 lg:order-none">
              <TodayPlanCard plan={plan} onRetry={retry} />
            </div>
            <div className="min-w-0">
              <WeekSummary habits={active} sleep={sleep} today={today} />
            </div>
          </div>
          <StartSomething />
        </div>
      )}
    </div>
  );
}
