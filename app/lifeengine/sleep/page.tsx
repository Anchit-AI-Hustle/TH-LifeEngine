"use client";

import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  AlertTriangle,
  BedDouble,
  CheckCircle2,
  Clock,
  Info,
  Lightbulb,
  Moon,
  Pencil,
  Star,
  Trash2,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { SleepForm, type SavedSleepDraft, type SleepDraft } from "@/components/lifeengine/sleep/SleepForm";
import { SleepChart } from "@/components/lifeengine/sleep/SleepChart";
import { QUALITY_LABELS, formatNight } from "@/components/lifeengine/sleep/format";
import {
  TAG_LABELS,
  addDays,
  computeInsights,
  dateKey,
  defaultNight,
  durationMinutes,
  entriesIn,
  formatClock,
  formatDuration,
  parseClock,
  upsertEntry,
  windowNights,
  type SleepInsights,
  type SleepTip,
} from "@/lib/sleep/logic";
import { loadSleep, newId, saveSleep } from "@/lib/sleep/store";
import type { SleepEntry, SleepState } from "@/lib/sleep/types";

const GOAL_OPTIONS = [360, 390, 420, 450, 480, 510, 540, 570, 600];
const HISTORY_PAGE = 10;

export default function SleepPage() {
  const [state, setState] = useState<SleepState | null>(null);
  const [today, setToday] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [range, setRange] = useState<7 | 30>(7);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SleepDraft | null>(null);
  // Shown where the person is looking: under the save button, or above the log after a delete.
  const [notice, setNotice] = useState<{ id: number; text: string; where: "form" | "log" } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const freshDraft = useCallback((entries: SleepEntry[]): SleepDraft => {
    const last = entries[0];
    return {
      night: suggestNight(entries, defaultNight(new Date())),
      bedtime: last?.bedtime ?? "23:00",
      wake: last?.wake ?? "07:00",
      quality: null,
      tags: [],
      notes: "",
    };
  }, []);

  // Storage and the clock are read only in the browser, after mount.
  useEffect(() => {
    const { state: loaded, error } = loadSleep();
    setState(loaded);
    setLoadError(error);
    setToday(dateKey(new Date()));
    setDraft(freshDraft(loaded.entries));
    const refreshDay = () => setToday(dateKey(new Date()));
    window.addEventListener("focus", refreshDay);
    return () => {
      window.removeEventListener("focus", refreshDay);
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, [freshDraft]);

  const flash = (text: string, where: "form" | "log" = "form") => {
    setNotice({ id: Date.now(), text, where });
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 6000);
  };

  // On a phone the confirmation can sit below the fold: bring it into view.
  useEffect(() => {
    if (!notice) return;
    const el = noticeRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top < 64 || r.bottom > window.innerHeight - 80) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [notice]);

  const commit = (next: SleepState) => {
    setState(next);
    setSaveFailed(!saveSleep(next));
  };

  const editing = useMemo(() => state?.entries.find((e) => e.id === editingId) ?? null, [state, editingId]);

  const takenNights = useMemo(
    () => new Set((state?.entries ?? []).filter((e) => e.id !== editingId).map((e) => e.night)),
    [state, editingId],
  );

  const insights = useMemo(
    () => (state && today ? computeInsights(state.entries, { today, days: range, goalMinutes: state.goalMinutes }) : null),
    [state, today, range],
  );
  const nights = useMemo(() => (state && today ? windowNights(state.entries, today, range) : []), [state, today, range]);

  const save = (d: SavedSleepDraft) => {
    if (!state) return;
    const entry: SleepEntry = {
      id: editing?.id ?? newId(),
      night: d.night,
      bedtime: d.bedtime,
      wake: d.wake,
      quality: d.quality,
      tags: d.tags,
      notes: d.notes,
      updatedAt: new Date().toISOString(),
    };
    const entries = upsertEntry(state.entries, entry);
    commit({ ...state, entries });
    flash(
      `${editing ? "Updated" : "Saved"} ${formatNight(d.night)}: ${formatDuration(durationMinutes(d.bedtime, d.wake))} asleep. Synced to your account.`,
    );
    setEditingId(null);
    setDraft(freshDraft(entries));
  };

  const startEdit = (e: SleepEntry) => {
    setEditingId(e.id);
    setDraft({ night: e.night, bedtime: e.bedtime, wake: e.wake, quality: e.quality, tags: e.tags, notes: e.notes });
    setConfirmId(null);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      formRef.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    if (state) setDraft(freshDraft(state.entries));
  };

  const remove = (e: SleepEntry) => {
    if (!state) return;
    const entries = state.entries.filter((x) => x.id !== e.id);
    commit({ ...state, entries });
    setConfirmId(null);
    if (editingId === e.id) cancelEdit();
    flash(`Deleted ${formatNight(e.night)}.`, "log");
  };

  const loading = !state || !today || !draft;
  const history = state ? (showAll ? state.entries : state.entries.slice(0, HISTORY_PAGE)) : [];

  return (
    <div>
      <PageHeader
        title="Sleep"
        description="Log each night in a few seconds and see what actually helps you sleep better."
      />

      <p className="sr-only" role="status" aria-live="polite">
        {notice?.text ?? ""}
      </p>
      {loadError ? <Alert text={loadError} /> : null}
      {saveFailed ? <Alert text="This browser is not saving changes (storage may be full or blocked). They will be lost when you leave the page." /> : null}

      {loading ? (
        <LoadingState />
      ) : (
        <div className="space-y-8">
          <div className="grid gap-6 lg:grid-cols-5">
            <section
              aria-labelledby="log-title"
              className="min-w-0 scroll-mt-20 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-2"
            >
              <h2 id="log-title" className="text-base font-semibold text-gray-900">
                {editing ? `Edit ${formatNight(editing.night)}` : "Log a night"}
              </h2>
              <p className="mb-5 mt-1 text-sm text-gray-500">
                {editing ? "Change anything and save." : lastNightNote(state.entries) ?? "Times past midnight are handled for you."}
              </p>
              <SleepForm
                ref={formRef}
                mode={editing ? "edit" : "create"}
                initial={draft}
                today={today}
                takenNights={takenNights}
                onSave={save}
                onCancel={editing ? cancelEdit : undefined}
                status={notice?.where === "form" ? <Notice key={notice.id} ref={noticeRef} text={notice.text} /> : null}
              />
            </section>

            <section aria-labelledby="insights-title" className="min-w-0 space-y-6 lg:col-span-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 id="insights-title" className="text-base font-semibold text-gray-900">
                    Insights
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {insights && insights.nights > 0
                      ? `${insights.nights} of the last ${range} nights logged.`
                      : `Nothing logged in the last ${range} nights.`}
                  </p>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="inline-grid grid-flow-col rounded-xl bg-gray-100 p-1" role="group" aria-label="Period">
                    {([7, 30] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        aria-pressed={range === r}
                        onClick={() => setRange(r)}
                        className={clsx(
                          "h-10 rounded-lg px-3 text-sm font-medium transition-colors",
                          range === r ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800",
                        )}
                      >
                        {r} nights
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor="sleep-goal" className="text-[13px] font-semibold text-gray-700">
                      Goal
                    </label>
                    <Select
                      id="sleep-goal"
                      value={state.goalMinutes}
                      onChange={(e) => commit({ ...state, goalMinutes: Number(e.target.value) })}
                      className="w-[6.5rem]"
                    >
                      {GOAL_OPTIONS.map((m) => (
                        <option key={m} value={m}>
                          {formatDuration(m)}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>

              {state.entries.length === 0 ? (
                <EmptyState
                  icon={Moon}
                  title="No nights logged yet"
                  description="Log last night with the form. After three nights you will see your averages, consistency and tips."
                />
              ) : insights ? (
                <>
                  <InsightStats insights={insights} goal={state.goalMinutes} />
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                    <h3 className="text-base font-semibold text-gray-900">Hours asleep</h3>
                    <p className="mb-4 mt-1 text-sm text-gray-500">
                      {insights.nights > 0
                        ? `${insights.shortNights} of ${insights.nights} logged nights were more than 30 minutes short of your goal.`
                        : "No nights logged in this period."}
                    </p>
                    <SleepChart nights={nights} entries={entriesIn(state.entries, nights)} goalMinutes={state.goalMinutes} />
                  </div>
                  <Tips tips={insights.tips} />
                </>
              ) : null}
            </section>
          </div>

          {state.entries.length > 0 ? (
            <section aria-labelledby="history-title">
              <h2 id="history-title" className="text-base font-semibold text-gray-900">
                Sleep log
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {state.entries.length} {state.entries.length === 1 ? "night" : "nights"} logged. Synced to your account.
              </p>
              {notice?.where === "log" ? (
                <div className="mt-3">
                  <Notice key={notice.id} ref={noticeRef} text={notice.text} />
                </div>
              ) : null}
              <ul className="mt-4 divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white shadow-sm">
                {history.map((e) => (
                  <HistoryRow
                    key={e.id}
                    entry={e}
                    goal={state.goalMinutes}
                    editing={e.id === editingId}
                    confirming={confirmId === e.id}
                    onEdit={() => startEdit(e)}
                    onAskDelete={() => setConfirmId(e.id)}
                    onCancelDelete={() => setConfirmId(null)}
                    onDelete={() => remove(e)}
                  />
                ))}
              </ul>
              {state.entries.length > HISTORY_PAGE ? (
                <Button variant="ghost" className="mt-3" onClick={() => setShowAll(!showAll)}>
                  {showAll ? "Show fewer" : `Show all ${state.entries.length} nights`}
                </Button>
              ) : null}
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}

/**
 * The night to offer in a fresh form: last night, or if that is already
 * logged, the most recent missed night in the past two weeks.
 */
function suggestNight(entries: SleepEntry[], lastNight: string): string {
  const taken = new Set(entries.map((e) => e.night));
  for (let i = 0; i < 14; i += 1) {
    const night = addDays(lastNight, -i);
    if (!taken.has(night)) return night;
  }
  return lastNight;
}

function lastNightNote(entries: SleepEntry[]): string | null {
  const lastNight = defaultNight(new Date());
  const e = entries.find((x) => x.night === lastNight);
  if (!e) return null;
  return `${formatNight(lastNight)} is logged (${formatDuration(durationMinutes(e.bedtime, e.wake))}). Add a missed night, or edit from the log below.`;
}

const Notice = forwardRef<HTMLDivElement, { text: string }>(function Notice({ text }, ref) {
  return (
    <div
      ref={ref}
      className="flex scroll-mt-20 items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 animate-[fade-in_200ms_ease-out]"
    >
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
      <span>{text}</span>
    </div>
  );
});

function Alert({ text }: { text: string }) {
  return (
    <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{text}</span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-6 lg:grid-cols-5" aria-busy="true" aria-label="Loading sleep log">
      <div className="h-[560px] animate-pulse rounded-2xl bg-gray-100 lg:col-span-2" />
      <div className="space-y-4 lg:col-span-3">
        <div className="grid grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[104px] animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    </div>
  );
}

function Stat({ label, value, hint, icon: Icon }: { label: string; value: string; hint: string; icon: LucideIcon }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">{value}</p>
          <p className="mt-1 text-xs text-gray-500">{hint}</p>
        </div>
        <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 sm:flex">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
    </div>
  );
}

const CONSISTENCY_TEXT: Record<SleepInsights["consistency"], string> = {
  steady: "Steady",
  fair: "Fairly regular",
  irregular: "Irregular",
  unknown: "Needs 3 nights",
};

function InsightStats({ insights: s, goal }: { insights: SleepInsights; goal: number }) {
  const has = s.nights > 0;
  return (
    <div className="grid grid-cols-2 gap-4">
      <Stat
        label="Average sleep"
        value={has ? formatDuration(s.avgMinutes) : "–"}
        hint={has ? (s.avgMinutes >= goal - 15 ? "On target" : `${formatDuration(goal - s.avgMinutes)} under goal`) : `Goal ${formatDuration(goal)}`}
        icon={BedDouble}
      />
      <Stat
        label="Bedtime consistency"
        value={s.nights >= 2 ? `±${formatDuration(s.bedtimeSpread)}` : "–"}
        hint={has ? `${CONSISTENCY_TEXT[s.consistency]} · usually ${formatClock(s.avgBedtime)}` : CONSISTENCY_TEXT.unknown}
        icon={Clock}
      />
      <Stat
        label="Average quality"
        value={has ? `${s.avgQuality.toFixed(1)}/5` : "–"}
        hint={has ? QUALITY_LABELS[Math.min(5, Math.max(1, Math.round(s.avgQuality))) as 1 | 2 | 3 | 4 | 5] : "Rate each night 1 to 5"}
        icon={Star}
      />
      <Stat
        label="Sleep debt"
        value={has ? (s.debtMinutes > 0 ? formatDuration(s.debtMinutes) : "None") : "–"}
        hint={has ? `Across ${s.nights} logged ${s.nights === 1 ? "night" : "nights"}` : `Against a ${formatDuration(goal)} goal`}
        icon={TrendingDown}
      />
    </div>
  );
}

const TIP_STYLE: Record<SleepTip["tone"], { icon: LucideIcon; className: string }> = {
  warn: { icon: Lightbulb, className: "bg-amber-50 text-amber-600" },
  info: { icon: Info, className: "bg-indigo-50 text-indigo-600" },
  good: { icon: CheckCircle2, className: "bg-emerald-50 text-emerald-600" },
};

function Tips({ tips }: { tips: SleepTip[] }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-base font-semibold text-gray-900">What to try</h3>
      <p className="mt-1 text-sm text-gray-500">Based on the nights you logged. General guidance, not medical advice.</p>
      <ul className="mt-4 space-y-3">
        {tips.map((t) => {
          const { icon: Icon, className } = TIP_STYLE[t.tone];
          return (
            <li key={t.id} className="flex gap-3">
              <span className={clsx("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", className)}>
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <p className="min-w-0 pt-1 text-sm leading-relaxed text-gray-700">{t.text}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function HistoryRow({
  entry: e,
  goal,
  editing,
  confirming,
  onEdit,
  onAskDelete,
  onCancelDelete,
  onDelete,
}: {
  entry: SleepEntry;
  goal: number;
  editing: boolean;
  confirming: boolean;
  onEdit: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}) {
  const minutes = durationMinutes(e.bedtime, e.wake);
  const short = minutes < goal - 15;
  return (
    <li className={clsx("flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-4 sm:p-5", editing && "bg-indigo-50/50")}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-sm font-semibold text-gray-900">{formatNight(e.night)}</p>
          <p className="text-sm text-gray-600 tabular-nums">
            {formatClock(parseClock(e.bedtime))} to {formatClock(parseClock(e.wake))}
          </p>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span
            className={clsx(
              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
              short ? "bg-amber-50 text-amber-800" : "bg-indigo-50 text-indigo-700",
            )}
          >
            {formatDuration(minutes)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
            Quality {e.quality}/5 · {QUALITY_LABELS[e.quality]}
          </span>
          {e.tags.map((t) => (
            <span key={t} className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
              {TAG_LABELS[t]}
            </span>
          ))}
        </div>
        {e.notes ? <p className="mt-2 break-words text-sm text-gray-600">{e.notes}</p> : null}
      </div>
      {confirming ? (
        <div className="flex flex-col gap-2 rounded-xl bg-red-50 p-3 sm:items-end" role="alert">
          <p className="text-sm font-medium text-red-800">Delete this night?</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onCancelDelete}>
              Cancel
            </Button>
            <Button variant="danger" onClick={onDelete}>
              Delete
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${formatNight(e.night)}`}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[10px] px-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <Pencil className="h-4 w-4" aria-hidden />
            Edit
          </button>
          <button
            type="button"
            onClick={onAskDelete}
            aria-label={`Delete ${formatNight(e.night)}`}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[10px] px-3 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            Delete
          </button>
        </div>
      )}
    </li>
  );
}
