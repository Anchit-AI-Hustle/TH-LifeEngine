"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  AlertTriangle,
  ArchiveRestore,
  Award,
  CheckCircle2,
  ChevronDown,
  CloudCheck,
  Flame,
  ListChecks,
  Plus,
  Target,
  Trash2,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { HabitCard, type HabitActions } from "@/components/lifeengine/habits/HabitCard";
import { HabitDialog, BLANK_DRAFT, type HabitDraft } from "@/components/lifeengine/habits/HabitDialog";
import { Heatmap } from "@/components/lifeengine/habits/Heatmap";
import { ProgressRing } from "@/components/lifeengine/habits/ProgressRing";
import { TemplateGallery } from "@/components/lifeengine/habits/TemplateGallery";
import { HABIT_COLORS, HABIT_ICONS, HEAT_SHADES, formatDay, formatLongDay } from "@/components/lifeengine/habits/palette";
import {
  activeChallenge,
  challengeProgress,
  dateKey,
  dayRatio,
  dayTotals,
  endChallenge,
  habitStreaks,
  heatLevel,
  heatmapSummary,
  heatmapWeeks,
  milestone,
  overallWeekCompletion,
  plural,
  startChallenge,
  toggleHabitDay,
  weekCompletion,
} from "@/lib/habits/logic";
import { loadHabits, newId, saveHabits } from "@/lib/habits/store";
import { HABIT_TEMPLATES } from "@/lib/habits/templates";
import type { Habit, HabitTemplate, HabitsState } from "@/lib/habits/types";

type DialogState = { mode: "create" | "edit"; habitId?: string; initial: HabitDraft } | null;
type Notice = { id: number; tone: "success" | "info"; text: string } | null;

