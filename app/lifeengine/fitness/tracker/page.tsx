"use client";

/**
 * Daily tracker.
 *
 * Left: log today — tick off the planned blocks, add anything unplanned, and
 * record the health metrics your goals actually depend on.
 * Right: what the data says — streak, weekly rollup, trends and insights.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import styles from "../Fitness.module.css";
import { Alert, Badge, BarList, EmptyState, Meter, Sparkline, Stat, useFitnessData } from "../ui";
import { ACTIVITIES, CATEGORY_LABELS, getActivity } from "@/lib/fitness/activities";
import { estimateCalories } from "@/lib/fitness/metrics";
import {
  getActiveProfile,
  getFitnessProfiles,
  getLatestPlanForProfile,
  getLog,
  getLogsForProfile,
  saveLog,
  setActiveProfileId,
} from "@/lib/fitness/store";
import { logTemplateFromPlan, summariseTracker, todayIso } from "@/lib/fitness/tracker";
import type { CompletedActivity, DailyLog, FitnessPlan } from "@/lib/fitness/types";

const ADHERENCE_OPTIONS: { value: DailyLog["adherence"]; label: string }[] = [
  { value: "completed", label: "Completed as planned" },
  { value: "partial", label: "Did part of it" },
  { value: "swapped", label: "Swapped for something else" },
  { value: "rest", label: "Planned rest day" },
  { value: "missed", label: "Missed it" },
];

const SYMPTOM_OPTIONS = [
  "Dizziness",
  "Chest discomfort",
  "Breathlessness",
  "Joint swelling",
  "Headache",
  "Nausea",
  "Palpitations",
  "Unusual fatigue",
];

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

export default function TrackerPage() {
  const [date, setDate] = useState(todayIso());
  const [draft, setDraft] = useState<DailyLog | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
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
  }, [profile?.id, date, plan?.id, profile]);

  const summary = useMemo(
    () => (profile && data ? summariseTracker(profile, data.logs, plan) : null),
    [profile, data, plan],
  );

  const planDay = useMemo(() => {
    if (!plan) return null;
    // JS getDay is Sunday-first; the plan is Monday-first.
    const weekday = new Date(`${date}T00:00:00`).getDay();
    const dayIndex = weekday === 0 ? 7 : weekday;
    return plan.weeks[0]?.days.find((d) => d.dayIndex === dayIndex) ?? null;
  }, [plan, date]);

  if (!data) return <p className={styles.muted}>Loading your tracker…</p>;

  if (!profile) {
    return (
      <div className={styles.page}>
        <EmptyState title="No profile yet" actionHref="/lifeengine/fitness/profile" actionLabel="Create your profile">
          The tracker measures progress against your goals, so it needs a profile first.
        </EmptyState>
      </div>
    );
  }

  const update = <K extends keyof DailyLog>(key: K, value: DailyLog[K]) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));

  const setActivity = (index: number, patch: Partial<CompletedActivity>) =>
    setDraft((current) => {
      if (!current) return current;
      const activities = [...current.activities];
      activities[index] = { ...activities[index], ...patch };
      return { ...current, activities };
    });

  const addFromPlan = () => {
    if (!plan || !planDay) return;
    const template = logTemplateFromPlan(plan, 1, planDay.dayIndex);
    setDraft((current) => {
      if (!current) return current;
      const existingIds = new Set(current.activities.map((a) => a.activityId));
      return { ...current, activities: [...current.activities, ...template.filter((t) => !existingIds.has(t.activityId))] };
    });
  };

  const addManual = (activityId: string) => {
    const activity = getActivity(activityId);
    if (!activity) return;
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

  const removeActivity = (index: number) =>
    setDraft((current) =>
      current ? { ...current, activities: current.activities.filter((_, i) => i !== index) } : current,
    );

  const save = () => {
    if (!draft) return;
    // Recalculate calories from the final minutes so edits stay consistent.
    const activities = draft.activities.map((activity) => {
      const definition = getActivity(activity.activityId);
      return {
        ...activity,
        caloriesEst: definition
          ? estimateCalories(definition.met, profile.weightKg, activity.minutes)
          : activity.caloriesEst,
      };
    });
    saveLog({ ...draft, activities });
    setSavedAt(new Date().toISOString());
    refresh();
  };

  const loggedMinutes = draft?.activities.reduce((sum, a) => sum + a.minutes, 0) ?? 0;
  const loggedCalories = draft?.activities.reduce((sum, a) => sum + a.caloriesEst, 0) ?? 0;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroTop}>
          <div className={styles.stack}>
            <span className={styles.eyebrow}>Daily tracker · {profile.name}</span>
            <h1 className={styles.title}>Log today, watch the trend</h1>
            <p className={styles.subtitle}>
              Adherence is the only variable you fully control, so it is the one worth tracking. Everything else —
              pain, weight, sleep, mood — is here because it tells you whether the plan is working or needs changing.
            </p>
          </div>
          <div className={styles.stack}>
            {data.profiles.length > 1 ? (
              <label className={styles.field}>
                <span className={styles.eyebrow}>Profile</span>
                <select
                  className={styles.control}
                  value={profile.id}
                  onChange={(event) => {
                    setActiveProfileId(event.target.value);
                    refresh();
                  }}
                >
                  {data.profiles.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className={styles.field}>
              <span className={styles.eyebrow}>Date</span>
              <input
                className={styles.control}
                type="date"
                value={date}
                max={todayIso()}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
          </div>
        </div>

        {summary ? (
          <div className={`${styles.grid} ${styles.grid4}`}>
            <Stat label="Current streak" value={summary.streak.current} unit="days" hint={`Longest ${summary.streak.longest}`} />
            <Stat label="Active days" value={`${summary.streak.activeDaysLast7}/7`} hint={`${summary.streak.activeDaysLast30} in last 30`} />
            <Stat
              label="This week"
              value={summary.thisWeek.activeMinutes}
              unit="min"
              hint={`Target ${summary.thisWeek.targetMinutes}`}
            />
            <Stat label="Adherence" value={summary.thisWeek.adherencePct} unit="%" hint="Planned sessions kept" />
          </div>
        ) : null}
      </header>

      <div className={`${styles.grid} ${styles.grid2}`} style={{ alignItems: "start" }}>
        {/* ---------------- log form ---------------- */}
        <section className={styles.stack}>
          <div className={styles.panel}>
            <div className={styles.spread}>
              <h2 className={styles.sectionTitle}>
                {date === todayIso() ? "Today" : new Date(`${date}T00:00:00`).toDateString()}
              </h2>
              {savedAt ? <Badge tone="good">Saved {new Date(savedAt).toLocaleTimeString()}</Badge> : <Badge tone="info">Not saved yet</Badge>}
            </div>

            {planDay ? (
              <Alert tone="info" title={`Planned: ${planDay.focus}`}>
                {planDay.isRestDay
                  ? "Rest day. Log your steps, sleep and how you feel — recovery is data too."
                  : `${planDay.blocks.length} blocks, ${planDay.totalMinutes} minutes: ${planDay.blocks.map((b) => b.name).join(" · ")}`}
              </Alert>
            ) : null}

            <div className={styles.row}>
              {plan && planDay && !planDay.isRestDay ? (
                <button type="button" className="btn" onClick={addFromPlan}>
                  + Add today&rsquo;s planned session
                </button>
              ) : null}
              <select
                className={styles.control}
                style={{ maxWidth: 260 }}
                value={addId}
                onChange={(event) => {
                  setAddId(event.target.value);
                  if (event.target.value) addManual(event.target.value);
                }}
              >
                <option value="">+ Add any other activity…</option>
                {ACTIVITIES.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.name} — {CATEGORY_LABELS[activity.category]}
                  </option>
                ))}
              </select>
            </div>

            {draft?.activities.length ? (
              <div className={styles.stack}>
                {draft.activities.map((activity, index) => (
                  <div key={`${activity.activityId}-${index}`} className={styles.panelTight} style={{ border: "1px solid var(--border)", borderRadius: 10 }}>
                    <div className={styles.spread}>
                      <strong style={{ fontSize: 14 }}>{activity.name}</strong>
                      <div className={styles.row}>
                        {activity.planned ? <Badge tone="info">Planned</Badge> : <Badge tone="neutral">Extra</Badge>}
                        <button type="button" className="btn subtle sm" onClick={() => removeActivity(index)}>
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className={`${styles.grid} ${styles.grid4}`}>
                      <label className={styles.field}>
                        <span className={styles.label}>Minutes</span>
                        <input
                          className={styles.control}
                          type="number"
                          min={1}
                          max={300}
                          value={activity.minutes}
                          onChange={(event) => setActivity(index, { minutes: Number(event.target.value) })}
                        />
                      </label>
                      <label className={styles.field}>
                        <span className={styles.label}>Effort (RPE)</span>
                        <input
                          className={styles.control}
                          type="number"
                          min={1}
                          max={10}
                          value={activity.rpe ?? ""}
                          onChange={(event) =>
                            setActivity(index, { rpe: event.target.value ? Number(event.target.value) : undefined })
                          }
                          placeholder="1-10"
                        />
                      </label>
                      <label className={styles.field}>
                        <span className={styles.label}>Pain before</span>
                        <input
                          className={styles.control}
                          type="number"
                          min={0}
                          max={10}
                          value={activity.painBefore ?? ""}
                          onChange={(event) =>
                            setActivity(index, {
                              painBefore: event.target.value ? Number(event.target.value) : undefined,
                            })
                          }
                          placeholder="0-10"
                        />
                      </label>
                      <label className={styles.field}>
                        <span className={styles.label}>Pain after</span>
                        <input
                          className={styles.control}
                          type="number"
                          min={0}
                          max={10}
                          value={activity.painAfter ?? ""}
                          onChange={(event) =>
                            setActivity(index, {
                              painAfter: event.target.value ? Number(event.target.value) : undefined,
                            })
                          }
                          placeholder="0-10"
                        />
                      </label>
                    </div>
                    <details className={styles.disclosure}>
                      <summary>Sets, load, distance &amp; notes</summary>
                      <div className={styles.disclosureBody}>
                        <div className={`${styles.grid} ${styles.grid4}`}>
                          <label className={styles.field}>
                            <span className={styles.label}>Sets</span>
                            <input
                              className={styles.control}
                              type="number"
                              min={0}
                              max={30}
                              value={activity.sets ?? ""}
                              onChange={(event) =>
                                setActivity(index, { sets: event.target.value ? Number(event.target.value) : undefined })
                              }
                            />
                          </label>
                          <label className={styles.field}>
                            <span className={styles.label}>Reps</span>
                            <input
                              className={styles.control}
                              value={activity.reps ?? ""}
                              onChange={(event) => setActivity(index, { reps: event.target.value })}
                              placeholder="e.g. 12 or 30s"
                            />
                          </label>
                          <label className={styles.field}>
                            <span className={styles.label}>Load (kg)</span>
                            <input
                              className={styles.control}
                              type="number"
                              min={0}
                              step={0.5}
                              value={activity.loadKg ?? ""}
                              onChange={(event) =>
                                setActivity(index, { loadKg: event.target.value ? Number(event.target.value) : undefined })
                              }
                            />
                          </label>
                          <label className={styles.field}>
                            <span className={styles.label}>Distance (km)</span>
                            <input
                              className={styles.control}
                              type="number"
                              min={0}
                              step={0.1}
                              value={activity.distanceKm ?? ""}
                              onChange={(event) =>
                                setActivity(index, {
                                  distanceKm: event.target.value ? Number(event.target.value) : undefined,
                                })
                              }
                            />
                          </label>
                        </div>
                        <label className={styles.field}>
                          <span className={styles.label}>Notes</span>
                          <input
                            className={styles.control}
                            value={activity.notes ?? ""}
                            onChange={(event) => setActivity(index, { notes: event.target.value })}
                            placeholder="How did it feel?"
                          />
                        </label>
                      </div>
                    </details>
                  </div>
                ))}
                <p className={styles.tiny}>
                  {loggedMinutes} minutes · ~{loggedCalories} kcal logged for this day.
                </p>
              </div>
            ) : (
              <p className={styles.muted}>No activity logged for this day yet. Add the planned session, or anything else you did.</p>
            )}
          </div>

          <div className={styles.panel}>
            <h3 className={styles.sectionTitle} style={{ fontSize: 15 }}>
              How did the day go?
            </h3>
            <label className={styles.field}>
              <span className={styles.label}>Session outcome</span>
              <select
                className={styles.control}
                value={draft?.adherence ?? "completed"}
                onChange={(event) => update("adherence", event.target.value as DailyLog["adherence"])}
              >
                {ADHERENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className={`${styles.grid} ${styles.grid3}`}>
              <label className={styles.field}>
                <span className={styles.label}>Steps</span>
                <input
                  className={styles.control}
                  type="number"
                  min={0}
                  max={80000}
                  value={draft?.steps ?? ""}
                  onChange={(event) => update("steps", event.target.value ? Number(event.target.value) : undefined)}
                  placeholder={plan ? String(plan.metrics.stepTarget) : "8000"}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Weight (kg)</span>
                <input
                  className={styles.control}
                  type="number"
                  min={20}
                  max={300}
                  step={0.1}
                  value={draft?.weightKg ?? ""}
                  onChange={(event) => update("weightKg", event.target.value ? Number(event.target.value) : undefined)}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Water (ml)</span>
                <input
                  className={styles.control}
                  type="number"
                  min={0}
                  max={8000}
                  step={100}
                  value={draft?.waterMl ?? ""}
                  onChange={(event) => update("waterMl", event.target.value ? Number(event.target.value) : undefined)}
                  placeholder={plan ? String(plan.metrics.waterMl) : "2500"}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Sleep (hours)</span>
                <input
                  className={styles.control}
                  type="number"
                  min={0}
                  max={16}
                  step={0.5}
                  value={draft?.sleepHours ?? ""}
                  onChange={(event) => update("sleepHours", event.target.value ? Number(event.target.value) : undefined)}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Resting heart rate</span>
                <input
                  className={styles.control}
                  type="number"
                  min={35}
                  max={140}
                  value={draft?.restingHr ?? ""}
                  onChange={(event) => update("restingHr", event.target.value ? Number(event.target.value) : undefined)}
                  placeholder="On waking"
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Protein (g)</span>
                <input
                  className={styles.control}
                  type="number"
                  min={0}
                  max={400}
                  value={draft?.proteinG ?? ""}
                  onChange={(event) => update("proteinG", event.target.value ? Number(event.target.value) : undefined)}
                  placeholder={plan ? String(plan.metrics.proteinG) : undefined}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Blood pressure</span>
                <span className={styles.row}>
                  <input
                    className={styles.control}
                    type="number"
                    style={{ maxWidth: 80 }}
                    value={draft?.systolicBp ?? ""}
                    onChange={(event) =>
                      update("systolicBp", event.target.value ? Number(event.target.value) : undefined)
                    }
                    placeholder="120"
                    aria-label="Systolic"
                  />
                  <span aria-hidden="true">/</span>
                  <input
                    className={styles.control}
                    type="number"
                    style={{ maxWidth: 80 }}
                    value={draft?.diastolicBp ?? ""}
                    onChange={(event) =>
                      update("diastolicBp", event.target.value ? Number(event.target.value) : undefined)
                    }
                    placeholder="80"
                    aria-label="Diastolic"
                  />
                </span>
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Blood glucose (mg/dL)</span>
                <input
                  className={styles.control}
                  type="number"
                  min={30}
                  max={600}
                  value={draft?.bloodGlucose ?? ""}
                  onChange={(event) =>
                    update("bloodGlucose", event.target.value ? Number(event.target.value) : undefined)
                  }
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Calm / mindful minutes</span>
                <input
                  className={styles.control}
                  type="number"
                  min={0}
                  max={180}
                  value={draft?.mindfulMinutes ?? ""}
                  onChange={(event) =>
                    update("mindfulMinutes", event.target.value ? Number(event.target.value) : undefined)
                  }
                />
              </label>
            </div>

            <hr className={styles.divider} />

            {(
              [
                ["painScore", "Pain today", "0 = none, 10 = worst"],
                ["mood", "Mood", "1 = very low, 10 = great"],
                ["stress", "Stress", "1 = calm, 10 = overwhelmed"],
                ["energy", "Energy", "1 = drained, 10 = buzzing"],
                ["sleepQuality", "Sleep quality", "1 = terrible, 10 = perfect"],
              ] as const
            ).map(([key, label, hint]) => (
              <label key={key} className={styles.field}>
                <span className={styles.label}>
                  {label}: {draft?.[key] ?? "—"} <span className={styles.tiny}>{hint}</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={(draft?.[key] as number | undefined) ?? 5}
                  onChange={(event) => update(key, Number(event.target.value) as never)}
                />
              </label>
            ))}

            <label className={styles.field}>
              <span className={styles.label}>Stiffness this morning (minutes)</span>
              <input
                className={styles.control}
                type="number"
                min={0}
                max={600}
                value={draft?.stiffnessMinutes ?? ""}
                onChange={(event) =>
                  update("stiffnessMinutes", event.target.value ? Number(event.target.value) : undefined)
                }
                placeholder="Useful if you have arthritis or back pain"
              />
            </label>

            <span className={styles.eyebrow}>Any symptoms?</span>
            <div className={styles.chipWrap}>
              {SYMPTOM_OPTIONS.map((symptom) => {
                const selected = draft?.symptoms?.includes(symptom) ?? false;
                return (
                  <button
                    key={symptom}
                    type="button"
                    className={`${styles.chip} ${styles.chipDanger} ${selected ? styles.chipActive : ""}`}
                    onClick={() =>
                      update(
                        "symptoms",
                        selected
                          ? (draft?.symptoms ?? []).filter((s) => s !== symptom)
                          : [...(draft?.symptoms ?? []), symptom],
                      )
                    }
                    aria-pressed={selected}
                  >
                    {symptom}
                  </button>
                );
              })}
            </div>
            {draft?.symptoms?.length ? (
              <Alert tone="warn" title="Symptoms logged">
                If any of these happened during exercise, stop that session and get it checked before continuing —
                particularly chest discomfort, dizziness or palpitations.
              </Alert>
            ) : null}

            <label className={styles.field}>
              <span className={styles.label}>Notes</span>
              <textarea
                className={styles.control}
                rows={3}
                value={draft?.notes ?? ""}
                onChange={(event) => update("notes", event.target.value)}
                placeholder="What helped, what hurt, what you would change."
              />
            </label>

            <div className={styles.row}>
              <button type="button" className="btn" onClick={save}>
                Save this day
              </button>
              <Link className="btn subtle" href="/lifeengine/fitness/planner">
                View the plan
              </Link>
            </div>
          </div>
        </section>

        {/* ---------------- analytics ---------------- */}
        <section className={styles.stack}>
          {summary ? (
            <>
              <div className={styles.panel}>
                <h2 className={styles.sectionTitle}>What your data says</h2>
                {summary.insights.length === 0 ? (
                  <p className={styles.muted}>Log a few days and the insights will appear here.</p>
                ) : (
                  summary.insights.map((insight) => (
                    <Alert
                      key={insight.title}
                      tone={insight.level === "risk" ? "risk" : insight.level === "warn" ? "warn" : insight.level === "good" ? "good" : "info"}
                      title={insight.title}
                    >
                      <span>{insight.detail}</span>
                      {insight.action ? (
                        <span>
                          <strong>Do this: </strong>
                          {insight.action}
                        </span>
                      ) : null}
                    </Alert>
                  ))
                )}
              </div>

              <div className={styles.panel}>
                <h3 className={styles.sectionTitle} style={{ fontSize: 15 }}>
                  This week
                </h3>
                <div className={styles.stack} style={{ gap: 6 }}>
                  <div className={styles.spread}>
                    <span className={styles.muted}>
                      {summary.thisWeek.activeMinutes} of {summary.thisWeek.targetMinutes} target minutes
                    </span>
                    <Badge
                      tone={
                        summary.thisWeek.activeMinutes >= summary.thisWeek.targetMinutes
                          ? "good"
                          : summary.thisWeek.activeMinutes >= summary.thisWeek.targetMinutes * 0.6
                            ? "info"
                            : "warn"
                      }
                    >
                      {summary.thisWeek.targetMinutes
                        ? Math.round((summary.thisWeek.activeMinutes / summary.thisWeek.targetMinutes) * 100)
                        : 0}
                      %
                    </Badge>
                  </div>
                  <Meter value={summary.thisWeek.activeMinutes} max={summary.thisWeek.targetMinutes} />
                </div>
                <div className={`${styles.grid} ${styles.grid3}`}>
                  <Stat label="Sessions" value={summary.thisWeek.sessions} />
                  <Stat label="Calories" value={summary.thisWeek.caloriesBurned} unit="kcal" />
                  <Stat label="Steps" value={summary.thisWeek.steps.toLocaleString()} />
                  {summary.thisWeek.avgRpe !== null ? <Stat label="Avg effort" value={summary.thisWeek.avgRpe} unit="RPE" /> : null}
                  {summary.thisWeek.avgPain !== null ? <Stat label="Avg pain" value={summary.thisWeek.avgPain} unit="/10" /> : null}
                  {summary.thisWeek.avgSleep !== null ? <Stat label="Avg sleep" value={summary.thisWeek.avgSleep} unit="h" /> : null}
                </div>
                {summary.lastWeek ? (
                  <p className={styles.tiny}>
                    Last week: {summary.lastWeek.activeMinutes} minutes across {summary.lastWeek.sessions} sessions (
                    {summary.lastWeek.adherencePct}% adherence).
                  </p>
                ) : null}
              </div>

              {summary.thisWeek.byCategory.length ? (
                <div className={styles.panel}>
                  <h3 className={styles.sectionTitle} style={{ fontSize: 15 }}>
                    Where the time went
                  </h3>
                  <BarList
                    items={summary.thisWeek.byCategory.map((entry) => ({
                      label: CATEGORY_LABELS[entry.category] ?? entry.category,
                      value: entry.minutes,
                    }))}
                  />
                  <hr className={styles.divider} />
                  <div className={styles.row}>
                    <Badge tone="neutral">Indoor {summary.thisWeek.byEnvironment.indoor} min</Badge>
                    <Badge tone="neutral">Outdoor {summary.thisWeek.byEnvironment.outdoor} min</Badge>
                  </div>
                </div>
              ) : null}

              <div className={styles.panel}>
                <h3 className={styles.sectionTitle} style={{ fontSize: 15 }}>
                  Progress on what matters for your goals
                </h3>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th>Now</th>
                        <th>Target</th>
                        <th>Aim</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.goalProgress.map((entry) => (
                        <tr key={entry.metric}>
                          <td>{entry.label}</td>
                          <td className={styles.mono}>
                            {entry.current === null || entry.current === undefined ? "—" : entry.current}
                            {entry.current !== null && entry.current !== undefined ? ` ${entry.unit}` : ""}
                          </td>
                          <td className={styles.mono}>{entry.target ?? "—"}</td>
                          <td className={styles.muted}>{entry.direction === "down" ? "Lower is better" : "Higher is better"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className={styles.panel}>
                <h3 className={styles.sectionTitle} style={{ fontSize: 15 }}>
                  Trends
                </h3>
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
                  <div key={label} className={styles.stack} style={{ gap: 2 }}>
                    <div className={styles.spread}>
                      <span className={styles.statLabel}>{label}</span>
                      {points.length ? (
                        <span className={styles.tiny}>
                          {points[0].value} → {points[points.length - 1].value}
                        </span>
                      ) : null}
                    </div>
                    <Sparkline points={points} invert={invert} />
                  </div>
                ))}
                <p className={styles.tiny}>
                  Green means moving the way you want it to, amber means the opposite. Judge trends over weeks, never
                  over single days.
                </p>
              </div>

              <div className={styles.panel}>
                <h3 className={styles.sectionTitle} style={{ fontSize: 15 }}>
                  All time
                </h3>
                <div className={`${styles.grid} ${styles.grid4}`}>
                  <Stat label="Days logged" value={summary.totals.days} />
                  <Stat label="Sessions" value={summary.totals.sessions} />
                  <Stat label="Minutes" value={summary.totals.minutes} />
                  <Stat label="Calories" value={summary.totals.calories} unit="kcal" />
                </div>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
