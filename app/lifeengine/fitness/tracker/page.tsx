"use client";

/**
 * Daily tracker.
 *
 * Left: log a day (tick off the planned blocks, add anything unplanned, and
 * record the health numbers the goals depend on).
 * Right: what the data says (streak, weekly rollup, trends and insights).
 */

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, ChevronDown, Flame, Plus, Target, Timer, Trash2 } from "lucide-react";

import { Alert, Badge, BarList, Card, LinkButton, Meter, PageSkeleton, ProfileSwitcher, SectionHeading, Sparkline, Stat, ToggleChip, insightTone, useFitnessData } from "../ui";
import { ProfileSourcePicker } from "@/components/lifeengine/fitness/ProfileSourcePicker";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { ACTIVITIES, CATEGORY_LABELS, getActivity } from "@/lib/fitness/activities";
import { estimateCalories } from "@/lib/fitness/metrics";
import { getActiveProfile, getFitnessProfiles, getLatestPlanForProfile, getLog, getLogsForProfile, saveLog, setActiveProfileId } from "@/lib/fitness/store";
import { logTemplateFromPlan, summariseTracker, todayIso } from "@/lib/fitness/tracker";
import type { CompletedActivity, DailyLog } from "@/lib/fitness/types";

const ADHERENCE_OPTIONS: { value: DailyLog["adherence"]; label: string }[] = [
  { value: "completed", label: "Completed as planned" },
  { value: "partial", label: "Did part of it" },
  { value: "swapped", label: "Swapped for something else" },
  { value: "rest", label: "Planned rest day" },
  { value: "missed", label: "Missed it" },
];

const SYMPTOM_OPTIONS = ["Dizziness", "Chest discomfort", "Breathlessness", "Joint swelling", "Headache", "Nausea", "Palpitations", "Unusual fatigue"];

const SCALES = [
  ["painScore", "Pain today", "0 none, 10 worst"],
  ["mood", "Mood", "1 very low, 10 great"],
  ["stress", "Stress", "1 calm, 10 overwhelmed"],
  ["energy", "Energy", "1 drained, 10 full of energy"],
  ["sleepQuality", "Sleep quality", "1 terrible, 10 perfect"],
] as const;

const num = (value: string) => (value ? Number(value) : undefined);

function emptyLog(profileId: string, planId: string | undefined, date: string): DailyLog {
  return {
    id: `fitlog_${profileId}_${date}`,
    profileId,
    planId,
    date,
    activities: [],
    adherence: "completed",
    updatedAt: new Date().toISOString(),
  };
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2.5">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-base font-semibold tabular-nums text-gray-900">{value}</dd>
    </div>
  );
}