export default function HabitsPage() {
  const [state, setState] = useState<HabitsState | null>(null);
  const [today, setToday] = useState<string>("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [announce, setAnnounce] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [challengePick, setChallengePick] = useState("");
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Storage and the clock are read only in the browser, after mount.
  useEffect(() => {
    const { state: loaded, error } = loadHabits();
    setState(loaded);
    setLoadError(error);
    setToday(dateKey(new Date()));
    const refreshDay = () => setToday(dateKey(new Date()));
    window.addEventListener("focus", refreshDay);
    document.addEventListener("visibilitychange", refreshDay);
    return () => {
      window.removeEventListener("focus", refreshDay);
      document.removeEventListener("visibilitychange", refreshDay);
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  // Clear the screen-reader announcement once it has been read.
  useEffect(() => {
    if (!announce) return;
    const t = setTimeout(() => setAnnounce(""), 4000);
    return () => clearTimeout(t);
  }, [announce]);

  const showNotice = useCallback((text: string, tone: "success" | "info" = "success") => {
    setNotice({ id: Date.now(), tone, text });
    setAnnounce(text);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 4000);
  }, []);

  const dismissNotice = useCallback(() => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice(null);
  }, []);

  const commit = useCallback((next: HabitsState) => {
    setState(next);
    setSaveFailed(!saveHabits(next));
  }, []);

  const replaceHabit = useCallback(
    (habit: Habit) => {
      if (!state) return;
      commit({ ...state, habits: state.habits.map((h) => (h.id === habit.id ? habit : h)) });
    },
    [state, commit],
  );

  const active = useMemo(() => state?.habits.filter((h) => !h.archived) ?? [], [state]);
  const archived = useMemo(() => state?.habits.filter((h) => h.archived) ?? [], [state]);

  const actions: HabitActions = {
    onToggle: (habit, day) => {
      const next = toggleHabitDay(habit, day);
      replaceHabit(next);
      // "Added ..." and other notices are done with once a habit is ticked.
      dismissNotice();
      const nowDone = next.done.includes(day);
      if (!nowDone) {
        setAnnounce(`${habit.name} unticked for ${day === today ? "today" : formatDay(day)}.`);
        return;
      }
      const streak = habitStreaks(next, today);
      const others = active.filter((h) => h.id !== habit.id);
      const allDone = day === today && others.every((h) => h.done.includes(today));
      const m = milestone(streak.current);
      if (m && day === today) {
        showNotice(`${m}-${streak.unit} streak on ${habit.name}. Keep it going.`);
      } else {
        setAnnounce(
          `${habit.name} done${day === today ? "" : ` for ${formatDay(day)}`}. ${plural(streak.current, streak.unit)} streak.${allDone ? " All habits done for today." : ""}`,
        );
      }
    },
    onEdit: (habit) =>
      setDialog({
        mode: "edit",
        habitId: habit.id,
        initial: {
          name: habit.name,
          icon: habit.icon,
          color: habit.color,
          target: habit.target,
          reminder: habit.reminder ?? "",
        },
      }),
    onArchive: (habit) => {
      replaceHabit({ ...habit, archived: true });
      showNotice(`Archived "${habit.name}". Restore it any time from Archived habits.`, "info");
    },
    onDelete: (habit) => {
      if (!state) return;
      commit({ ...state, habits: state.habits.filter((h) => h.id !== habit.id) });
      showNotice(`Deleted "${habit.name}".`, "info");
    },
    onStartChallenge: (habit) => {
      replaceHabit(startChallenge(habit, today, newId()));
      showNotice(`21-day challenge started for "${habit.name}". Day 1 is today.`);
    },
    onEndChallenge: (habit, status) => {
      replaceHabit(endChallenge(habit, status, today));
      showNotice(
        status === "completed" ? `Challenge complete: "${habit.name}". Well done.` : `Challenge stopped for "${habit.name}".`,
        status === "completed" ? "success" : "info",
      );
    },
  };

  const addFromTemplate = (t: HabitTemplate) => {
    if (!state) return;
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
    commit({ ...state, habits: [...state.habits, habit] });
    showNotice(`Added "${t.name}". Tick it off below when it is done.`);
  };

  const saveDialog = (draft: HabitDraft) => {
    if (!state || !dialog) return;
    if (dialog.mode === "edit" && dialog.habitId) {
      commit({
        ...state,
        habits: state.habits.map((h) =>
          h.id === dialog.habitId
            ? { ...h, name: draft.name, icon: draft.icon, color: draft.color, target: draft.target, reminder: draft.reminder || undefined }
            : h,
        ),
      });
      showNotice(`Saved "${draft.name}".`);
    } else {
      const habit: Habit = {
        id: newId(),
        name: draft.name,
        icon: draft.icon,
        color: draft.color,
        target: draft.target,
        reminder: draft.reminder || undefined,
        createdOn: today,
        archived: false,
        done: [],
        challenges: [],
      };
      commit({ ...state, habits: [...state.habits, habit] });
      showNotice(`Added "${draft.name}".`);
    }
    setDialog(null);
  };

  const openCreate = () => setDialog({ mode: "create", initial: BLANK_DRAFT });

  const unusedTemplates = useMemo(() => {
    const names = new Set(active.map((h) => h.name.toLowerCase()));
    const ids = new Set(active.map((h) => h.templateId).filter(Boolean));
    return HABIT_TEMPLATES.filter((t) => !ids.has(t.id) && !names.has(t.name.toLowerCase()));
  }, [active]);

  const loading = state === null || !today;

  return (
    <div>
      <PageHeader
        title="Habits"
        description="Small daily actions, tracked simply. Tick off today, keep your streaks and take on 21-day challenges. Synced to your account."
        actions={
          !loading && active.length > 0 ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" aria-hidden />
              New habit
            </Button>
          ) : null
        }
      />

      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>

      {loadError ? <Alert tone="warn" text={loadError} /> : null}
      {saveFailed ? (
        <Alert tone="warn" text="This browser is not saving changes (storage may be full or blocked). They will be lost when you leave the page." />
      ) : null}
      {notice ? (
        <div
          key={notice.id}
          className={clsx(
            "mb-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm animate-[fade-in_200ms_ease-out]",
            notice.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-gray-200 bg-white text-gray-700",
          )}
        >
          <CheckCircle2 className={clsx("mt-0.5 h-4 w-4 shrink-0", notice.tone === "success" ? "text-emerald-600" : "text-gray-400")} aria-hidden />
          <span>{notice.text}</span>
        </div>
      ) : null}

      {loading ? (
        <LoadingState />
      ) : active.length === 0 ? (
        <div className="space-y-8">
          <EmptyState
            icon={ListChecks}
            title="Start with one small habit"
            description="Pick a ready-made habit below or create your own. Two or three is plenty to begin with."
            action={
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" aria-hidden />
                Create your own
              </Button>
            }
          />
          <section aria-labelledby="ideas-title">
            <h2 id="ideas-title" className="text-base font-semibold text-gray-900">
              Popular habits
            </h2>
            <p className="mt-1 text-sm text-gray-500">One tap to add. You can edit the name, cue and target later.</p>
            <div className="mt-4">
              <TemplateGallery templates={unusedTemplates} onAdd={addFromTemplate} />
            </div>
          </section>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Phones and tablets: today's list first, stats after. Desktop: stats on top. */}
          <div className="grid gap-6 lg:grid-cols-3">
            <section aria-labelledby="today-title" className="min-w-0 lg:col-span-2">
              <TodayHeader habits={active} today={today} />
              <ul className="mt-4 space-y-3">
                {active.map((h) => (
                  <HabitCard key={h.id} habit={h} today={today} actions={actions} />
                ))}
              </ul>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
                <CloudCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Ticks are saved as you go and synced to your account.
              </p>
            </section>

            <div className="min-w-0 space-y-6">
              <ChallengesCard
                habits={active}
                today={today}
                pick={challengePick}
                onPick={setChallengePick}
                onStart={(id) => {
                  const habit = active.find((h) => h.id === id);
                  if (habit) actions.onStartChallenge(habit);
                  setChallengePick("");
                }}
              />
              <OverallHeatmap habits={state.habits} today={today} />
            </div>
          </div>

          <div className="lg:order-first">
            <SummaryStats habits={active} today={today} />
          </div>

          {unusedTemplates.length > 0 ? (
            <section aria-labelledby="ideas-title">
              <h2 id="ideas-title" className="text-base font-semibold text-gray-900">
                More ideas
              </h2>
              <p className="mt-1 text-sm text-gray-500">Add one at a time. A new habit sticks best once the last one feels automatic.</p>
              <div className="mt-4">
                <TemplateGallery templates={unusedTemplates} onAdd={addFromTemplate} />
              </div>
            </section>
          ) : null}
        </div>
      )}

      {!loading && archived.length > 0 ? (
        <section className="mt-8" aria-labelledby="archived-title">
          <button
            type="button"
            aria-expanded={showArchived}
            aria-controls="archived-list"
            onClick={() => setShowArchived(!showArchived)}
            className="inline-flex min-h-[40px] items-center gap-1 rounded-lg text-base font-semibold text-gray-900"
            id="archived-title"
          >
            Archived habits ({archived.length})
            <ChevronDown className={clsx("h-4 w-4 text-gray-500 transition-transform", showArchived && "rotate-180")} aria-hidden />
          </button>
          {showArchived ? (
            <ul id="archived-list" className="mt-3 divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white shadow-sm">
              {archived.map((h) => {
                const Icon = HABIT_ICONS[h.icon].icon;
                return (
                  <li key={h.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className={clsx("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", HABIT_COLORS[h.color].soft)}>
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold text-gray-900">{h.name}</p>
                        <p className="text-xs text-gray-500">{plural(h.done.length, "check-in")} kept</p>
                      </div>
                    </div>
                    {confirmDeleteId === h.id ? (
                      <div className="flex flex-col gap-2 rounded-xl bg-red-50 p-3 sm:flex-row sm:items-center" role="alert">
                        <p className="text-sm font-medium text-red-800">Delete for good?</p>
                        <div className="flex gap-2">
                          <Button variant="ghost" onClick={() => setConfirmDeleteId(null)}>
                            Cancel
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => {
                              setConfirmDeleteId(null);
                              actions.onDelete(h);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            replaceHabit({ ...h, archived: false });
                            showNotice(`Restored "${h.name}".`);
                          }}
                        >
                          <ArchiveRestore className="h-4 w-4" aria-hidden />
                          Restore
                        </Button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(h.id)}
                          className="inline-flex min-h-[40px] items-center gap-2 rounded-[10px] px-4 text-sm font-semibold text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                          Delete
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      ) : null}

      <HabitDialog
        open={dialog !== null}
        mode={dialog?.mode ?? "create"}
        initial={dialog?.initial ?? BLANK_DRAFT}
        onSave={saveDialog}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}

function Alert({ tone, text }: { tone: "warn"; text: string }) {
  return (
    <div
      role="alert"
      className={clsx(
        "mb-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm",
        tone === "warn" && "border-amber-200 bg-amber-50 text-amber-800",
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{text}</span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading habits">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[104px] animate-pulse rounded-2xl bg-gray-100" />
        ))}
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-36 animate-pulse rounded-2xl bg-gray-100" />
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, hint, icon: Icon, children }: { label: string; value: string; hint?: string; icon: LucideIcon; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">{value}</p>
          {hint ? <p className="mt-1 break-words text-xs text-gray-500">{hint}</p> : null}
        </div>
        <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 sm:flex">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
      {children}
    </div>
  );
}

function SummaryStats({ habits, today }: { habits: Habit[]; today: string }) {
  const { done, total } = dayTotals(habits, today);
  const week = overallWeekCompletion(habits, today) ?? 0;
  let bestName = "";
  let best = 0;
  let bestUnit: "day" | "week" = "day";
  for (const h of habits) {
    const s = habitStreaks(h, today);
    if (s.current > best) {
      best = s.current;
      bestName = h.name;
      bestUnit = s.unit;
    }
  }
  const activeChallenges = habits.filter((h) => activeChallenge(h)).length;
  const completed = habits.reduce((n, h) => n + h.challenges.filter((c) => c.status === "completed").length, 0);

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Stat label="Today" value={`${done}/${total}`} hint={done === total ? "All done" : `${total - done} to go`} icon={CheckCircle2}>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100" aria-hidden>
          <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
        </div>
      </Stat>
      <Stat label="Last 7 days" value={`${Math.round(week * 100)}%`} hint="Average completion" icon={Target} />
      <Stat
        label="Top streak"
        value={best > 0 ? plural(best, bestUnit) : "0"}
        hint={best > 0 ? bestName : "Tick a habit to start one"}
        icon={Flame}
      />
      <Stat
        label="Challenges"
        value={String(activeChallenges)}
        hint={completed > 0 ? `${completed} completed` : activeChallenges > 0 ? "In progress" : "None running"}
        icon={Trophy}
      />
    </div>
  );
}

function TodayHeader({ habits, today }: { habits: Habit[]; today: string }) {
  const { done, total } = dayTotals(habits, today);
  const allDone = total > 0 && done === total;
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="today-title" className="text-base font-semibold text-gray-900">
          Today
        </h2>
        <p className="text-sm text-gray-500">{formatLongDay(today)}</p>
      </div>
      {allDone ? (
        <p className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
          {total === 1 ? "Your habit is done for today." : `All ${plural(total, "habit")} done for today.`}
        </p>
      ) : (
        <p className="mt-1 text-sm text-gray-500">Tap the circle to tick a habit off. Tap a day below it to fix the past week.</p>
      )}
    </div>
  );
}

function ChallengesCard({
  habits,
  today,
  pick,
  onPick,
  onStart,
}: {
  habits: Habit[];
  today: string;
  pick: string;
  onPick: (id: string) => void;
  onStart: (id: string) => void;
}) {
  const running = habits.filter((h) => activeChallenge(h));
  const available = habits.filter((h) => !activeChallenge(h));
  const completed = habits
    .flatMap((h) => h.challenges.filter((c) => c.status === "completed").map((c) => ({ habit: h, challenge: c })))
    .sort((a, b) => ((a.challenge.endedOn ?? "") < (b.challenge.endedOn ?? "") ? 1 : -1));

  return (
    <section aria-labelledby="challenges-title" className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 id="challenges-title" className="text-base font-semibold text-gray-900">
        21-day challenges
      </h2>
      <p className="mt-1 text-sm text-gray-500">Three weeks of daily practice is long enough to feel the routine settle.</p>

      {running.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {running.map((h) => {
            const ch = activeChallenge(h)!;
            const p = challengeProgress(ch, h.done, today);
            return (
              <li key={h.id} className="flex items-center gap-3">
                <ProgressRing
                  value={p.ratio}
                  size={52}
                  stroke={5}
                  strokeClass={HABIT_COLORS[h.color].stroke}
                  label={`${h.name}: ${p.doneCount} of ${p.length} days done`}
                  center={`${Math.round(p.ratio * 100)}%`}
                  centerSize={12}
                />
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-gray-900">{h.name}</p>
                  <p className="text-xs text-gray-500">
                    Day {p.day} of {p.length} · {p.doneCount} done
                    {p.missed > 0 ? ` · ${p.missed} missed` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {available.length > 0 ? (
        <form
          className="mt-4 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (pick) onStart(pick);
          }}
        >
          <label htmlFor="challenge-pick" className="text-[13px] font-semibold text-gray-700">
            {running.length > 0 ? "Start another" : "Start a challenge"}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
            <Select id="challenge-pick" value={pick} onChange={(e) => onPick(e.target.value)} className="min-w-0 flex-1">
              <option value="">Choose a habit</option>
              {available.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </Select>
            <Button type="submit" disabled={!pick}>
              Start
            </Button>
          </div>
        </form>
      ) : null}

      {completed.length > 0 ? (
        <div className="mt-5 border-t border-gray-100 pt-4">
          <p className="text-[13px] font-semibold text-gray-700">Completed</p>
          <ul className="mt-2 space-y-2">
            {completed.slice(0, 5).map(({ habit, challenge }) => (
              <li key={challenge.id} className="flex items-center gap-2 text-sm text-gray-700">
                <Award className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                <span className="min-w-0 flex-1 break-words">{habit.name}</span>
                {challenge.endedOn ? <span className="shrink-0 text-xs text-gray-500">{formatDay(challenge.endedOn)}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function OverallHeatmap({ habits, today }: { habits: Habit[]; today: string }) {
  const columns = heatmapWeeks(today, 12, (d) => dayRatio(habits, d));
  const summary = heatmapSummary(columns);
  return (
    <section aria-labelledby="heatmap-title" className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 id="heatmap-title" className="text-base font-semibold text-gray-900">
        Last 12 weeks
      </h2>
      <p className="mt-1 text-sm text-gray-500">Each square is a day; darker means more habits done.</p>
      <div className="mt-4">
        <Heatmap
          columns={columns}
          label="Habit completion, last 12 weeks"
          cellClass={(c) => HEAT_SHADES[heatLevel(c.value)]}
          describe={(c) => {
            const t = dayTotals(habits, c.date);
            return t.total ? `${t.done} of ${plural(t.total, "habit")}` : "no habits yet";
          }}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-600">
          Active on {summary.activeDays} of {summary.days} days, all habits done on {summary.fullDays}.
        </p>
        <div className="flex items-center gap-1 text-[10px] text-gray-500" aria-hidden>
          Less
          {HEAT_SHADES.map((s) => (
            <span key={s} className={clsx("h-3 w-3 rounded-[3px]", s)} />
          ))}
          More
        </div>
      </div>
    </section>
  );
}