export default function TrackerPage() {
  const [date, setDate] = useState(todayIso());
  const [draft, setDraft] = useState<DailyLog | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [addId, setAddId] = useState("");

  const [data, refresh] = useFitnessData(() => {
    const profile = getActiveProfile();
    return {
      profile,
      profiles: getFitnessProfiles(),
      plan: profile ? getLatestPlanForProfile(profile.id) : undefined,
      logs: profile ? getLogsForProfile(profile.id) : [],
    };
  });

  const profile = data?.profile;
  const plan = data?.plan;

  // Load (or create) the log for the selected date whenever it or the profile changes.
  useEffect(() => {
    if (!profile) return;
    const existing = getLog(profile.id, date);
    setDraft(existing ?? emptyLog(profile.id, plan?.id, date));
    setSavedAt(existing ? existing.updatedAt : null);
    setJustSaved(false);
  }, [profile?.id, date, plan?.id, profile]);

  const summary = useMemo(() => (profile && data ? summariseTracker(profile, data.logs, plan) : null), [profile, data, plan]);

  const planDay = useMemo(() => {
    if (!plan) return null;
    // JS getDay is Sunday-first; the plan is Monday-first.
    const weekday = new Date(`${date}T00:00:00`).getDay();
    const dayIndex = weekday === 0 ? 7 : weekday;
    return plan.weeks[0]?.days.find((d) => d.dayIndex === dayIndex) ?? null;
  }, [plan, date]);

  if (!data) return <PageSkeleton />;

  if (!profile) {
    return (
      <div>
        <PageHeader title="Activity tracker" description="Log each day and see whether the plan is working." />
        <ProfileSourcePicker title="Who are you tracking?" />
      </div>
    );
  }

  const update = <K extends keyof DailyLog>(key: K, value: DailyLog[K]) => {
    setJustSaved(false);
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const setActivity = (index: number, patch: Partial<CompletedActivity>) => {
    setJustSaved(false);
    setDraft((current) => {
      if (!current) return current;
      const activities = [...current.activities];
      activities[index] = { ...activities[index], ...patch };
      return { ...current, activities };
    });
  };

  const addFromPlan = () => {
    if (!plan || !planDay) return;
    const template = logTemplateFromPlan(plan, 1, planDay.dayIndex);
    setJustSaved(false);
    setDraft((current) => {
      if (!current) return current;
      const existingIds = new Set(current.activities.map((a) => a.activityId));
      return { ...current, activities: [...current.activities, ...template.filter((t) => !existingIds.has(t.activityId))] };
    });
  };

  const addManual = (activityId: string) => {
    const activity = getActivity(activityId);
    if (!activity) return;
    setJustSaved(false);
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        activities: [
          ...current.activities,
          {
            activityId: activity.id,
            name: activity.name,
            category: activity.category,
            environment: activity.environments[0],
            minutes: activity.targetMinutes,
            caloriesEst: estimateCalories(activity.met, profile.weightKg, activity.targetMinutes),
            planned: false,
          },
        ],
      };
    });
    setAddId("");
  };

  const removeActivity = (index: number) => {
    setJustSaved(false);
    setDraft((current) => (current ? { ...current, activities: current.activities.filter((_, i) => i !== index) } : current));
  };

  const save = () => {
    if (!draft) return;
    // Recalculate calories from the final minutes so edits stay consistent.
    const activities = draft.activities.map((activity) => {
      const definition = getActivity(activity.activityId);
      return {
        ...activity,
        caloriesEst: definition ? estimateCalories(definition.met, profile.weightKg, activity.minutes) : activity.caloriesEst,
      };
    });
    saveLog({ ...draft, activities });
    setSavedAt(new Date().toISOString());
    setJustSaved(true);
    refresh();
  };

  const loggedMinutes = draft?.activities.reduce((sum, a) => sum + a.minutes, 0) ?? 0;
  const loggedCalories = draft?.activities.reduce((sum, a) => sum + a.caloriesEst, 0) ?? 0;
  const isToday = date === todayIso();
  const dayTitle = isToday
    ? "Today"
    : new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  const numberField = (label: string, key: keyof DailyLog, opts: { min?: number; max?: number; step?: number; placeholder?: string } = {}) => (
    <Field label={label}>
      <Input
        type="number"
        inputMode="decimal"
        min={opts.min}
        max={opts.max}
        step={opts.step}
        placeholder={opts.placeholder}
        value={(draft?.[key] as number | undefined) ?? ""}
        onChange={(event) => update(key, num(event.target.value) as never)}
      />
    </Field>
  );

  return (
    <div className="space-y-8">
      <div>
        <PageHeader
          eyebrow={profile.name ? `Activity tracker · ${profile.name}` : "Activity tracker"}
          title="Log your day"
          description="Sticking to the plan is the part you control. Pain, weight, sleep and mood show whether it is working."
          actions={
            <>
              <ProfileSwitcher
                profiles={data.profiles}
                activeId={profile.id}
                onChange={(id) => {
                  setActiveProfileId(id);
                  refresh();
                }}
              />
              <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <span className="shrink-0">Date</span>
                <Input type="date" value={date} max={todayIso()} onChange={(event) => setDate(event.target.value || todayIso())} className="!w-auto" />
              </label>
            </>
          }
        />
        {summary ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Current streak" value={summary.streak.current} unit="days" hint={`Longest ${summary.streak.longest}`} icon={Flame} />
            <Stat label="Active days" value={`${summary.streak.activeDaysLast7}/7`} hint={`${summary.streak.activeDaysLast30} in the last 30`} icon={CalendarCheck} />
            <Stat label="This week" value={summary.thisWeek.activeMinutes} unit="min" hint={`Target ${summary.thisWeek.targetMinutes}`} icon={Timer} />
            <Stat label="Adherence" value={summary.thisWeek.adherencePct} unit="%" hint="Planned sessions kept" icon={Target} />
          </div>
        ) : null}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* ---------------- log form ---------------- */}
        <div className="space-y-6">
          <Card className="space-y-4">
            <SectionHeading
              title={dayTitle}
              action={savedAt ? <Badge tone="good">Saved {new Date(savedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</Badge> : <Badge>Not saved</Badge>}
            />

            {planDay ? (
              <Alert tone="info" title={`Planned: ${planDay.focus}`}>
                {planDay.isRestDay
                  ? "Rest day. Log steps, sleep and how you feel. Recovery counts too."
                  : `${planDay.blocks.length} blocks, ${planDay.totalMinutes} minutes: ${planDay.blocks.map((b) => b.name).join(", ")}`}
              </Alert>
            ) : !plan ? (
              <p className="text-sm text-gray-500">
                No plan yet.{" "}
                <Link href="/lifeengine/fitness/planner" className="font-medium text-indigo-600 hover:text-indigo-700">
                  Build one
                </Link>{" "}
                to log sessions against it.
              </p>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              {plan && planDay && !planDay.isRestDay ? (
                <Button variant="ghost" onClick={addFromPlan} className="shrink-0">
                  <Plus aria-hidden />
                  Add planned session
                </Button>
              ) : null}
              <div className="min-w-0 flex-1">
                <Field label="Add another activity">
                  <Select
                    value={addId}
                    onChange={(event) => {
                      setAddId(event.target.value);
                      if (event.target.value) addManual(event.target.value);
                    }}
                  >
                    <option value="">Choose an activity</option>
                    {ACTIVITIES.map((activity) => (
                      <option key={activity.id} value={activity.id}>
                        {activity.name} ({CATEGORY_LABELS[activity.category]})
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </div>

            {draft?.activities.length ? (
              <div className="space-y-3">
                {draft.activities.map((activity, index) => (
                  <div key={`${activity.activityId}-${index}`} className="space-y-3 rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{activity.name}</p>
                        <p className="mt-0.5 text-xs text-gray-500">{activity.planned ? "From the plan" : "Extra activity"}</p>
                      </div>
                      <Button variant="subtle" size="sm" onClick={() => removeActivity(index)} aria-label={`Remove ${activity.name}`}>
                        <Trash2 aria-hidden />
                        Remove
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Field label="Minutes">
                        <Input type="number" min={1} max={300} value={activity.minutes} onChange={(event) => setActivity(index, { minutes: Number(event.target.value) })} />
                      </Field>
                      <Field label="Effort (1-10)">
                        <Input type="number" min={1} max={10} value={activity.rpe ?? ""} onChange={(event) => setActivity(index, { rpe: num(event.target.value) })} />
                      </Field>
                      <Field label="Pain before">
                        <Input
                          type="number"
                          min={0}
                          max={10}
                          value={activity.painBefore ?? ""}
                          onChange={(event) => setActivity(index, { painBefore: num(event.target.value) })}
                          placeholder="0-10"
                        />
                      </Field>
                      <Field label="Pain after">
                        <Input
                          type="number"
                          min={0}
                          max={10}
                          value={activity.painAfter ?? ""}
                          onChange={(event) => setActivity(index, { painAfter: num(event.target.value) })}
                          placeholder="0-10"
                        />
                      </Field>
                    </div>
                    <details className="group">
                      <summary className="inline-flex min-h-[40px] cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 [&::-webkit-details-marker]:hidden">
                        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
                        Sets, load, distance and notes
                      </summary>
                      <div className="mt-2 space-y-3">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <Field label="Sets">
                            <Input type="number" min={0} max={30} value={activity.sets ?? ""} onChange={(event) => setActivity(index, { sets: num(event.target.value) })} />
                          </Field>
                          <Field label="Reps">
                            <Input value={activity.reps ?? ""} onChange={(event) => setActivity(index, { reps: event.target.value })} placeholder="12 or 30s" />
                          </Field>
                          <Field label="Load (kg)">
                            <Input type="number" min={0} step={0.5} value={activity.loadKg ?? ""} onChange={(event) => setActivity(index, { loadKg: num(event.target.value) })} />
                          </Field>
                          <Field label="Distance (km)">
                            <Input
                              type="number"
                              min={0}
                              step={0.1}
                              value={activity.distanceKm ?? ""}
                              onChange={(event) => setActivity(index, { distanceKm: num(event.target.value) })}
                            />
                          </Field>
                        </div>
                        <Field label="Notes">
                          <Input value={activity.notes ?? ""} onChange={(event) => setActivity(index, { notes: event.target.value })} placeholder="How did it feel?" />
                        </Field>
                      </div>
                    </details>
                  </div>
                ))}
                <p className="text-xs text-gray-500">
                  {loggedMinutes} minutes, about {loggedCalories} kcal on this day.
                </p>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
                Nothing logged for this day yet.
              </p>
            )}
          </Card>

          <Card className="space-y-5">
            <SectionHeading title="How did the day go?" />
            <Field label="Session outcome">
              <Select value={draft?.adherence ?? "completed"} onChange={(event) => update("adherence", event.target.value as DailyLog["adherence"])}>
                {ADHERENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
              {numberField("Steps", "steps", { min: 0, max: 80000, placeholder: plan ? String(plan.metrics.stepTarget) : "8000" })}
              {numberField("Weight (kg)", "weightKg", { min: 20, max: 300, step: 0.1 })}
              {numberField("Water (ml)", "waterMl", { min: 0, max: 8000, step: 100, placeholder: plan ? String(plan.metrics.waterMl) : "2500" })}
              {numberField("Sleep (hours)", "sleepHours", { min: 0, max: 16, step: 0.5 })}
              {numberField("Resting heart rate", "restingHr", { min: 35, max: 140, placeholder: "On waking" })}
              {numberField("Protein (g)", "proteinG", { min: 0, max: 400, placeholder: plan ? String(plan.metrics.proteinG) : undefined })}
              {numberField("BP systolic", "systolicBp", { min: 60, max: 260, placeholder: "120" })}
              {numberField("BP diastolic", "diastolicBp", { min: 30, max: 160, placeholder: "80" })}
              {numberField("Glucose (mg/dL)", "bloodGlucose", { min: 30, max: 600 })}
              {numberField("Calm minutes", "mindfulMinutes", { min: 0, max: 180 })}
              {numberField("Morning stiffness (min)", "stiffnessMinutes", { min: 0, max: 600 })}
            </div>

            <div className="space-y-4 border-t border-gray-100 pt-5">
              {SCALES.map(([key, label, hint]) => {
                const value = draft?.[key] as number | undefined;
                const id = `scale-${key}`;
                return (
                  <div key={key}>
                    <label htmlFor={id} className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm font-semibold text-gray-700">
                      <span>
                        {label} <span className="font-normal text-gray-500">({hint})</span>
                      </span>
                      <span className="tabular-nums font-medium text-gray-900">{value ?? "Not set"}</span>
                    </label>
                    <input
                      id={id}
                      type="range"
                      min={0}
                      max={10}
                      value={value ?? 5}
                      onChange={(event) => update(key, Number(event.target.value) as never)}
                      className="mt-1 h-10 w-full accent-indigo-600"
                    />
                  </div>
                );
              })}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700" id="symptoms-label">
                Any symptoms?
              </p>
              <div className="flex flex-wrap gap-2" role="group" aria-labelledby="symptoms-label">
                {SYMPTOM_OPTIONS.map((symptom) => {
                  const selected = draft?.symptoms?.includes(symptom) ?? false;
                  return (
                    <ToggleChip
                      key={symptom}
                      tone="warn"
                      selected={selected}
                      onClick={() =>
                        update("symptoms", selected ? (draft?.symptoms ?? []).filter((s) => s !== symptom) : [...(draft?.symptoms ?? []), symptom])
                      }
                    >
                      {symptom}
                    </ToggleChip>
                  );
                })}
              </div>
              {draft?.symptoms?.length ? (
                <Alert tone="warn" title="Symptoms logged">
                  If any happened during exercise, stop that session and get checked before going on, especially chest discomfort, dizziness or palpitations.
                </Alert>
              ) : null}
            </div>

            <Field label="Notes">
              <Textarea rows={3} value={draft?.notes ?? ""} onChange={(event) => update("notes", event.target.value)} placeholder="What helped, what hurt, what you would change." />
            </Field>

            <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-5">
              <Button onClick={save}>Save this day</Button>
              <LinkButton variant="subtle" href="/lifeengine/fitness/planner">
                View the plan
              </LinkButton>
              <span role="status" className="text-sm font-medium text-emerald-700">
                {justSaved ? "Saved." : ""}
              </span>
            </div>
          </Card>
        </div>

        {/* ---------------- analytics ---------------- */}
        {summary ? (
          <div className="space-y-6">
            <Card className="space-y-3">
              <SectionHeading title="What your data says" />
              {summary.insights.length === 0 ? (
                <p className="text-sm text-gray-500">Log a few days and insights will appear here.</p>
              ) : (
                summary.insights.map((insight) => (
                  <Alert key={insight.title} tone={insightTone(insight.level)} title={insight.title}>
                    <p>{insight.detail}</p>
                    {insight.action ? <p className="font-medium">{insight.action}</p> : null}
                  </Alert>
                ))
              )}
            </Card>

            <Card className="space-y-4">
              <SectionHeading level={3} title="This week" />
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-gray-600">
                    {summary.thisWeek.activeMinutes} of {summary.thisWeek.targetMinutes} target minutes
                  </span>
                  <span className="tabular-nums font-medium text-gray-900">
                    {summary.thisWeek.targetMinutes ? Math.round((summary.thisWeek.activeMinutes / summary.thisWeek.targetMinutes) * 100) : 0}%
                  </span>
                </div>
                <Meter value={summary.thisWeek.activeMinutes} max={summary.thisWeek.targetMinutes} label="Weekly target minutes" />
              </div>
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <MiniStat label="Sessions" value={summary.thisWeek.sessions} />
                <MiniStat label="Calories" value={`${summary.thisWeek.caloriesBurned} kcal`} />
                <MiniStat label="Steps" value={summary.thisWeek.steps.toLocaleString()} />
                {summary.thisWeek.avgRpe !== null ? <MiniStat label="Average effort" value={summary.thisWeek.avgRpe} /> : null}
                {summary.thisWeek.avgPain !== null ? <MiniStat label="Average pain" value={`${summary.thisWeek.avgPain}/10`} /> : null}
                {summary.thisWeek.avgSleep !== null ? <MiniStat label="Average sleep" value={`${summary.thisWeek.avgSleep} h`} /> : null}
              </dl>
              {summary.lastWeek ? (
                <p className="text-xs text-gray-500">
                  Last week: {summary.lastWeek.activeMinutes} minutes over {summary.lastWeek.sessions} sessions, {summary.lastWeek.adherencePct}% adherence.
                </p>
              ) : null}
            </Card>

            {summary.thisWeek.byCategory.length ? (
              <Card className="space-y-4">
                <SectionHeading level={3} title="Where the time went" />
                <BarList
                  items={summary.thisWeek.byCategory.map((entry) => ({
                    label: CATEGORY_LABELS[entry.category] ?? entry.category,
                    value: entry.minutes,
                  }))}
                />
                <div className="flex flex-wrap gap-1.5 border-t border-gray-100 pt-3">
                  <Badge>Indoor {summary.thisWeek.byEnvironment.indoor} min</Badge>
                  <Badge>Outdoor {summary.thisWeek.byEnvironment.outdoor} min</Badge>
                </div>
              </Card>
            ) : null}

            <Card className="space-y-3">
              <SectionHeading level={3} title="Progress on your goals" />
              <ul className="divide-y divide-gray-100">
                {summary.goalProgress.map((entry) => {
                  const hasValue = entry.current !== null && entry.current !== undefined;
                  return (
                    <li key={entry.metric} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">{entry.label}</p>
                        <p className="text-xs text-gray-500">{entry.direction === "down" ? "Lower is better" : "Higher is better"}</p>
                      </div>
                      <div className="shrink-0 text-right tabular-nums">
                        <p className={clsx("font-semibold", hasValue ? "text-gray-900" : "text-gray-400")}>{hasValue ? `${entry.current} ${entry.unit}` : "No data"}</p>
                        {entry.target !== null && entry.target !== undefined ? <p className="text-xs text-gray-500">Target {entry.target}</p> : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>

            <Card className="space-y-4">
              <SectionHeading level={3} title="Trends" description="Green means moving the way you want, amber the opposite. Judge over weeks, not days." />
              {(
                [
                  ["Active minutes", summary.trends.activeMinutes, false],
                  ["Steps", summary.trends.steps, false],
                  ["Weight", summary.trends.weight, true],
                  ["Pain", summary.trends.pain, true],
                  ["Sleep", summary.trends.sleep, false],
                  ["Mood", summary.trends.mood, false],
                ] as const
              ).map(([label, points, invert]) => (
                <div key={label} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-gray-700">{label}</span>
                    {points.length ? (
                      <span className="tabular-nums text-xs text-gray-500">
                        {points[0].value} to {points[points.length - 1].value}
                      </span>
                    ) : null}
                  </div>
                  <Sparkline points={points} invert={invert} />
                </div>
              ))}
            </Card>

            <Card className="space-y-3">
              <SectionHeading level={3} title="All time" />
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <MiniStat label="Days logged" value={summary.totals.days} />
                <MiniStat label="Sessions" value={summary.totals.sessions} />
                <MiniStat label="Minutes" value={summary.totals.minutes} />
                <MiniStat label="Calories" value={`${summary.totals.calories} kcal`} />
              </dl>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}
